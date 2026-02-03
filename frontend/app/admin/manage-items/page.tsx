"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ArrowLeft, Plus, Search, Edit, Trash2, X, Save } from "lucide-react"
import { loadRooms, saveRoom, Room, InventoryItem } from "@/lib/inventory-data"
import { Badge } from "@/components/ui/Badge"

export default function ManageItemsPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const [newItem, setNewItem] = useState<Partial<InventoryItem> | null>(null)

    useEffect(() => {
        const loadedRooms = loadRooms()
        setRooms(loadedRooms)
        if (loadedRooms.length > 0 && !selectedRoomId) {
            setSelectedRoomId(loadedRooms[0].id)
        }
    }, [])

    const selectedRoom = rooms.find((r) => r.id === selectedRoomId)

    const filteredItems = selectedRoom?.items.filter((item) => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return (
            item.name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query)
        )
    }) || []

    const handleAddItem = () => {
        if (!selectedRoom) return
        setNewItem({
            name: "",
            description: "",
            quantity: 1,
            type: "Equipment",
            status: "Active",
        })
    }

    const handleSaveNewItem = () => {
        if (!selectedRoom || !newItem?.name?.trim()) return

        const item: InventoryItem = {
            id: `item-${Date.now()}`,
            name: newItem.name,
            description: newItem.description || "",
            quantity: newItem.quantity || 1,
            type: newItem.type || "Equipment",
            status: (newItem.status as "Active" | "Maintenance" | "Missing") || "Active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        const updatedRoom = {
            ...selectedRoom,
            items: [...selectedRoom.items, item],
            updatedAt: new Date().toISOString(),
        }

        saveRoom(updatedRoom)
        setRooms(rooms.map((r) => (r.id === selectedRoom.id ? updatedRoom : r)))
        setNewItem(null)
    }

    const handleUpdateItem = (itemId: string, updates: Partial<InventoryItem>) => {
        if (!selectedRoom) return

        const updatedRoom = {
            ...selectedRoom,
            items: selectedRoom.items.map((item) =>
                item.id === itemId
                    ? { ...item, ...updates, updatedAt: new Date().toISOString() }
                    : item
            ),
            updatedAt: new Date().toISOString(),
        }

        saveRoom(updatedRoom)
        setRooms(rooms.map((r) => (r.id === selectedRoom.id ? updatedRoom : r)))
        setEditingItemId(null)
    }

    const handleDeleteItem = (itemId: string) => {
        if (!selectedRoom || !confirm("Are you sure you want to delete this item?")) return

        const updatedRoom = {
            ...selectedRoom,
            items: selectedRoom.items.filter((item) => item.id !== itemId),
            updatedAt: new Date().toISOString(),
        }

        saveRoom(updatedRoom)
        setRooms(rooms.map((r) => (r.id === selectedRoom.id ? updatedRoom : r)))
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
                    <p className="text-zinc-500">Add, update, or delete items across rooms.</p>
                </div>
            </div>

            {/* Room Selector */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Room</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {rooms.map((room) => (
                            <Button
                                key={room.id}
                                variant={selectedRoomId === room.id ? "default" : "outline"}
                                onClick={() => {
                                    setSelectedRoomId(room.id)
                                    setEditingItemId(null)
                                    setNewItem(null)
                                }}
                            >
                                {room.title}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {selectedRoom && (
                <>
                    {/* Search and Add */}
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

                    {/* New Item Form */}
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
                                            value={newItem.name || ""}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className="bg-white text-black"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-black">Quantity</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={newItem.quantity || 1}
                                            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                                            className="bg-white text-black"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-black">Type</label>
                                        <select
                                            value={newItem.type || "Equipment"}
                                            onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                                            className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black"
                                        >
                                            <option>Equipment</option>
                                            <option>Furniture</option>
                                            <option>IT Infrastructure</option>
                                            <option>Storage</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-black">Status</label>
                                        <select
                                            value={newItem.status || "Active"}
                                            onChange={(e) => setNewItem({ ...newItem, status: e.target.value as any })}
                                            className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black"
                                        >
                                            <option>Active</option>
                                            <option>Maintenance</option>
                                            <option>Missing</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-black">Description</label>
                                    <Input
                                        value={newItem.description || ""}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        className="bg-white text-black"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleSaveNewItem} disabled={!newItem.name?.trim()}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save
                                    </Button>
                                    <Button variant="outline" onClick={() => setNewItem(null)}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Items List */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredItems.map((item) => (
                            <Card key={item.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="line-clamp-1">{item.name}</CardTitle>
                                        <Badge
                                            variant={
                                                item.status === "Active"
                                                    ? "success"
                                                    : item.status === "Maintenance"
                                                    ? "warning"
                                                    : "destructive"
                                            }
                                        >
                                            {item.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {editingItemId === item.id ? (
                                        <EditItemForm
                                            item={item}
                                            onSave={(updates) => handleUpdateItem(item.id, updates)}
                                            onCancel={() => setEditingItemId(null)}
                                        />
                                    ) : (
                                        <>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-600">Quantity:</span>
                                                    <span className="font-bold">{item.quantity}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-600">Type:</span>
                                                    <span>{item.type}</span>
                                                </div>
                                                {item.description && (
                                                    <div className="text-zinc-600 line-clamp-2">{item.description}</div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingItemId(item.id)}
                                                    className="flex-1"
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

function EditItemForm({
    item,
    onSave,
    onCancel,
}: {
    item: InventoryItem
    onSave: (updates: Partial<InventoryItem>) => void
    onCancel: () => void
}) {
    const [formData, setFormData] = useState({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        type: item.type,
        status: item.status,
    })

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <label className="text-xs font-medium text-black">Name</label>
                <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white text-black"
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-black">Quantity</label>
                    <Input
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        className="bg-white text-black"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-black">Type</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black"
                    >
                        <option>Equipment</option>
                        <option>Furniture</option>
                        <option>IT Infrastructure</option>
                        <option>Storage</option>
                        <option>Other</option>
                    </select>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-black">Status</label>
                <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black"
                >
                    <option>Active</option>
                    <option>Maintenance</option>
                    <option>Missing</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-medium text-black">Description</label>
                <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-white text-black"
                />
            </div>
            <div className="flex gap-2">
                <Button size="sm" onClick={() => onSave(formData)} className="flex-1">
                    <Save className="h-3 w-3 mr-1" />
                    Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </div>
    )
}
