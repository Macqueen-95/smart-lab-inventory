"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Package, ArrowLeft, MapPin, Trash2, X } from "lucide-react"
import { floorPlansAPI, roomsAPI, itemsAPI, type FloorPlan, type Room, type InventoryItem } from "@/lib/api"

export default function IndividualMapPage() {
    const params = useParams()
    const router = useRouter()
    const planId = Number(params.id)
    const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null)
    const [rooms, setRooms] = useState<Room[]>([])
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
    const [roomItems, setRoomItems] = useState<InventoryItem[]>([])
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deletingFloorPlan, setDeletingFloorPlan] = useState(false)
    const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null)
    const [deleting, setDeleting] = useState(false)

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

    const handleDeleteFloorPlan = async () => {
        if (!planId) return
        setDeleting(true)
        setError(null)
        try {
            const res = await floorPlansAPI.delete(planId)
            if (res.success) {
                router.push("/map")
            } else {
                setError(res.message || "Failed to delete floor plan")
                setDeletingFloorPlan(false)
            }
        } catch (e: any) {
            const errorMsg = e.response?.data?.message || "Failed to delete floor plan"
            setError(errorMsg)
            setDeletingFloorPlan(false)
        } finally {
            setDeleting(false)
        }
    }

    const handleDeleteRoom = async (roomId: number) => {
        setDeleting(true)
        setError(null)
        try {
            const res = await roomsAPI.delete(roomId)
            if (res.success) {
                setRooms((prev) => prev.filter((r) => r.id !== roomId))
                setDeletingRoomId(null)
                if (selectedRoom?.id === roomId) {
                    setIsSheetOpen(false)
                    setSelectedRoom(null)
                }
            } else {
                setError(res.message || "Failed to delete room")
                setDeletingRoomId(null)
            }
        } catch (e: any) {
            const errorMsg = e.response?.data?.message || "Failed to delete room"
            setError(errorMsg)
            setDeletingRoomId(null)
        } finally {
            setDeleting(false)
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
                <Button
                    variant="outline"
                    onClick={() => setDeletingFloorPlan(true)}
                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Floor Plan
                </Button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            {deletingFloorPlan && (
                <Card className="border-red-500 bg-red-50">
                    <CardContent className="pt-6 space-y-4">
                        <p className="text-sm text-zinc-700 font-semibold">
                            Are you sure you want to delete this floor plan?
                        </p>
                        <p className="text-sm text-zinc-600">
                            Note: You must delete all rooms first before you can delete this floor plan.
                        </p>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleDeleteFloorPlan}
                                disabled={deleting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {deleting ? "Deleting..." : "Delete Floor Plan"}
                            </Button>
                            <Button variant="outline" onClick={() => setDeletingFloorPlan(false)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {deletingRoomId && (
                <Card className="border-red-500 bg-red-50">
                    <CardContent className="pt-6 space-y-4">
                        <p className="text-sm text-zinc-700 font-semibold">
                            Are you sure you want to delete this room?
                        </p>
                        <p className="text-sm text-zinc-600">
                            Note: You must delete all items in this room first before you can delete it.
                        </p>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleDeleteRoom(deletingRoomId)}
                                disabled={deleting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {deleting ? "Deleting..." : "Delete Room"}
                            </Button>
                            <Button variant="outline" onClick={() => setDeletingRoomId(null)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

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
                                <div key={room.id} className="flex items-center gap-1">
                                    <Button
                                        variant={selectedRoom?.id === room.id ? "default" : "outline"}
                                        className="flex-1 justify-start"
                                        onClick={() => handleRoomClick(room)}
                                    >
                                        {room.room_name}
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setDeletingRoomId(room.id)}
                                        className="text-red-600 hover:text-red-700 flex-shrink-0"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
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
