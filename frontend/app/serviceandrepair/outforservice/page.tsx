"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { ArrowLeft, Wifi, CheckCircle2, X, AlertCircle, Package } from "lucide-react"
import { serviceAPI, rfidAPI } from "@/lib/api"
import { ScanningUI } from "@/components/ui/ScanningUI"

type ServiceItem = {
    rfid_uid: string
    item_name: string
    room_name: string
    floor_title: string
}

export default function OutForServicePage() {
    const router = useRouter()
    const [cart, setCart] = useState<ServiceItem[]>([])
    const [scannedRfid, setScannedRfid] = useState("")
    const [isScanning, setIsScanning] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const lastScanTimeRef = useRef<string | null>(null)

    // Poll for RFID scans (600ms with since parameter)
    useEffect(() => {
        if (!isScanning) {
            lastScanTimeRef.current = null
            return
        }

        const pollForScan = async () => {
            try {
                const result = await rfidAPI.getLatestScan(lastScanTimeRef.current ?? undefined)
                if (result.success && result.rfid_uid && result.rfid_uid !== scannedRfid) {
                    if (result.scanned_at) lastScanTimeRef.current = result.scanned_at
                    setScannedRfid(result.rfid_uid)
                }
            } catch (_e) {
                // Ignore polling errors
            }
        }

        const interval = setInterval(pollForScan, 600)
        pollForScan()
        return () => clearInterval(interval)
    }, [isScanning, scannedRfid])

    const handleAddToCart = async () => {
        if (!scannedRfid.trim()) {
            setError("Please scan or enter an RFID UID")
            return
        }

        setError(null)
        try {
            const res = await serviceAPI.getItemByRfid(scannedRfid)
            if (res.success && res.item) {
                // Check if already in cart
                if (cart.some(i => i.rfid_uid === scannedRfid)) {
                    setError("Item already in cart")
                    return
                }

                setCart([...cart, {
                    rfid_uid: res.item.rfid_uid,
                    item_name: res.item.item_name,
                    room_name: res.item.room_name,
                    floor_title: res.item.floor_title
                }])
                setScannedRfid("")
                setSuccess(`Added ${res.item.item_name} to cart`)
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError("Item not found")
            }
        } catch (e) {
            setError("Failed to fetch item details")
        }
    }

    const handleMarkAllOut = async () => {
        if (cart.length === 0) {
            setError("Cart is empty")
            return
        }

        setIsSaving(true)
        setError(null)

        try {
            for (const item of cart) {
                await serviceAPI.sendOut(item.rfid_uid)
            }
            router.push("/serviceandrepair")
        } catch (e) {
            setError("Failed to mark items as out for service")
        } finally {
            setIsSaving(false)
        }
    }

    const removeFromCart = (rfid: string) => {
        setCart(cart.filter(i => i.rfid_uid !== rfid))
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/serviceandrepair">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Out for Service</h2>
                    <p className="text-zinc-500">Scan items to send out for service or repair.</p>
                </div>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6 flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-sm">{error}</p>
                    </CardContent>
                </Card>
            )}

            {success && (
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6 flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <p className="text-sm">{success}</p>
                    </CardContent>
                </Card>
            )}

            {/* Scanner Card */}
            {isScanning && (
                <ScanningUI
                    isScanning={isScanning}
                    scannedCount={cart.length}
                    icon={<Wifi className="h-12 w-12" />}
                    title="Scan Item RFID"
                    description="Position item near scanner or enter UID manually"
                    color="blue"
                />
            )}
            <Card className={isScanning ? "border-blue-200 bg-blue-50" : ""}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wifi className="h-5 w-5 text-blue-600" />
                        Scan Item RFID
                    </CardTitle>
                    <CardDescription>Position item near scanner or enter UID manually</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Scanning... or enter manually"
                            value={scannedRfid}
                            onChange={(e) => setScannedRfid(e.target.value)}
                            onFocus={() => {
                                setIsScanning(true)
                                // Reset to current time to ignore old scans
                                lastScanTimeRef.current = new Date().toISOString()
                            }}
                            onBlur={() => setTimeout(() => setIsScanning(false), 500)}
                            className="bg-white text-black text-lg font-mono"
                            autoFocus
                        />
                    </div>
                    <Button
                        onClick={handleAddToCart}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        Add to Cart
                    </Button>
                </CardContent>
            </Card>

            {/* Cart */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Items to Send Out ({cart.length})</CardTitle>
                            <CardDescription>Review items before marking as out for service</CardDescription>
                        </div>
                        {cart.length > 0 && (
                            <Button
                                onClick={handleMarkAllOut}
                                disabled={isSaving}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {isSaving ? "Processing..." : "Mark All Out for Service"}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {cart.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <Package className="h-12 w-12 mx-auto mb-3 text-zinc-400" />
                            <p>No items in cart. Scan items to add.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cart.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                                >
                                    <div className="flex-1">
                                        <h4 className="font-medium text-black">{item.item_name}</h4>
                                        <p className="text-xs text-zinc-600">
                                            {item.floor_title} → {item.room_name}
                                        </p>
                                        <code className="text-xs font-mono text-blue-600">{item.rfid_uid}</code>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeFromCart(item.rfid_uid)}
                                    >
                                        <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
