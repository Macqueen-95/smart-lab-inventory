"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Upload, X, Save, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { floorPlansAPI, uploadToBlob } from "@/lib/api"

// Standard resolution for floor maps (Full HD - most common web standard)
const STANDARD_WIDTH = 1920
const STANDARD_HEIGHT = 1080

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
}

export default function FloorMapUploadPage() {
    const router = useRouter()
    const [floorMapImage, setFloorMapImage] = useState<string | null>(null)
    const [processedImage, setProcessedImage] = useState<string | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentPoints, setCurrentPoints] = useState<Point[]>([])
    const [rooms, setRooms] = useState<RoomRegion[]>([])
    const [selectedRoom, setSelectedRoom] = useState<RoomRegion | null>(null)
    const [roomName, setRoomName] = useState("")
    const [components, setComponents] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [mapTitle, setMapTitle] = useState("")
    const [mapDescription, setMapDescription] = useState("")

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Process and resize uploaded image
    const processImage = (file: File) => {
        // Validate file type
        if (!file.type.startsWith("image/")) {
            setUploadError("Please upload a valid image file (PNG, JPG, SVG)")
            return
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setUploadError("File size must be less than 10MB")
            return
        }

        setUploadError(null)
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                try {
                    // Create canvas for processing
                    const canvas = document.createElement("canvas")
                    canvas.width = STANDARD_WIDTH
                    canvas.height = STANDARD_HEIGHT
                    const ctx = canvas.getContext("2d")

                    if (!ctx) {
                        setUploadError("Failed to process image")
                        return
                    }

                    // Fill with white background for better quality
                    ctx.fillStyle = "#ffffff"
                    ctx.fillRect(0, 0, STANDARD_WIDTH, STANDARD_HEIGHT)

                    // Calculate scaling to fit while maintaining aspect ratio
                    const scale = Math.min(
                        STANDARD_WIDTH / img.width,
                        STANDARD_HEIGHT / img.height
                    )
                    const scaledWidth = img.width * scale
                    const scaledHeight = img.height * scale
                    const offsetX = (STANDARD_WIDTH - scaledWidth) / 2
                    const offsetY = (STANDARD_HEIGHT - scaledHeight) / 2

                    // Draw image with high quality
                    ctx.imageSmoothingEnabled = true
                    ctx.imageSmoothingQuality = "high"
                    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

                    const processedDataUrl = canvas.toDataURL("image/png", 1.0)
                    setProcessedImage(processedDataUrl)
                    setFloorMapImage(processedDataUrl)
                } catch (error) {
                    setUploadError("Failed to process image. Please try again.")
                    console.error("Image processing error:", error)
                }
            }
            img.onerror = () => {
                setUploadError("Failed to load image. Please check the file format.")
            }
            img.src = e.target?.result as string
        }
        reader.onerror = () => {
            setUploadError("Failed to read file. Please try again.")
        }
        reader.readAsDataURL(file)
    }

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            processImage(file)
            setRooms([])
            setCurrentPoints([])
        }
        // Reset input so same file can be selected again
        if (e.target) {
            e.target.value = ""
        }
    }

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const file = e.dataTransfer.files?.[0]
        if (file) {
            processImage(file)
            setRooms([])
            setCurrentPoints([])
        }
    }

    // Get mouse position relative to canvas
    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        }
    }

    // Start drawing a new region
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!processedImage) return
        setIsDrawing(true)
        const point = getMousePos(e)
        setCurrentPoints([point])
    }

    // Continue drawing - use requestAnimationFrame for smooth performance
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !processedImage) return
        const point = getMousePos(e)
        setCurrentPoints((prev) => {
            const newPoints = [...prev, point]
            // Throttle updates to prevent shuttering
            requestAnimationFrame(() => {
                drawCanvas()
            })
            return newPoints
        })
    }

    // Finish drawing
    const handleMouseUp = () => {
        if (!isDrawing) return
        setIsDrawing(false)
        if (currentPoints.length > 2) {
            // Open form to name the room
            setSelectedRoom({
                id: `room-${Date.now()}`,
                name: "",
                points: [...currentPoints],
                components: [],
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            })
            setRoomName("")
            setComponents("")
        } else {
            setCurrentPoints([])
        }
    }

    // Draw canvas with image and regions - optimized to prevent shuttering
    const drawCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas || !processedImage) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Use cached image if available
        if (!imageRef.current || imageRef.current.src !== processedImage) {
            const img = new Image()
            img.onload = () => {
                imageRef.current = img
                redrawCanvas(ctx, img)
            }
            img.src = processedImage
        } else {
            redrawCanvas(ctx, imageRef.current)
        }
    }

    const redrawCanvas = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
        // Clear canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        // Draw floor map image
        ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height)

        // Draw existing rooms
        rooms.forEach((room) => {
            drawRegion(ctx, room.points, room.color, room.name, true)
        })

        // Draw current drawing
        if (currentPoints.length > 0) {
            drawRegion(ctx, currentPoints, "#3b82f6", "", false)
        }
    }

    // Draw a region on canvas
    const drawRegion = (
        ctx: CanvasRenderingContext2D,
        points: Point[],
        color: string,
        label: string,
        isComplete: boolean
    ) => {
        if (points.length < 2) return

        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y)
        }
        if (isComplete) {
            ctx.closePath()
        }

        // Fill with semi-transparent color
        ctx.fillStyle = color + "40"
        ctx.fill()

        // Stroke
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw label if provided
        if (label && points.length > 0) {
            const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
            const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length

            ctx.fillStyle = "#ffffff"
            ctx.font = "bold 16px Arial"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(label, centerX, centerY)
        }
    }

    // Redraw when image or rooms change
    useEffect(() => {
        if (processedImage) {
            drawCanvas()
        }
    }, [processedImage, rooms, currentPoints])

    // Save room
    const handleSaveRoom = () => {
        if (!selectedRoom || !roomName.trim()) return

        const updatedRoom: RoomRegion = {
            ...selectedRoom,
            name: roomName.trim(),
            components: components
                .split(",")
                .map((c) => c.trim())
                .filter((c) => c.length > 0),
        }

        setRooms([...rooms, updatedRoom])
        setSelectedRoom(null)
        setCurrentPoints([])
        setRoomName("")
        setComponents("")
        drawCanvas()
    }

    // Cancel current drawing
    const handleCancel = () => {
        setCurrentPoints([])
        setSelectedRoom(null)
        setIsDrawing(false)
    }

    // Save: upload image to Vercel Blob, create floor plan + rooms in backend
    const handleSaveFloorMap = async () => {
        if (!processedImage || rooms.length === 0) return

        setIsSaving(true)
        setUploadError(null)

        try {
            // Convert data URL to File and upload to Vercel Blob
            const res = await fetch(processedImage)
            const blob = await res.blob()
            const file = new File([blob], "floor.png", { type: "image/png" })
            const floorUrl = await uploadToBlob(file, "floor")

            const title = mapTitle.trim() || "Untitled Floor Plan"
            const desc = mapDescription.trim() || undefined

            const createRes = await floorPlansAPI.create({
                floor_title: title,
                floor_description: desc,
                floor_url: floorUrl,
            })
            if (!createRes.success || !createRes.floor_plan) {
                setUploadError("Failed to create floor plan")
                setIsSaving(false)
                return
            }

            const planId = createRes.floor_plan.id

            for (const room of rooms) {
                await floorPlansAPI.createRoom(planId, {
                    room_name: room.name,
                    room_description: room.components.length ? room.components.join(", ") : undefined,
                })
            }

            router.push(`/map/${planId}`)
        } catch (e) {
            console.error(e)
            setUploadError(e instanceof Error ? e.message : "Save failed")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Upload Floor Map</h2>
                    <p className="text-zinc-500">
                        Upload and annotate your floor plan. Draw regions to mark rooms and labs.
                    </p>
                    {uploadError && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                            {uploadError}
                        </div>
                    )}
                </div>
                {processedImage && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleCancel}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                        <Button onClick={handleSaveFloorMap} disabled={isSaving || rooms.length === 0 || !mapTitle.trim()}>
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? "Saving..." : "Save Floor Map"}
                        </Button>
                    </div>
                )}
            </div>

            {!processedImage ? (
                <Card className="flex-1 flex items-center justify-center">
                    <CardContent
                        className={`text-center space-y-4 py-12 ${isDragging ? "bg-blue-50 border-2 border-blue-500 border-dashed" : ""}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <Upload className={`h-12 w-12 mx-auto ${isDragging ? "text-blue-500" : "text-zinc-400"}`} />
                        <div>
                            <CardTitle className="mb-2">
                                {isDragging ? "Drop your floor map here" : "Upload Floor Map"}
                            </CardTitle>
                            <CardDescription className="mb-4">
                                Upload an SVG, PNG, or JPG image of your floor plan.
                                It will be automatically resized to {STANDARD_WIDTH}x{STANDARD_HEIGHT}px (Full HD) for consistency.
                            </CardDescription>
                            {uploadError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {uploadError}
                                </div>
                            )}
                            <div>
                                <input
                                    ref={fileInputRef}
                                    id="floor-map-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Choose File
                                </Button>
                            </div>
                            <p className="text-xs text-zinc-500 mt-4">
                                Or drag and drop your file here
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex gap-4 flex-1 min-h-0">
                    {/* Canvas Area */}
                    <Card className="flex-1 flex flex-col min-h-0">
                        <CardHeader>
                            <CardTitle>Draw Regions</CardTitle>
                            <CardDescription>
                                Click and drag to draw room perimeters. Double-click or release to finish.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 relative">
                            <div
                                ref={containerRef}
                                className="relative w-full h-full border rounded-lg overflow-auto bg-zinc-50"
                            >
                                <canvas
                                    ref={canvasRef}
                                    width={STANDARD_WIDTH}
                                    height={STANDARD_HEIGHT}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    className="cursor-crosshair max-w-full h-auto"
                                    style={{ display: "block" }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sidebar for Room Details */}
                    <Card className="w-80 flex-shrink-0 bg-white">
                        <CardHeader className="bg-white border-b">
                            <CardTitle className="text-black">Room Details</CardTitle>
                            <CardDescription className="text-zinc-600">
                                {selectedRoom
                                    ? "Name this room and add components"
                                    : rooms.length > 0
                                        ? `${rooms.length} room${rooms.length > 1 ? "s" : ""} defined`
                                        : "Draw a region to get started"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 bg-white">
                            {selectedRoom ? (
                                <>
                                    <div className="space-y-2">
                                        <label htmlFor="room-name" className="text-sm font-medium text-black">
                                            Room Name *
                                        </label>
                                        <Input
                                            id="room-name"
                                            placeholder="E.g., Conference Room A"
                                            value={roomName}
                                            onChange={(e) => setRoomName(e.target.value)}
                                            className="bg-white text-black border-zinc-300"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="components" className="text-sm font-medium text-black">
                                            Components (comma-separated)
                                        </label>
                                        <Input
                                            id="components"
                                            placeholder="E.g., Projector, Chairs, Whiteboard"
                                            value={components}
                                            onChange={(e) => setComponents(e.target.value)}
                                            className="bg-white text-black border-zinc-300"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSaveRoom}
                                            disabled={!roomName.trim()}
                                            className="flex-1 bg-white text-black border border-zinc-300 hover:bg-zinc-50"
                                        >
                                            Save Room
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedRoom(null)
                                                setCurrentPoints([])
                                                setRoomName("")
                                                setComponents("")
                                            }}
                                            className="bg-white text-black border-zinc-300 hover:bg-zinc-50"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    {/* Map Title and Description */}
                                    <div className="space-y-4 pb-4 border-b">
                                        <div className="space-y-2">
                                            <label htmlFor="map-title" className="text-sm font-medium text-black">
                                                Map Title *
                                            </label>
                                            <Input
                                                id="map-title"
                                                placeholder="E.g., Main Building Floor 1"
                                                value={mapTitle}
                                                onChange={(e) => setMapTitle(e.target.value)}
                                                className="bg-white text-black border-zinc-300"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="map-description" className="text-sm font-medium text-black">
                                                Description
                                            </label>
                                            <textarea
                                                id="map-description"
                                                placeholder="Brief description of this floor map..."
                                                value={mapDescription}
                                                onChange={(e) => setMapDescription(e.target.value)}
                                                className="flex min-h-[80px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                                                rows={3}
                                            />
                                        </div>
                                    </div>

                                    {rooms.map((room) => (
                                        <div
                                            key={room.id}
                                            className="p-3 border rounded-lg bg-white border-zinc-300"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div
                                                    className="w-4 h-4 rounded"
                                                    style={{ backgroundColor: room.color }}
                                                />
                                                <span className="font-medium text-black">{room.name}</span>
                                            </div>
                                            {room.components.length > 0 && (
                                                <div className="text-xs text-zinc-600">
                                                    {room.components.join(", ")}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {rooms.length === 0 && (
                                        <p className="text-sm text-zinc-600 text-center py-4">
                                            Click and drag on the canvas to start drawing a room region.
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
