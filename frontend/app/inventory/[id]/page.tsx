"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Search, ArrowLeft, Package, Image as ImageIcon } from "lucide-react"
import { getRoomById, Room, InventoryItem } from "@/lib/inventory-data"

export default function RoomInventoryPage() {
    const params = useParams()
    const router = useRouter()
    const [room, setRoom] = useState<Room | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const roomId = params.id as string
        const loadedRoom = getRoomById(roomId)
        setRoom(loadedRoom)
        setIsLoading(false)
    }, [params.id])

    if (isLoading) {
        return <div className="text-center py-12 text-zinc-500">Loading...</div>
    }

    if (!room) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-zinc-500 mb-4">Room not found</p>
                <Link href="/inventory">
                    <Button variant="outline">Back to Inventory</Button>
                </Link>
            </div>
        )
    }

    const filteredItems = room.items.filter((item) => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return (
            item.name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query) ||
            item.id.toLowerCase().includes(query)
        )
    })

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/inventory">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold tracking-tight">{room.title}</h2>
                    <p className="text-zinc-500">{room.location}</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        className="pl-9"
                        placeholder="Search items by name, description, or type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
                <Card className="flex-1 flex items-center justify-center">
                    <CardContent className="text-center space-y-4 py-12">
                        <Package className="h-12 w-12 text-zinc-400 mx-auto" />
                        <div>
                            <CardTitle className="mb-2">No Items Found</CardTitle>
                            <CardDescription>
                                {searchQuery
                                    ? "No items match your search."
                                    : "This room has no items yet."}
                            </CardDescription>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item) => (
                        <Card key={item.id} className="hover:shadow-lg transition-shadow">
                            <div className="relative w-full h-48 bg-zinc-100 rounded-t-lg overflow-hidden">
                                {item.imageUrl ? (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="w-full h-full object-contain p-4"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300">
                                        <ImageIcon className="h-16 w-16 text-zinc-400" />
                                    </div>
                                )}
                            </div>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle className="line-clamp-1 flex-1">{item.name}</CardTitle>
                                    <Badge
                                        variant={
                                            item.status === "Active"
                                                ? "success"
                                                : item.status === "Maintenance"
                                                ? "warning"
                                                : "destructive"
                                        }
                                        className="ml-2"
                                    >
                                        {item.status}
                                    </Badge>
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {item.description || "No description"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-600">Quantity:</span>
                                        <span className="font-bold text-lg">{item.quantity}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-600">Type:</span>
                                        <span className="text-zinc-900">{item.type}</span>
                                    </div>
                                    {item.lastScan && (
                                        <div className="flex items-center justify-between text-xs text-zinc-500">
                                            <span>Last Scan:</span>
                                            <span>{item.lastScan}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
