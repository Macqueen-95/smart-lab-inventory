// Unified data structure for rooms and items

export interface InventoryItem {
    id: string
    name: string
    description?: string
    quantity: number
    imageUrl?: string // Placeholder for future 3D SVG
    type: string
    rfidTagId?: string
    status: "Active" | "Maintenance" | "Missing"
    lastScan?: string
    createdAt: string
    updatedAt: string
}

export interface Room {
    id: string
    name: string
    title: string
    location: string
    description?: string
    imageUrl?: string // Room image
    items: InventoryItem[]
    createdAt: string
    updatedAt: string
}

// Storage keys
export const STORAGE_KEYS = {
    ROOMS: "inventoryRooms",
    ITEMS: "inventoryItems",
}

// Load all rooms from localStorage
export function loadRooms(): Room[] {
    if (typeof window === "undefined") return []
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.ROOMS)
        return stored ? JSON.parse(stored) : []
    } catch (e) {
        console.error("Failed to load rooms", e)
        return []
    }
}

// Save rooms to localStorage
export function saveRooms(rooms: Room[]): void {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms))
    } catch (e) {
        console.error("Failed to save rooms", e)
    }
}

// Get room by ID
export function getRoomById(roomId: string): Room | null {
    const rooms = loadRooms()
    return rooms.find((r) => r.id === roomId) || null
}

// Add or update room
export function saveRoom(room: Room): void {
    const rooms = loadRooms()
    const index = rooms.findIndex((r) => r.id === room.id)
    if (index >= 0) {
        rooms[index] = { ...room, updatedAt: new Date().toISOString() }
    } else {
        rooms.push({ ...room, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }
    saveRooms(rooms)
}

// Delete room
export function deleteRoom(roomId: string): void {
    const rooms = loadRooms()
    const filtered = rooms.filter((r) => r.id !== roomId)
    saveRooms(filtered)
}

// Sync rooms from map data
export function syncRoomsFromMaps(): void {
    if (typeof window === "undefined") return
    try {
        const storedMaps = localStorage.getItem("floorMaps")
        if (!storedMaps) return

        const maps = JSON.parse(storedMaps)
        const existingRooms = loadRooms()
        const roomMap = new Map(existingRooms.map((r) => [r.id, r]))

        maps.forEach((map: any) => {
            if (map.rooms && Array.isArray(map.rooms)) {
                map.rooms.forEach((mapRoom: any) => {
                    const roomId = `room-${mapRoom.id}`
                    if (!roomMap.has(roomId)) {
                        // Create room from map data
                        const newRoom: Room = {
                            id: roomId,
                            name: mapRoom.name,
                            title: mapRoom.name,
                            location: map.title || "Unknown Location",
                            description: mapRoom.components?.join(", ") || "",
                            items: mapRoom.items || [],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        }
                        roomMap.set(roomId, newRoom)
                    }
                })
            }
        })

        saveRooms(Array.from(roomMap.values()))
    } catch (e) {
        console.error("Failed to sync rooms from maps", e)
    }
}
