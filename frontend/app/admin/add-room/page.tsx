"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ArrowLeft, Upload, Plus, X, Image as ImageIcon } from "lucide-react"
import { saveRoom, Room, InventoryItem } from "@/lib/inventory-data"

export default function AddRoomPage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [roomImage, setRoomImage] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        title: "",
        location: "",
        description: "",
    })
    const [items, setItems] = useState<Partial<InventoryItem>[]>([
        { name: "", description: "", quantity: 1, type: "Equipment", status: "Active" },
    ])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader()
            reader.onload = (e) => {
                setRoomImage(e.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const addItemField = () => {
        setItems([
            ...items,
            { name: "", description: "", quantity: 1, type: "Equipment", status: "Active" },
        ])
    }

    const removeItemField = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItemField = (index: number, field: string, value: any) => {
        const updated = [...items]
        updated[index] = { ...updated[index], [field]: value }
        setItems(updated)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim() || !formData.title.trim() || !formData.location.trim()) {
            alert("Please fill in all required fields")
            return
        }

        setIsSaving(true)

        const roomId = `room-${Date.now()}`
        const inventoryItems: InventoryItem[] = items
            .filter((item) => item.name?.trim())
            .map((item, idx) => ({
                id: `item-${roomId}-${idx}`,
                name: item.name!,
                description: item.description || "",
                quantity: item.quantity || 1,
                type: item.type || "Equipment",
                status: (item.status as "Active" | "Maintenance" | "Missing") || "Active",
                imageUrl: item.imageUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }))

        const newRoom: Room = {
            id: roomId,
            name: formData.name.trim(),
            title: formData.title.trim(),
            location: formData.location.trim(),
            description: formData.description.trim() || undefined,
            imageUrl: roomImage || undefined,
            items: inventoryItems,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        saveRoom(newRoom)

        setTimeout(() => {
            setIsSaving(false)
            router.push("/inventory")
        }, 500)
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
                    <p className="text-zinc-500">Create a room and add initial inventory items.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Room Details</CardTitle>
                        <CardDescription>Basic information about the room</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Room Image */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-black">Room Image (Optional)</label>
                            <div className="flex items-center gap-4">
                                {roomImage ? (
                                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                                        <img src={roomImage} alt="Room" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setRoomImage(null)}
                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center bg-zinc-50">
                                        <ImageIcon className="h-8 w-8 text-zinc-400" />
                                    </div>
                                )}
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Image
                                    </Button>
                                    <p className="text-xs text-zinc-500 mt-1">If no image, a default will be used</p>
                                </div>
                            </div>
                        </div>

                        {/* Room Name */}
                        <div className="space-y-2">
                            <label htmlFor="room-name" className="text-sm font-medium text-black">
                                Room Name *
                            </label>
                            <Input
                                id="room-name"
                                placeholder="E.g., Conference Room A"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="bg-white text-black"
                            />
                        </div>

                        {/* Room Title */}
                        <div className="space-y-2">
                            <label htmlFor="room-title" className="text-sm font-medium text-black">
                                Room Title *
                            </label>
                            <Input
                                id="room-title"
                                placeholder="E.g., Main Conference Room"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="bg-white text-black"
                            />
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <label htmlFor="location" className="text-sm font-medium text-black">
                                Location *
                            </label>
                            <Input
                                id="location"
                                placeholder="E.g., Building A, Floor 2"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                                className="bg-white text-black"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label htmlFor="description" className="text-sm font-medium text-black">
                                Description
                            </label>
                            <textarea
                                id="description"
                                placeholder="Optional description of the room..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="flex min-h-[100px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                                rows={4}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Items Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Initial Inventory Items</CardTitle>
                                <CardDescription>Add items that will be in this room</CardDescription>
                            </div>
                            <Button type="button" variant="outline" onClick={addItemField}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-zinc-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-black">Item {index + 1}</h4>
                                    {items.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItemField(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-black">Name *</label>
                                        <Input
                                            placeholder="Item name"
                                            value={item.name || ""}
                                            onChange={(e) => updateItemField(index, "name", e.target.value)}
                                            className="bg-white text-black"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-black">Quantity</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder="1"
                                            value={item.quantity || 1}
                                            onChange={(e) => updateItemField(index, "quantity", parseInt(e.target.value) || 1)}
                                            className="bg-white text-black"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-black">Type</label>
                                        <select
                                            value={item.type || "Equipment"}
                                            onChange={(e) => updateItemField(index, "type", e.target.value)}
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
                                        <label className="text-xs font-medium text-black">Status</label>
                                        <select
                                            value={item.status || "Active"}
                                            onChange={(e) => updateItemField(index, "status", e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black"
                                        >
                                            <option>Active</option>
                                            <option>Maintenance</option>
                                            <option>Missing</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-black">Description</label>
                                    <Input
                                        placeholder="Optional description"
                                        value={item.description || ""}
                                        onChange={(e) => updateItemField(index, "description", e.target.value)}
                                        className="bg-white text-black"
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Submit Buttons */}
                <div className="flex gap-4 justify-end">
                    <Link href="/admin">
                        <Button type="button" variant="outline">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Creating..." : "Create Room"}
                    </Button>
                </div>
            </form>
        </div>
    )
}
