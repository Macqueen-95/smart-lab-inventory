"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Search, Package, MapPin, X, Wifi } from "lucide-react"
import { roomsAPI, itemsAPI, type Room, type InventoryItem } from "@/lib/api"

type RoomWithCount = Room & { itemCount: number; itemTypes: number }

export default function InventoryPage() {
    const [rooms, setRooms] = useState<RoomWithCount[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
    const [modalItems, setModalItems] = useState<InventoryItem[]>([])
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
        try {
            const res = await itemsAPI.listByRoom(roomId)
            if (res.success && res.items) {
                setModalItems(res.items)
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

            {/* Room Details Modal */}
            {selectedRoomId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <CardHeader className="sticky top-0 bg-white border-b flex items-center justify-between">
                            <div className="flex-1">
                                <CardTitle>
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
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {modalLoading ? (
                                <p className="text-center text-zinc-500">Loading items...</p>
                            ) : modalItems.length === 0 ? (
                                <p className="text-center text-zinc-500">No items in this room</p>
                            ) : (
                                <div className="space-y-2">
                                    {modalItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-zinc-50 transition-colors"
                                        >
                                            {/* Item Icon */}
                                            <div className="w-12 h-12 rounded bg-zinc-100 flex items-center justify-center flex-shrink-0">
                                                {item.item_icon_url ? (
                                                    <img
                                                        src={item.item_icon_url}
                                                        alt=""
                                                        className="w-full h-full object-contain p-1"
                                                    />
                                                ) : (
                                                    <Package className="h-6 w-6 text-zinc-400" />
                                                )}
                                            </div>
                                            
                                            {/* Item Details */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-black truncate">{item.item_name}</h4>
                                                {item.rfid_uid ? (
                                                    <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                                        <Wifi className="h-3 w-3" />
                                                        <code className="font-mono">{item.rfid_uid}</code>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-zinc-500 mt-0.5">No RFID assigned</p>
                                                )}
                                            </div>
                                            
                                            {/* Last Scanned */}
                                            <div className="text-right flex-shrink-0">
                                                {item.last_scanned_at ? (
                                                    <>
                                                        <p className="text-xs text-zinc-500">Last scanned</p>
                                                        <p className="text-xs font-medium text-black">
                                                            {new Date(item.last_scanned_at).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                        <p className="text-xs text-zinc-400">
                                                            {new Date(item.last_scanned_at).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-zinc-400">Never scanned</p>
                                                )}
                                            </div>
                                        </div>
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
