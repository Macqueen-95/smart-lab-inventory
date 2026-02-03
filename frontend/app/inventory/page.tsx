"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Search, Package, MapPin } from "lucide-react"
import { roomsAPI, itemsAPI, type Room } from "@/lib/api"

type RoomWithCount = Room & { itemCount: number; itemTypes: number }

export default function InventoryPage() {
    const [rooms, setRooms] = useState<RoomWithCount[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
                        const itemCount = items.reduce((sum, i) => sum + i.item_count, 0)
                        return { ...room, itemCount, itemTypes: items.length }
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
                        <Link key={room.id} href={`/inventory/${room.id}`}>
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
                                        <span className="text-zinc-500">{room.itemTypes} types</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
