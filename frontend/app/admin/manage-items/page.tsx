"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ArrowLeft, Plus, Search, X, Save, Upload, Package, Wifi, Edit2, Trash2, Check } from "lucide-react"
import { roomsAPI, itemsAPI, uploadToBlob, rfidAPI, type Room, type InventoryItem } from "@/lib/api"
import { ScanningUI } from "@/components/ui/ScanningUI"

export default function ManageItemsPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
    const [items, setItems] = useState<InventoryItem[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [newItem, setNewItem] = useState<{ item_name: string; item_quantity: number; item_icon_url?: string } | null>(null)
    const [iconFile, setIconFile] = useState<File | null>(null)
    const [isLoadingRooms, setIsLoadingRooms] = useState(true)
    const [isLoadingItems, setIsLoadingItems] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [scanningItemId, setScanningItemId] = useState<number | null>(null)
    const [scannedRfidUid, setScannedRfidUid] = useState<string>("")
    const [rfidScanListening, setRfidScanListening] = useState(false)
    const [editingItemId, setEditingItemId] = useState<number | null>(null)
    const [editingItemName, setEditingItemName] = useState("")
    const [deletingItemId, setDeletingItemId] = useState<number | null>(null)
    const lastScanTimeRef = useRef<string | null>(null)

    useEffect(() => {
        let cancelled = false
        async function loadRooms() {
            try {
                const res = await roomsAPI.list()
                if (!cancelled && res.success && res.rooms?.length) {
                    setRooms(res.rooms)
                    if (selectedRoomId === null) setSelectedRoomId(res.rooms[0].id)
                }
            } catch (e) {
                if (!cancelled) setError("Failed to load rooms")
            } finally {
                if (!cancelled) setIsLoadingRooms(false)
            }
        }
        loadRooms()
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (selectedRoomId == null) {
            setItems([])
            return
        }
        let cancelled = false
        setIsLoadingItems(true)
        setError(null)
        itemsAPI
            .listByRoom(selectedRoomId)
            .then((res) => {
                if (!cancelled && res.success && res.items) setItems(res.items)
            })
            .catch(() => {
                if (!cancelled) setError("Failed to load items")
            })
            .finally(() => {
                if (!cancelled) setIsLoadingItems(false)
            })
        return () => { cancelled = true }
    }, [selectedRoomId])

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId)
    const filteredItems = items.filter((item) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return item.item_name.toLowerCase().includes(q)
    })

    const handleAddItem = () => {
        setNewItem({ item_name: "", item_quantity: 1 })
        setIconFile(null)
    }

    const handleSaveNewItem = async () => {
        if (!selectedRoomId || !newItem?.item_name?.trim()) return
        setSaving(true)
        setError(null)
        try {
            let iconUrl: string | undefined
            if (iconFile) {
                iconUrl = await uploadToBlob(iconFile, "icon")
            }
            const res = await itemsAPI.create(selectedRoomId, {
                item_name: newItem.item_name.trim(),
                item_quantity: newItem.item_quantity,
                item_icon_url: iconUrl,
            })
            if (res.success) {
                if (res.items) {
                    // Bulk creation
                    setItems((prev) => [...prev, ...res.items!])
                } else if (res.item) {
                    // Single item
                    setItems((prev) => [...prev, res.item!])
                }
                setNewItem(null)
                setIconFile(null)
            } else setError("Failed to create item")
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create item")
        } finally {
            setSaving(false)
        }
    }

    const handleUploadIcon = async (item: InventoryItem) => {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = "image/*"
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file || !selectedRoomId) return
            try {
                const url = await uploadToBlob(file, "icon")
                await itemsAPI.updateIcon(item.id, selectedRoomId, url)
                setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, item_icon_url: url } : i)))
            } catch (err) {
                setError("Failed to upload icon")
            }
        }
        input.click()
    }

    const handleStartRfidScan = (itemId: number) => {
        setScanningItemId(itemId)
        setScannedRfidUid("")
        setRfidScanListening(true)
        setError(null)
        // Reset to current time to ignore old scans
        lastScanTimeRef.current = new Date().toISOString()
    }

    const handleCancelRfidScan = () => {
        setScanningItemId(null)
        setScannedRfidUid("")
        setRfidScanListening(false)
        lastScanTimeRef.current = null
    }

    // Poll for new RFID scans when in scanning mode (600ms with since parameter)
    useEffect(() => {
        if (!rfidScanListening || scanningItemId === null) return

        const pollForScan = async () => {
            try {
                const result = await rfidAPI.getLatestScan(lastScanTimeRef.current ?? undefined)
                if (result.success && result.rfid_uid && result.rfid_uid !== scannedRfidUid) {
                    if (result.scanned_at) lastScanTimeRef.current = result.scanned_at
                    setScannedRfidUid(result.rfid_uid)
                }
            } catch (_e) {
                // Ignore errors during polling
            }
        }

        const interval = setInterval(pollForScan, 600)
        pollForScan()
        return () => clearInterval(interval)
    }, [rfidScanListening, scanningItemId, scannedRfidUid])


    const handleAssignRfid = async () => {
        if (!scanningItemId || !scannedRfidUid.trim()) {
            setError("Please enter or scan an RFID UID")
            return
        }

        setSaving(true)
        setError(null)
        try {
            const res = await itemsAPI.assignRfid(scanningItemId, scannedRfidUid.trim())
            if (res.success) {
                // Update the item in the list
                setItems((prev) =>
                    prev.map((i) =>
                        i.id === scanningItemId ? { ...i, rfid_uid: scannedRfidUid.trim() } : i
                    )
                )
                setScanningItemId(null)
                setScannedRfidUid("")
                setRfidScanListening(false)
            } else {
                setError(res.message || "Failed to assign RFID")
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to assign RFID")
        } finally {
            setSaving(false)
        }
    }

    const handleStartEdit = (item: InventoryItem) => {
        setEditingItemId(item.id)
        setEditingItemName(item.item_name)
    }

    const handleSaveEdit = async () => {
        if (!editingItemId || !editingItemName.trim() || !selectedRoomId) return
        setSaving(true)
        setError(null)
        try {
            const res = await itemsAPI.updateName(editingItemId, selectedRoomId, editingItemName.trim())
            if (res.success) {
                setItems((prev) => prev.map((i) => (i.id === editingItemId ? { ...i, item_name: editingItemName.trim() } : i)))
                setEditingItemId(null)
                setEditingItemName("")
            } else {
                setError("Failed to update item name")
            }
        } catch (e) {
            setError("Failed to update item name")
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteItem = async (itemId: number) => {
        if (!selectedRoomId) return
        setSaving(true)
        setError(null)
        try {
            const res = await itemsAPI.deleteItem(itemId, selectedRoomId)
            if (res.success) {
                setItems((prev) => prev.filter((i) => i.id !== itemId))
                setDeletingItemId(null)
            } else {
                setError("Failed to delete item")
            }
        } catch (e) {
            setError("Failed to delete item")
        } finally {
            setSaving(false)
        }
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
                    <h2 className="text-2xl font-bold tracking-tight">Manage Items</h2>
                    <p className="text-zinc-500">Add items to rooms and set item icons.</p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Select Room</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingRooms ? (
                        <div className="text-zinc-500">Loading rooms...</div>
                    ) : rooms.length === 0 ? (
                        <p className="text-zinc-500">No rooms yet. Create a floor plan and add rooms from the Map upload flow.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {rooms.map((room) => (
                                <Button
                                    key={room.id}
                                    variant={selectedRoomId === room.id ? "default" : "outline"}
                                    onClick={() => {
                                        setSelectedRoomId(room.id)
                                        setNewItem(null)
                                    }}
                                >
                                    {room.room_name}
                                </Button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedRoom && (
                <>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                            <Input
                                className="pl-9"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAddItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                        </Button>
                    </div>

                    {newItem && (
                        <Card className="border-blue-500">
                            <CardHeader>
                                <CardTitle>Add New Item</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-black">Name *</label>
                                        <Input
                                            value={newItem.item_name}
                                            onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                                            className="bg-white text-black"
                                            placeholder="Item name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-black">Quantity</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={newItem.item_quantity}
                                            onChange={(e) =>
                                                setNewItem({ ...newItem, item_quantity: parseInt(e.target.value) || 1 })
                                            }
                                            className="bg-white text-black"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-black">Item icon (optional)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="new-item-icon"
                                            onChange={(e) => setIconFile(e.target.files?.[0] || null)}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById("new-item-icon")?.click()}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            {iconFile ? iconFile.name : "Choose image"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleSaveNewItem} disabled={saving || !newItem.item_name?.trim()}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {saving ? "Saving..." : "Save"}
                                    </Button>
                                    <Button variant="outline" onClick={() => { setNewItem(null); setIconFile(null) }}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {deletingItemId && (
                        <Card className="border-red-500 bg-red-50">
                            <CardHeader>
                                <CardTitle>Confirm Delete</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-zinc-700">
                                    Are you sure you want to delete this item? This action cannot be undone.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleDeleteItem(deletingItemId)}
                                        disabled={saving}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {saving ? "Deleting..." : "Delete"}
                                    </Button>
                                    <Button variant="outline" onClick={() => setDeletingItemId(null)}>
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {scanningItemId && (
                        <>
                            <ScanningUI
                                isScanning={rfidScanListening}
                                icon={<Wifi className="h-12 w-12" />}
                                title="Scan RFID UID"
                                description="Present your item to the scanner or enter the UID manually"
                                color="blue"
                            />
                            <Card className="border-green-500">
                                <CardHeader>
                                    <CardTitle>RFID UID</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Input
                                            autoFocus
                                            value={scannedRfidUid}
                                            onChange={(e) => setScannedRfidUid(e.target.value)}
                                            className="bg-white text-black font-mono"
                                            placeholder="RFID code will appear here or type manually..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleAssignRfid}
                                            disabled={saving || !scannedRfidUid.trim()}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <Wifi className="h-4 w-4 mr-2" />
                                            {saving ? "Assigning..." : "Assign RFID"}
                                        </Button>
                                        <Button variant="outline" onClick={handleCancelRfidScan}>
                                            <X className="h-4 w-4 mr-2" />
                                            Cancel
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {isLoadingItems ? (
                        <div className="text-center py-8 text-zinc-500">Loading items...</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredItems.map((item) => (
                                <Card key={item.id}>
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
                                    </div>
                                    <CardHeader>
                                        {editingItemId === item.id ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={editingItemName}
                                                    onChange={(e) => setEditingItemName(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => setEditingItemId(null)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="line-clamp-1">{item.item_name}</CardTitle>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" onClick={() => handleStartEdit(item)}>
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => setDeletingItemId(item.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                        {item.rfid_uid && (
                                            <p className="text-xs text-green-600 font-mono mt-2">
                                                RFID: {item.rfid_uid}
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => handleUploadIcon(item)}
                                        >
                                            <Upload className="h-3 w-3 mr-1" />
                                            {item.item_icon_url ? "Change icon" : "Upload icon"}
                                        </Button>
                                        <Button
                                            variant={item.rfid_uid ? "outline" : "default"}
                                            size="sm"
                                            className="w-full"
                                            onClick={() => handleStartRfidScan(item.id)}
                                        >
                                            <Wifi className="h-3 w-3 mr-1" />
                                            {item.rfid_uid ? "Update RFID" : "Scan RFID"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {!isLoadingItems && items.length === 0 && !newItem && (
                        <p className="text-zinc-500 text-center py-8">No items in this room. Click Add Item to create one.</p>
                    )}
                </>
            )}
        </div>
    )
}
