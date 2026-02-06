"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Search, Package, MapPin, X, Wifi, Wrench, Hand, Clock, Building2 } from "lucide-react"
import { itemsAPI, confidenceAPI, type InventoryItem, type ConfidenceScore } from "@/lib/api"

type ItemWithConfidence = InventoryItem & {
    confidence?: ConfidenceScore
}

export default function InventoryPage() {
    const [allItems, setAllItems] = useState<ItemWithConfidence[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "available" | "service" | "borrowed">("all")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
    const [itemConfidence, setItemConfidence] = useState<Record<string, ConfidenceScore>>({})

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                setIsLoading(true)
                const res = await itemsAPI.listAllWithStatus()
                if (!cancelled && res.success && res.items) {
                    console.log("Loaded items:", res.items.length, "items")
                    setAllItems(res.items)
                } else {
                    if (!cancelled) setError("Failed to load inventory")
                }
            } catch (e) {
                console.error("Error loading inventory:", e)
                if (!cancelled) setError("Failed to load inventory: " + (e instanceof Error ? e.message : String(e)))
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

    // Load confidence scores for items with RFID
    useEffect(() => {
        const loadConfidence = async () => {
            const rfidItems = allItems.filter(item => item.rfid_uid)
            if (rfidItems.length === 0) return

            try {
                const rfidUids = rfidItems.map(item => item.rfid_uid!).filter(Boolean)
                const res = await confidenceAPI.getItemsConfidenceBatch({ rfid_uids: rfidUids })
                if (res.success && res.confidence_scores) {
                    setItemConfidence(res.confidence_scores)
                }
            } catch (e) {
                console.error("Failed to load confidence scores:", e)
            }
        }
        loadConfidence()
    }, [allItems])

    const filteredItems = allItems.filter((item) => {
        // Status filter - handle boolean values
        const isOutForService = item.is_out_for_service === true
        const isBorrowed = item.is_borrowed === true
        
        if (statusFilter === "service" && !isOutForService) return false
        if (statusFilter === "borrowed" && !isBorrowed) return false
        if (statusFilter === "available" && (isOutForService || isBorrowed)) return false

        // Search filter
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
            item.item_name.toLowerCase().includes(q) ||
            (item.rfid_uid?.toLowerCase().includes(q)) ||
            (item.room_name?.toLowerCase().includes(q)) ||
            (item.floor_title?.toLowerCase().includes(q))
        )
    })

    const getConfidenceBadge = (item: InventoryItem) => {
        if (!item.rfid_uid) return null
        const confidence = itemConfidence[item.rfid_uid]
        if (!confidence) return null
        const score = confidence.confidence
        const pct = (score * 100).toFixed(0)
        const getBadgeClass = () => {
            if (score >= 0.7) return "bg-green-100 text-green-800 border-green-300"
            if (score >= 0.4) return "bg-blue-100 text-blue-800 border-blue-300"
            if (score >= 0.1) return "bg-yellow-100 text-yellow-800 border-yellow-300"
            return "bg-red-100 text-red-800 border-red-300"
        }
        return (
            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${getBadgeClass()}`}>
                Confidence: {pct}%
            </span>
        )
    }

    const formatTimestamp = (dateString: string | null | undefined) => {
        if (!dateString) return "Never"
        const date = new Date(dateString)
        return date.toLocaleString()
    }

    const getTimeAgo = (dateString: string | null | undefined) => {
        if (!dateString) return null
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 60) return `${diffMins} min ago`
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    }

    const stats = {
        total: allItems.length,
        available: allItems.filter(i => !i.is_out_for_service && !i.is_borrowed).length,
        service: allItems.filter(i => i.is_out_for_service === true).length,
        borrowed: allItems.filter(i => i.is_borrowed === true).length,
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
                    <p className="text-zinc-500">Complete inventory overview with status tracking.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-zinc-500">Total Items</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                        <p className="text-xs text-zinc-500">Available</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-600">{stats.service}</div>
                        <p className="text-xs text-zinc-500">Out for Service</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">{stats.borrowed}</div>
                        <p className="text-xs text-zinc-500">Borrowed</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2 gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        className="pl-9"
                        placeholder="Search by name, RFID, room, or floor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={statusFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("all")}
                    >
                        All
                    </Button>
                    <Button
                        variant={statusFilter === "available" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("available")}
                    >
                        Available
                    </Button>
                    <Button
                        variant={statusFilter === "service" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("service")}
                    >
                        Service
                    </Button>
                    <Button
                        variant={statusFilter === "borrowed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter("borrowed")}
                    >
                        Borrowed
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            {isLoading ? (
                <div className="text-center py-12 text-zinc-500">Loading inventory...</div>
            ) : filteredItems.length === 0 ? (
                <Card className="flex-1 flex items-center justify-center">
                    <CardContent className="text-center space-y-4 py-12">
                        <Package className="h-12 w-12 text-zinc-400 mx-auto" />
                        <div>
                            <CardTitle className="mb-2">No Items Found</CardTitle>
                            <CardDescription>
                                {searchQuery || statusFilter !== "all"
                                    ? "No items match your filters."
                                    : "No items in inventory yet."}
                            </CardDescription>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item) => (
                        <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                                {/* Status badges overlay */}
                                <div className="absolute top-2 right-2 flex gap-1">
                                    {item.is_out_for_service && (
                                        <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                                            <Wrench className="h-3 w-3 mr-1" />
                                            Service
                                        </Badge>
                                    )}
                                    {item.is_borrowed && (
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                                            <Hand className="h-3 w-3 mr-1" />
                                            Borrowed
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="line-clamp-1 text-base flex-1">{item.item_name}</CardTitle>
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
                                {/* Location Info */}
                                <div className="flex items-start gap-2 text-xs text-zinc-600">
                                    <Building2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        {item.floor_title && (
                                            <div className="truncate">{item.floor_title}</div>
                                        )}
                                        {item.room_name && (
                                            <div className="truncate">→ {item.room_name}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Quantity */}
                                {(item.item_count != null && item.item_count !== undefined) && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-600">Quantity:</span>
                                        <span className="font-bold">{item.item_count}</span>
                                    </div>
                                )}

                                {/* Last Scanned */}
                                {item.rfid_uid && (
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-100 pt-2">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {item.last_scanned_at ? (
                                                <>Last scan: {getTimeAgo(item.last_scanned_at)}</>
                                            ) : (
                                                "No scans recorded"
                                            )}
                                        </span>
                                    </div>
                                )}

                                {/* Service Status */}
                                {item.is_out_for_service && item.service_out_date && (
                                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                                        <div className="font-medium">Out for Service</div>
                                        <div className="text-orange-700">Since: {formatTimestamp(item.service_out_date)}</div>
                                    </div>
                                )}

                                {/* Borrowed Status */}
                                {item.is_borrowed && item.borrowed_out_date && (
                                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                                        <div className="font-medium">Borrowed</div>
                                        {item.borrowed_to_user && (
                                            <div className="text-blue-700">To: {item.borrowed_to_user}</div>
                                        )}
                                        <div className="text-blue-700">Since: {formatTimestamp(item.borrowed_out_date)}</div>
                                    </div>
                                )}

                                {/* Created At */}
                                <div className="text-xs text-zinc-400 pt-1 border-t border-zinc-100">
                                    Created: {formatTimestamp(item.created_at)}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
