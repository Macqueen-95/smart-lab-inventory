"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Package, ArrowLeft, MapPin } from "lucide-react"
import { floorPlansAPI, itemsAPI, type FloorPlan, type Room, type InventoryItem } from "@/lib/api"

export default function IndividualMapPage() {
    const params = useParams()
    const planId = Number(params.id)
    const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
    const [rooms, setRooms] = useState<Room[]>([])
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
    const [roomItems, setRoomItems] = useState<InventoryItem[]>([])
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        async function load() {
            if (!planId || Number.isNaN(planId)) {
                setError("Invalid map id")
                setIsLoading(false)
                return
            }
            try {
                const [planRes, roomsRes] = await Promise.all([
                    floorPlansAPI.get(planId),
                    floorPlansAPI.listRooms(planId),
                ])
                if (cancelled) return
                if (planRes.success && planRes.floor_plan) setFloorPlan(planRes.floor_plan)
                else setError("Floor plan not found")
                if (roomsRes.success && roomsRes.rooms) setRooms(roomsRes.rooms)
            } catch (e) {
                if (!cancelled) setError("Failed to load floor plan")
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [planId])

    const handleRoomClick = async (room: Room) => {
        setSelectedRoom(room)
        setIsSheetOpen(true)
        try {
            const res = await itemsAPI.listByRoom(room.id)
            if (res.success && res.items) setRoomItems(res.items)
            else setRoomItems([])
        } catch {
            setRoomItems([])
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
        )
    }

    if (error || !floorPlan) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-zinc-500 mb-4">{error || "Floor map not found"}</p>
                <Link href="/map">
                    <Button variant="outline">Back to Maps</Button>
                </Link>
            </div>
        )
    }

    const floorImageUrl = floorPlan.floor_url

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
                        <h2 className="text-2xl font-bold tracking-tight">{floorPlan.floor_title}</h2>
                        {floorPlan.floor_description && (
                            <p className="text-zinc-500">{floorPlan.floor_description}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-4 flex-1 min-h-0">
                <div className="relative flex-1 min-h-0 border rounded-xl overflow-hidden bg-zinc-100 shadow-inner">
                    {floorImageUrl ? (
                        <img
                            src={floorImageUrl}
                            alt={floorPlan.floor_title}
                            className="w-full h-full object-contain p-4"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-16 w-16 text-zinc-400" />
                        </div>
                    )}
                </div>

                <div className="w-72 flex-shrink-0 space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-700">Rooms</h3>
                    {rooms.length === 0 ? (
                        <p className="text-sm text-zinc-500">No rooms defined.</p>
                    ) : (
                        <div className="space-y-1">
                            {rooms.map((room) => (
                                <Button
                                    key={room.id}
                                    variant={selectedRoom?.id === room.id ? "default" : "outline"}
                                    className="w-full justify-start"
                                    onClick={() => handleRoomClick(room)}
                                >
                                    {room.room_name}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto bg-white">
                    {selectedRoom && (
                        <>
                            <SheetHeader className="mb-6">
                                <SheetTitle className="text-2xl text-black">{selectedRoom.room_name}</SheetTitle>
                                <SheetDescription className="text-zinc-600">
                                    {selectedRoom.room_description || "Inventory for this room."}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-zinc-100 border border-zinc-300">
                                        <span className="text-zinc-600 text-sm">Total Items</span>
                                        <div className="text-2xl font-bold text-black">
                                            {roomItems.length}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold mt-4 mb-2 text-black">Inventory Items</h3>
                                {roomItems.length > 0 ? (
                                    <div className="grid gap-3">
                                        {roomItems.map((item) => (
                                            <Card key={item.id} className="flex flex-row items-center p-4 bg-white border border-zinc-300">
                                                <div className="h-10 w-10 bg-zinc-100 rounded-lg flex items-center justify-center mr-4 overflow-hidden flex-shrink-0">
                                                    {item.item_icon_url ? (
                                                        <img src={item.item_icon_url} alt="" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-zinc-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-black">{item.item_name}</div>
                                                    <div className="text-xs text-zinc-600">
                                                        {item.rfid_uid ? `RFID: ${item.rfid_uid}` : `ID: ${item.id}`}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-zinc-600 py-4">
                                        No items in this room. Add items from Admin → Manage Items.
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
