"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ArrowLeft, Plus, X, Wifi, CheckCircle2, AlertCircle, Package } from "lucide-react"
import { floorPlansAPI, roomsAPI, itemsAPI, rfidAPI, type FloorPlan, type InventoryItem } from "@/lib/api"

export default function AddRoomPage() {
    const router = useRouter()
    const [step, setStep] = useState<"room-details" | "add-items">("room-details")
    
    // Room details
    const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
    const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<number | null>(null)
    const [roomName, setRoomName] = useState("")
    const [roomDescription, setRoomDescription] = useState("")
    
    // Items with RFID scanning
    const [items, setItems] = useState<any[]>([])
    const [scanningItemIndex, setScanningItemIndex] = useState<number | null>(null)
    const [scannedRfidUid, setScannedRfidUid] = useState("")
    const [itemName, setItemName] = useState("")
    const [itemIcon, setItemIcon] = useState<string | null>(null)
    
    // Loading states
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load floor plans on mount
    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const res = await floorPlansAPI.list()
                if (!cancelled && res.success && res.floor_plans?.length) {
                    setFloorPlans(res.floor_plans)
                    setSelectedFloorPlanId(res.floor_plans[0].id)
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

    // Poll for new RFID scans when in scanning mode
    useEffect(() => {
        if (scanningItemIndex === null || step !== "add-items") return

        const pollForScan = async () => {
            try {
                const result = await rfidAPI.getLatestUnassigned()
                if (result.success && result.rfid_uid && result.rfid_uid !== scannedRfidUid) {
                    setScannedRfidUid(result.rfid_uid)
                }
            } catch (e) {
                // Ignore errors during polling
            }
        }

        const interval = setInterval(pollForScan, 2000)
        pollForScan()
        return () => clearInterval(interval)
    }, [scanningItemIndex, step, scannedRfidUid])

    const handleScanRfid = (index: number) => {
        setScanningItemIndex(index)
        setScannedRfidUid("")
    }

    const handleConfirmRfid = async (index: number) => {
        if (!scannedRfidUid.trim()) {
            setError("Please scan or enter an RFID UID")
            return
        }
        
        const updatedItems = [...items]
        updatedItems[index].rfid_uid = scannedRfidUid
        setItems(updatedItems)
        setScanningItemIndex(null)
        setScannedRfidUid("")
        setItemName("")
    }

    const handleAddItem = () => {
        if (!itemName.trim()) {
            setError("Please enter an item name")
            return
        }
        if (!scannedRfidUid.trim()) {
            setError("Please scan an RFID UID first")
            return
        }

        const newItem: any = {
            name: itemName,
            description: "",
            rfid_uid: scannedRfidUid,
            type: "Equipment",
            status: "Active",
        }

        setItems([...items, newItem])
        setScannedRfidUid("")
        setItemName("")
        setError(null)
    }

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (step === "room-details") {
            if (!selectedFloorPlanId || !roomName.trim()) {
                setError("Please select a floor plan and enter a room name")
                return
            }
            setStep("add-items")
            return
        }

        // Step 2: Create room and items
        if (items.length === 0) {
            setError("Please add at least one item")
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            // Create room
            const roomRes = await roomsAPI.create({
                floor_plan_id: selectedFloorPlanId!,
                room_name: roomName,
                room_description: roomDescription,
            })

            if (!roomRes.success || !roomRes.room) {
                throw new Error("Failed to create room")
            }

            const roomId = roomRes.room.id

            // Create all items with RFID assignment
            for (const item of items) {
                const itemRes = await itemsAPI.create(roomId, {
                    item_name: item.name,
                    item_quantity: 1,
                })

                if (itemRes.success && itemRes.item?.id && item.rfid_uid) {
                    // Assign RFID to item
                    await itemsAPI.assignRfid(itemRes.item.id, item.rfid_uid)
                }
            }

            router.push("/inventory")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create room")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-zinc-500">Loading floor plans...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Add New Room</h2>
                    <p className="text-zinc-500">
                        {step === "room-details"
                            ? "Step 1: Enter room details"
                            : "Step 2: Scan items with RFID"}
                    </p>
                </div>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <p className="text-red-700 text-sm">{error}</p>
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-6">
                {step === "room-details" ? (
                    // Step 1: Room Details
                    <Card>
                        <CardHeader>
                            <CardTitle>Room Details</CardTitle>
                            <CardDescription>Enter information about the room</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="floor-plan" className="text-sm font-medium text-black">
                                    Floor Plan *
                                </label>
                                <select
                                    id="floor-plan"
                                    value={selectedFloorPlanId || ""}
                                    onChange={(e) => setSelectedFloorPlanId(Number(e.target.value))}
                                    className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black"
                                    required
                                >
                                    <option value="">Select a floor plan</option>
                                    {floorPlans.map((fp) => (
                                        <option key={fp.id} value={fp.id}>
                                            {fp.floor_title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="room-name" className="text-sm font-medium text-black">
                                    Room Name *
                                </label>
                                <Input
                                    id="room-name"
                                    placeholder="E.g., Conference Room A"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    required
                                    className="bg-white text-black"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="room-desc" className="text-sm font-medium text-black">
                                    Description
                                </label>
                                <textarea
                                    id="room-desc"
                                    placeholder="Optional room description..."
                                    value={roomDescription}
                                    onChange={(e) => setRoomDescription(e.target.value)}
                                    className="flex min-h-[100px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    // Step 2: RFID-First Item Scanning
                    <>
                        {/* Current RFID Scanning Card */}
                        <Card className="border-blue-200 bg-blue-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wifi className="h-5 w-5 text-blue-600" />
                                    Scan Item RFID
                                </CardTitle>
                                <CardDescription>Position item near RFID scanner or enter UID manually</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-black">RFID UID *</label>
                                    <Input
                                        placeholder="Scanning... or enter manually"
                                        value={scannedRfidUid}
                                        onChange={(e) => setScannedRfidUid(e.target.value)}
                                        className="bg-white text-black text-lg font-mono"
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="item-name" className="text-sm font-medium text-black">
                                        Item Name *
                                    </label>
                                    <Input
                                        id="item-name"
                                        placeholder="E.g., Monitor 1"
                                        value={itemName}
                                        onChange={(e) => setItemName(e.target.value)}
                                        className="bg-white text-black"
                                    />
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Item to Room
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Items Added List */}
                        {items.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        Items Added ({items.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {items.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium text-black">{item.name}</p>
                                                    <p className="text-xs text-zinc-600 font-mono">{item.rfid_uid}</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                                                >
                                                    <X className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end">
                    <Link href="/admin">
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </Link>
                    {step === "add-items" && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep("room-details")}
                        >
                            Back
                        </Button>
                    )}
                    <Button type="submit" disabled={isSaving}>
                        {isSaving
                            ? "Creating..."
                            : step === "room-details"
                            ? "Next: Add Items"
                            : "Create Room & Items"}
                    </Button>
                </div>
            </form>
        </div>
    )
}
