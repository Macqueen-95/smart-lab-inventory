"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Upload, Search, MapPin } from "lucide-react"

interface FloorMapData {
    id: string
    title?: string
    description?: string
    image: string
    rooms: any[]
    createdAt: string
}

export default function MapListingPage() {
    const [maps, setMaps] = useState<FloorMapData[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Load all floor maps from localStorage
        const storedMaps = localStorage.getItem("floorMaps")
        if (storedMaps) {
            try {
                const parsed = JSON.parse(storedMaps)
                setMaps(parsed)
            } catch (e) {
                console.error("Failed to parse floor maps", e)
            }
        }
        setIsLoading(false)
    }, [])

    const filteredMaps = maps.filter((map) => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return (
            map.title?.toLowerCase().includes(query) ||
            map.description?.toLowerCase().includes(query) ||
            map.id.toLowerCase().includes(query)
        )
    })

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Floor Maps</h2>
                    <p className="text-zinc-500">Manage and view all your floor plans.</p>
                </div>
                <Link href="/map/upload">
                    <Button>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New Map
                    </Button>
                </Link>
            </div>

            {/* Search Bar */}
            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        className="pl-9"
                        placeholder="Search maps by title, description, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Maps Grid */}
            {isLoading ? (
                <div className="text-center py-12 text-zinc-500">Loading maps...</div>
            ) : filteredMaps.length === 0 ? (
                <Card className="flex-1 flex items-center justify-center">
                    <CardContent className="text-center space-y-4 py-12">
                        <MapPin className="h-12 w-12 text-zinc-400 mx-auto" />
                        <div>
                            <CardTitle className="mb-2">No Floor Maps Found</CardTitle>
                            <CardDescription className="mb-4">
                                {searchQuery
                                    ? "No maps match your search. Try a different query."
                                    : "Get started by uploading your first floor map."}
                            </CardDescription>
                            <Link href="/map/upload">
                                <Button>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Floor Map
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredMaps.map((map) => (
                        <Link key={map.id} href={`/map/${map.id}`}>
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                                <div className="relative w-full h-48 bg-zinc-100 rounded-t-lg overflow-hidden">
                                    <img
                                        src={map.image}
                                        alt={map.title || "Floor Map"}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-1">
                                        {map.title || `Floor Map ${map.id.split("-").pop()}`}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {map.description || "No description provided"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm text-zinc-500">
                                        <span>{map.rooms?.length || 0} rooms</span>
                                        <span>
                                            {new Date(map.createdAt).toLocaleDateString()}
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
