"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Search, ArrowLeft, Package } from "lucide-react"
import { roomsAPI, itemsAPI, type Room, type InventoryItem } from "@/lib/api"

export default function RoomInventoryPage() {
    const params = useParams()
    const roomId = Number(params.id)
    const [room, setRoom] = useState<Room | null>(null)
    const [items, setItems] = useState<InventoryItem[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!roomId || Number.isNaN(roomId)) {
            setRoom(null)
            setIsLoading(false)
            return
        }
        let cancelled = false
        async function load() {
            try {
                const [roomsRes, itemsRes] = await Promise.all([
                    roomsAPI.list(),
                    itemsAPI.listByRoom(roomId),
                ])
                if (cancelled) return
                const r = roomsRes.success && roomsRes.rooms ? roomsRes.rooms.find((x) => x.id === roomId) : null
                setRoom(r || null)
                setItems(itemsRes.success && itemsRes.items ? itemsRes.items : [])
            } catch (e) {
                if (!cancelled) setError("Failed to load room")
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [roomId])

    const filteredItems = items.filter((item) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return item.item_name.toLowerCase().includes(q)
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
        )
    }

    if (error || !room) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-zinc-500 mb-4">{error || "Room not found"}</p>
                <Link href="/inventory">
                    <Button variant="outline">Back to Inventory</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/inventory">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold tracking-tight">{room.room_name}</h2>
                    {room.room_description && <p className="text-zinc-500">{room.room_description}</p>}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        className="pl-9"
                        placeholder="Search items by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <Card className="flex-1 flex items-center justify-center">
                    <CardContent className="text-center space-y-4 py-12">
                        <Package className="h-12 w-12 text-zinc-400 mx-auto" />
                        <div>
                            <CardTitle className="mb-2">No Items Found</CardTitle>
                            <CardDescription>
                                {searchQuery ? "No items match your search." : "This room has no items yet."}
                            </CardDescription>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item) => (
                        <Card key={item.id} className="hover:shadow-lg transition-shadow">
                            <div className="relative w-full h-48 bg-zinc-100 rounded-t-lg overflow-hidden flex items-center justify-center">
                                {item.item_icon_url ? (
                                    <img
                                        src={item.item_icon_url}
                                        alt=""
                                        className="w-full h-full object-contain p-4"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300">
                                        <Package className="h-16 w-16 text-zinc-400" />
                                    </div>
                                )}
                            </div>
                            <CardHeader>
                                <CardTitle className="line-clamp-1">{item.item_name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-600">Quantity:</span>
                                        <span className="font-bold text-lg">{item.item_count}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
