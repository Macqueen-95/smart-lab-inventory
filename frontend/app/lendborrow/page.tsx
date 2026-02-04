"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { lendBorrowAPI, rfidAPI } from "@/lib/api"
import { ArrowLeft, UserCheck, PackageCheck, Users, History, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function LendBorrowPage() {
    const [activeTab, setActiveTab] = useState<"out" | "in" | "active">("out")
    const [scannedRfid, setScannedRfid] = useState("")
    const [userRfid, setUserRfid] = useState("")
    const [activeLentItems, setActiveLentItems] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)

    const pollRfid = async () => {
        try {
            const result = await rfidAPI.getLatestScan()
            if (result.success && result.rfid_uid) {
                if (activeTab === "out" && !userRfid) {
                    setUserRfid(result.rfid_uid)
                } else {
                    setScannedRfid(result.rfid_uid)
                }
            }
        } catch (err) {
            // Silent fail for polling
        }
    }

    useEffect(() => {
        const interval = setInterval(pollRfid, 100)
        return () => clearInterval(interval)
    }, [activeTab, userRfid])

    useEffect(() => {
        loadActiveLentItems()
    }, [])

    const loadActiveLentItems = async () => {
        try {
            const result = await lendBorrowAPI.getActive()
            if (result.success) {
                setActiveLentItems(result.items || [])
            }
        } catch (err) {
            console.error("Failed to load lent items:", err)
        }
    }

    const handleLendOut = async () => {
        if (!scannedRfid) {
            setMessage({ type: "error", text: "Please scan an item" })
            return
        }

        setLoading(true)
        try {
            const result = await lendBorrowAPI.lendOut(scannedRfid, userRfid || undefined)
            if (result.success) {
                setMessage({ type: "success", text: "Item lent out successfully!" })
                setScannedRfid("")
                loadActiveLentItems()
            } else {
                setMessage({ type: "error", text: result.message || "Failed to lend item" })
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Error lending item" })
        } finally {
            setLoading(false)
        }
    }

    const handleReturnIn = async () => {
        if (!scannedRfid) {
            setMessage({ type: "error", text: "Please scan an item to return" })
            return
        }

        setLoading(true)
        try {
            const result = await lendBorrowAPI.returnIn(scannedRfid)
            if (result.success) {
                setMessage({ type: "success", text: "Item returned successfully!" })
                setScannedRfid("")
                loadActiveLentItems()
            } else {
                setMessage({ type: "error", text: result.message || "Failed to return item" })
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Error returning item" })
        } finally {
            setLoading(false)
        }
    }

    const clearUser = () => {
        setUserRfid("")
        setScannedRfid("")
        setMessage(null)
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Lend/Borrow Management</h2>
                    <p className="text-zinc-500">Track items lent to users and manage returns</p>
                </div>
                <Link href="/admin">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Admin
                    </Button>
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => { setActiveTab("out"); setScannedRfid(""); setUserRfid(""); setMessage(null) }}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === "out" ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500"}`}
                >
                    <UserCheck className="h-4 w-4 inline mr-2" />
                    Lend Out
                </button>
                <button
                    onClick={() => { setActiveTab("in"); setScannedRfid(""); setUserRfid(""); setMessage(null) }}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === "in" ? "border-green-600 text-green-600" : "border-transparent text-zinc-500"}`}
                >
                    <PackageCheck className="h-4 w-4 inline mr-2" />
                    Return Item
                </button>
                <button
                    onClick={() => setActiveTab("active")}
                    className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === "active" ? "border-purple-600 text-purple-600" : "border-transparent text-zinc-500"}`}
                >
                    <Users className="h-4 w-4 inline mr-2" />
                    Currently Lent ({activeLentItems.length})
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {message.text}
                </div>
            )}

            {/* Lend Out Tab */}
            {activeTab === "out" && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Lend Item to User</CardTitle>
                            <CardDescription>Step 1: Scan user RFID (optional) | Step 2: Scan item RFID</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">User RFID (Optional)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={userRfid}
                                        onChange={(e) => setUserRfid(e.target.value)}
                                        placeholder="Scan user badge or leave empty"
                                        className="flex-1 px-3 py-2 border rounded-md"
                                    />
                                    <Button variant="outline" onClick={clearUser}>Clear</Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item RFID *</label>
                                <input
                                    type="text"
                                    value={scannedRfid}
                                    onChange={(e) => setScannedRfid(e.target.value)}
                                    placeholder="Scan item RFID tag"
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>

                            <Button 
                                onClick={handleLendOut} 
                                disabled={loading || !scannedRfid}
                                className="w-full"
                            >
                                {loading ? "Processing..." : "Lend Out Item"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Return In Tab */}
            {activeTab === "in" && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Return Item</CardTitle>
                            <CardDescription>Scan the item RFID to mark as returned</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item RFID</label>
                                <input
                                    type="text"
                                    value={scannedRfid}
                                    onChange={(e) => setScannedRfid(e.target.value)}
                                    placeholder="Scan item RFID tag"
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>

                            <Button 
                                onClick={handleReturnIn} 
                                disabled={loading || !scannedRfid}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                                {loading ? "Processing..." : "Mark as Returned"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Active Lent Items Tab */}
            {activeTab === "active" && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Currently Lent Items</CardTitle>
                                <CardDescription>Items that are currently out with users</CardDescription>
                            </div>
                            <Button variant="outline" onClick={loadActiveLentItems} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {activeLentItems.length === 0 ? (
                            <p className="text-center text-zinc-500 py-8">No items currently lent out</p>
                        ) : (
                            <div className="space-y-3">
                                {activeLentItems.map((item, idx) => (
                                    <div key={idx} className="p-4 border rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{item.item_name || "Unknown Item"}</p>
                                            <p className="text-sm text-zinc-500">RFID: {item.rfid_uid}</p>
                                            {item.user_name && <p className="text-sm text-zinc-600">User: {item.user_name}</p>}
                                            <p className="text-xs text-zinc-400">Out since: {new Date(item.out_datetime).toLocaleString()}</p>
                                        </div>
                                        <Badge className="bg-yellow-100 text-yellow-800">OUT</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
