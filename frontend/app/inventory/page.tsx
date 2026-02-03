"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Search, Package, MapPin } from "lucide-react"
import { loadRooms, syncRoomsFromMaps, Room } from "@/lib/inventory-data"
import Image from "next/image"

export default function InventoryPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Sync rooms from maps first
        syncRoomsFromMaps()
        // Load rooms
        const loadedRooms = loadRooms()
        setRooms(loadedRooms)
        setIsLoading(false)
    }, [])

    const filteredRooms = rooms.filter((room) => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return (
            room.name.toLowerCase().includes(query) ||
            room.title.toLowerCase().includes(query) ||
            room.location.toLowerCase().includes(query) ||
            room.description?.toLowerCase().includes(query)
        )
    })

    const getTotalItems = (room: Room) => {
        return room.items.reduce((sum, item) => sum + item.quantity, 0)
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
                    <p className="text-zinc-500">Browse inventory by room.</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        className="pl-9"
                        placeholder="Search rooms by name, location, or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Rooms Grid */}
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
                                    ? "No rooms match your search. Try a different query."
                                    : "Get started by adding your first room from the Admin page."}
                            </CardDescription>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRooms.map((room) => (
                        <Link key={room.id} href={`/inventory/${room.id}`}>
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                                <div className="relative w-full h-48 bg-zinc-100 rounded-t-lg overflow-hidden">
                                    {room.imageUrl ? (
                                        <img
                                            src={room.imageUrl}
                                            alt={room.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300">
                                            <MapPin className="h-16 w-16 text-zinc-400" />
                                        </div>
                                    )}
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-1">{room.title}</CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {room.location}
                                        {room.description && ` • ${room.description}`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-zinc-600">
                                            <Package className="h-4 w-4" />
                                            <span>{getTotalItems(room)} items</span>
                                        </div>
                                        <span className="text-zinc-500">
                                            {room.items.length} types
                                        </span>
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
