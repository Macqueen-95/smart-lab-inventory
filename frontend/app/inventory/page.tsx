"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Search, Package, MapPin, X, Wifi, CheckCircle2, AlertCircle, HelpCircle, XCircle } from "lucide-react"
import { roomsAPI, itemsAPI, confidenceAPI, type Room, type InventoryItem, type ConfidenceScore } from "@/lib/api"

type RoomWithCount = Room & { itemCount: number; itemTypes: number }

export default function InventoryPage() {
    const [rooms, setRooms] = useState<RoomWithCount[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
    const [modalItems, setModalItems] = useState<InventoryItem[]>([])
    const [modalConfidence, setModalConfidence] = useState<Record<string, ConfidenceScore>>({})
    const [modalLoading, setModalLoading] = useState(false)

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const res = await roomsAPI.list()
                if (!res.success || !res.rooms?.length) {
                    if (!cancelled) setRooms([])
                    setIsLoading(false)
                    return
                }
                const withCounts = await Promise.all(
                    res.rooms.map(async (room) => {
                        const itemsRes = await itemsAPI.listByRoom(room.id)
                        const items = itemsRes.success && itemsRes.items ? itemsRes.items : []
                        // For per-unit items, each item is individual (no item_count)
                        const itemCount = items.length
                        // Count items with RFIDs
                        const itemTypes = items.filter(i => i.rfid_uid).length
                        return { ...room, itemCount, itemTypes }
                    })
                )
                if (!cancelled) setRooms(withCounts)
            } catch (e) {
                if (!cancelled) setError("Failed to load rooms")
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

    const handleRoomClick = async (roomId: number) => {
        setSelectedRoomId(roomId)
        setModalLoading(true)
        setModalConfidence({})
        try {
            const [itemsRes, confidenceRes] = await Promise.all([
                itemsAPI.listByRoom(roomId),
                confidenceAPI.getRoomItemsConfidence(roomId).catch(() => ({ success: false, confidence_scores: {} })),
            ])
            if (itemsRes.success && itemsRes.items) {
                setModalItems(itemsRes.items)
            }
            if (confidenceRes.success && confidenceRes.confidence_scores) {
                setModalConfidence(confidenceRes.confidence_scores)
            }
        } catch (e) {
            console.error("Failed to load items:", e)
        } finally {
            setModalLoading(false)
        }
    }

    const filteredRooms = rooms.filter((room) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
            room.room_name.toLowerCase().includes(q) ||
            (room.room_description || "").toLowerCase().includes(q)
        )
    })

    const getConfidenceBadge = (item: InventoryItem) => {
        if (!item.rfid_uid) return null
        const confidence = modalConfidence[item.rfid_uid]
        if (!confidence) return null
        const { confidence: score, status } = confidence
        const getBadgeClass = () => {
            if (score >= 0.7) return "bg-green-100 text-green-800 border-green-300"
            if (score >= 0.4) return "bg-blue-100 text-blue-800 border-blue-300"
            if (score >= 0.1) return "bg-yellow-100 text-yellow-800 border-yellow-300"
            return "bg-red-100 text-red-800 border-red-300"
        }
        const getIcon = () => {
            if (score >= 0.7) return <CheckCircle2 className="h-3 w-3" />
            if (score >= 0.4) return <AlertCircle className="h-3 w-3" />
            if (score >= 0.1) return <HelpCircle className="h-3 w-3" />
            return <XCircle className="h-3 w-3" />
        }
        return (
            <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${getBadgeClass()}`}>
                {getIcon()}
                <span>{status}</span>
                <span className="opacity-80">({(score * 100).toFixed(0)}%)</span>
            </span>
        )
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
                    <p className="text-zinc-500">Browse inventory by room.</p>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        className="pl-9"
                        placeholder="Search rooms by name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            {isLoading ? (
                <div className="text-center py-12 text-zinc-500">Loading rooms...</div>
            ) : filteredRooms.length === 0 ? (
                <Card className="flex-1 flex items-center justify-center">
                    <CardContent className="text-center space-y-4 py-12">
                        <MapPin className="h-12 w-12 text-zinc-400 mx-auto" />
                        <div>
                            <CardTitle className="mb-2">No Rooms Found</CardTitle>
                            <CardDescription className="mb-4">
                                {searchQuery
                                    ? "No rooms match your search."
                                    : "Create a floor plan and add rooms from the Map upload flow."}
                            </CardDescription>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRooms.map((room) => (
                        <button
                            key={room.id}
                            onClick={() => handleRoomClick(room.id)}
                            className="text-left"
                        >
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                                <div className="relative w-full h-48 bg-zinc-100 rounded-t-lg overflow-hidden flex items-center justify-center">
                                    <MapPin className="h-16 w-16 text-zinc-400" />
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-1">{room.room_name}</CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {room.room_description || "No description"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-zinc-600">
                                            <Package className="h-4 w-4" />
                                            <span>{room.itemCount} items</span>
                                        </div>
                                        <span className="text-zinc-500">{room.itemTypes} with RFID</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </button>
                    ))}
                </div>
            )}

            {/* Room Details Modal - card design like manage-items */}
            {selectedRoomId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                        <CardHeader className="flex-shrink-0 bg-white border-b flex flex-row items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-xl">
                                    {rooms.find(r => r.id === selectedRoomId)?.room_name}
                                </CardTitle>
                                <CardDescription>
                                    {rooms.find(r => r.id === selectedRoomId)?.room_description || "No description"}
                                </CardDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedRoomId(null)}
                                className="flex-shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-6 overflow-y-auto flex-1">
                            {modalLoading ? (
                                <p className="text-center text-zinc-500 py-12">Loading items...</p>
                            ) : modalItems.length === 0 ? (
                                <p className="text-center text-zinc-500 py-12">No items in this room</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {modalItems.map((item) => (
                                        <Card key={item.id} className="overflow-hidden">
                                            <div className="relative w-full h-32 bg-zinc-100 rounded-t-lg overflow-hidden flex items-center justify-center">
                                                {item.item_icon_url ? (
                                                    <img
                                                        src={item.item_icon_url}
                                                        alt=""
                                                        className="w-full h-full object-contain p-2"
                                                    />
                                                ) : (
                                                    <Package className="h-12 w-12 text-zinc-400" />
                                                )}
                                            </div>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <CardTitle className="line-clamp-1 text-base">{item.item_name}</CardTitle>
                                                    {getConfidenceBadge(item)}
                                                </div>
                                                {item.rfid_uid ? (
                                                    <p className="text-xs text-green-600 font-mono mt-1">
                                                        RFID: {item.rfid_uid}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-zinc-500 mt-1">No RFID assigned</p>
                                                )}
                                            </CardHeader>
                                            <CardContent className="space-y-2 pt-0">
                                                {(item.item_count != null && item.item_count !== undefined) && (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-zinc-600">Qty:</span>
                                                        <span className="font-bold">{item.item_count}</span>
                                                    </div>
                                                )}
                                                {item.rfid_uid && modalConfidence[item.rfid_uid] && (
                                                    <div className="text-xs text-zinc-500 border-t border-zinc-100 pt-2">
                                                        {modalConfidence[item.rfid_uid].minutes_since_last_scan != null ? (
                                                            <span>Last scan: {Math.round(modalConfidence[item.rfid_uid].minutes_since_last_scan!)} min ago</span>
                                                        ) : (
                                                            <span>No scans recorded</span>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
