"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Package, ArrowLeft, Edit } from "lucide-react"

interface Point {
    x: number
    y: number
}

interface RoomRegion {
    id: string
    name: string
    points: Point[]
    components: string[]
    color: string
    items?: Array<{ id: string; name: string; type: string; count: number }>
}

interface FloorMapData {
    id: string
    title?: string
    description?: string
    image: string
    rooms: RoomRegion[]
    createdAt: string
}

export default function IndividualMapPage() {
    const params = useParams()
    const router = useRouter()
    const [floorMapData, setFloorMapData] = useState<FloorMapData | null>(null)
    const [selectedRoom, setSelectedRoom] = useState<RoomRegion | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [hoveredRoom, setHoveredRoom] = useState<RoomRegion | null>(null)

    useEffect(() => {
        // Load floor map from localStorage
        const storedMaps = localStorage.getItem("floorMaps")
        if (storedMaps) {
            try {
                const parsed = JSON.parse(storedMaps)
                const map = parsed.find((m: FloorMapData) => m.id === params.id)
                if (map) {
                    setFloorMapData(map)
                }
            } catch (e) {
                console.error("Failed to parse floor map data", e)
            }
        }
    }, [params.id])

    const rooms = floorMapData?.rooms || []
    const floorMapImage = floorMapData?.image

    if (!floorMapData) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-zinc-500 mb-4">Floor map not found</p>
                <Link href="/map">
                    <Button variant="outline">Back to Maps</Button>
                </Link>
            </div>
        )
    }

    const handleRoomClick = (room: RoomRegion) => {
        setSelectedRoom(room)
        setIsSheetOpen(true)
    }

    // Check if point is inside polygon (for click detection)
    const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
        let inside = false
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x
            const yi = polygon[i].y
            const xj = polygon[j].x
            const yj = polygon[j].y

            const intersect =
                yi > point.y !== yj > point.y &&
                point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
            if (intersect) inside = !inside
        }
        return inside
    }

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const container = e.currentTarget
        const rect = container.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        // Check which room was clicked
        for (const room of rooms) {
            if (isPointInPolygon({ x, y }, room.points)) {
                handleRoomClick(room)
                break
            }
        }
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/map">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {floorMapData.title || "Floor Map"}
                        </h2>
                        {floorMapData.description && (
                            <p className="text-zinc-500">{floorMapData.description}</p>
                        )}
                    </div>
                </div>
            </div>

            <div
                className="relative w-full flex-1 min-h-0 border rounded-xl overflow-hidden bg-zinc-100 shadow-inner cursor-pointer"
                onClick={handleMapClick}
            >
                <img
                    src={floorMapImage}
                    alt={floorMapData.title || "Floor Plan"}
                    className="w-full h-full object-contain p-4"
                />

                {/* Interactive Zones - Transparent with hover-only name */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ zIndex: 10 }}
                >
                    {rooms.map((room) => (
                        <g key={room.id}>
                            <polygon
                                points={room.points
                                    .map((p) => `${p.x},${p.y}`)
                                    .join(" ")}
                                fill="transparent"
                                stroke="transparent"
                                strokeWidth="0"
                                className="pointer-events-auto cursor-pointer"
                                onClick={() => handleRoomClick(room)}
                                onMouseEnter={() => setHoveredRoom(room)}
                                onMouseLeave={() => setHoveredRoom(null)}
                            />
                            {/* Show name only on hover */}
                            {hoveredRoom?.id === room.id && room.points.length > 0 && (
                                <text
                                    x={room.points.reduce((sum, p) => sum + p.x, 0) / room.points.length}
                                    y={room.points.reduce((sum, p) => sum + p.y, 0) / room.points.length}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="pointer-events-none fill-black font-bold"
                                    style={{ fontSize: "1.4", textShadow: "0 0 4px white, 0 0 4px white" }}
                                >
                                    {room.name}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>

                {/* Clickable overlay divs for better interaction */}
                {rooms.map((room) => {
                    // Calculate bounding box for the room
                    const minX = Math.min(...room.points.map((p) => p.x))
                    const maxX = Math.max(...room.points.map((p) => p.x))
                    const minY = Math.min(...room.points.map((p) => p.y))
                    const maxY = Math.max(...room.points.map((p) => p.y))

                    return (
                        <div
                            key={`overlay-${room.id}`}
                            onClick={() => handleRoomClick(room)}
                            onMouseEnter={() => setHoveredRoom(room)}
                            onMouseLeave={() => setHoveredRoom(null)}
                            style={{
                                left: `${minX}%`,
                                top: `${minY}%`,
                                width: `${maxX - minX}%`,
                                height: `${maxY - minY}%`,
                            }}
                            className="absolute cursor-pointer pointer-events-auto"
                        />
                    )
                })}
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto bg-white">
                    {selectedRoom && (
                        <>
                            <SheetHeader className="mb-6">
                                <SheetTitle className="text-2xl text-black">{selectedRoom.name}</SheetTitle>
                                <SheetDescription className="text-zinc-600">
                                    Full inventory list for this location.
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-zinc-100 border border-zinc-300">
                                        <span className="text-zinc-600 text-sm">Total Items</span>
                                        <div className="text-2xl font-bold text-black">
                                            {selectedRoom.items?.reduce((acc, i) => acc + i.count, 0) || 0}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-green-100 border border-green-300">
                                        <span className="text-green-700 text-sm">Status</span>
                                        <div className="text-lg font-bold text-green-800">Audited</div>
                                    </div>
                                </div>

                                {selectedRoom.components && selectedRoom.components.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-medium mb-2 text-black">Components</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRoom.components.map((comp, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 bg-zinc-100 border border-zinc-300 rounded text-xs text-black"
                                                >
                                                    {comp}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <h3 className="text-lg font-semibold mt-8 mb-4 text-black">Inventory Items</h3>
                                {selectedRoom.items && selectedRoom.items.length > 0 ? (
                                    <div className="grid gap-3">
                                        {selectedRoom.items.map((item) => (
                                            <Card key={item.id} className="flex flex-row items-center p-4 bg-white border border-zinc-300">
                                                <div className="h-10 w-10 bg-zinc-100 rounded-full flex items-center justify-center mr-4">
                                                    <Package className="h-5 w-5 text-zinc-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-black">{item.name}</div>
                                                    <div className="text-xs text-zinc-600">{item.type} • ID: {item.id}</div>
                                                </div>
                                                <div className="text-lg font-bold text-black">
                                                    {item.count}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-zinc-600 py-4">
                                        No items registered yet. Use the Admin page to add items to this room.
                                    </div>
                                )}

                                {selectedRoom.items && selectedRoom.items.length > 0 && (
                                    <div className="mt-8 pt-8 border-t border-zinc-300">
                                        <h4 className="font-medium mb-3 text-black">Recent Scans</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600">10:42 AM</span>
                                                <span className="text-black">{selectedRoom.items[0]?.name} detected</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600">09:15 AM</span>
                                                <span className="text-black">Audit Completed</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
