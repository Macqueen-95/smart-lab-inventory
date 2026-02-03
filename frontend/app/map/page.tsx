"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Upload, Search, MapPin } from "lucide-react"
import { floorPlansAPI, type FloorPlan } from "@/lib/api"

export default function MapListingPage() {
    const [maps, setMaps] = useState<FloorPlan[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const res = await floorPlansAPI.list()
                if (!cancelled && res.success && res.floor_plans) {
                    setMaps(res.floor_plans)
                }
            } catch (e) {
                if (!cancelled) setError("Failed to load floor plans")
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

    const filteredMaps = maps.filter((map) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
            map.floor_title?.toLowerCase().includes(q) ||
            (map.floor_description || "").toLowerCase().includes(q) ||
            String(map.id).includes(q)
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

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        className="pl-9"
                        placeholder="Search maps by title or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

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
                                    {map.floor_url ? (
                                        <img
                                            src={map.floor_url}
                                            alt={map.floor_title}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <MapPin className="h-12 w-12 text-zinc-400" />
                                        </div>
                                    )}
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-1">{map.floor_title}</CardTitle>
                                    <CardDescription className="line-clamp-2">
                                        {map.floor_description || "No description"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm text-zinc-500">
                                        <span>View details</span>
                                        <span>{new Date(map.created_at).toLocaleDateString()}</span>
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
