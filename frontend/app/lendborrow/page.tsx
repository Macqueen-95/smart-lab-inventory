"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { lendBorrowAPI } from "@/lib/api"
import { XCircle, History, RefreshCw, Trash2, Check } from "lucide-react"

type ScanPhase = "waiting-item" | "items-listed" | "waiting-user" | "completed"

export default function BorrowPage() {
    const [scanPhase, setScanPhase] = useState<ScanPhase>("waiting-item")
    const [scannedItems, setScannedItems] = useState<any[]>([])
    const [userRfid, setUserRfid] = useState("")
    const [activeLentItems, setActiveLentItems] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error" | "info", text: string } | null>(null)
    const [showHistory, setShowHistory] = useState(false)
    const pollingRef = useRef<NodeJS.Timeout | null>(null)
    const lastScannedRef = useRef<string>("")
    const lastScannedTimestampRef = useRef<string>("")
    const scanPhaseRef = useRef<ScanPhase>("waiting-item")
    const scannedItemsRef = useRef<any[]>([])

    // Keep refs in sync with state
    useEffect(() => {
        scanPhaseRef.current = scanPhase
    }, [scanPhase])

    useEffect(() => {
        scannedItemsRef.current = scannedItems
    }, [scannedItems])

    const pollRfid = async () => {
        try {
            let url = `/api/rfid/latest-scan`
            if (lastScannedTimestampRef.current) {
                url += `?since=${encodeURIComponent(lastScannedTimestampRef.current)}`
            }
            
            const result = await fetch(url, {
                credentials: "include",
            }).then(r => r.json())
            
            if (result.success && result.rfid_uid && result.rfid_uid !== lastScannedRef.current) {
                lastScannedRef.current = result.rfid_uid
                if (result.scanned_at) {
                    lastScannedTimestampRef.current = result.scanned_at
                }
                
                if (scanPhaseRef.current === "waiting-item") {
                    // Auto-add item to list
                    const newItem = {
                        id: Date.now(),
                        rfid_uid: result.rfid_uid,
                        item_name: `Item ${scannedItemsRef.current.length + 1}`,
                        scanned_at: new Date().toLocaleTimeString()
                    }
                    setScannedItems(prev => [...prev, newItem])
                    setMessage({ type: "info", text: `Item scanned: ${result.rfid_uid}` })
                } else if (scanPhaseRef.current === "waiting-user") {
                    // User RFID scanned
                    setUserRfid(result.rfid_uid)
                }
            }
        } catch (err) {
            // Silent fail for polling
        }
    }

    useEffect(() => {
        // Initialize timestamp when entering waiting phases to only get NEW scans
        if (scanPhase === "waiting-item" || scanPhase === "waiting-user") {
            if (!lastScannedTimestampRef.current) {
                // First time entering this phase, initialize with current time
                lastScannedTimestampRef.current = new Date().toISOString()
            }
            pollingRef.current = setInterval(pollRfid, 500)
        }
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
    }, [scanPhase])

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

    const handleExitScan = () => {
        if (scannedItems.length > 0) {
            setScanPhase("items-listed")
        }
    }

    const handleRemoveItem = (id: number) => {
        setScannedItems(prev => prev.filter(item => item.id !== id))
    }

    const handleProceedToUserScan = () => {
        lastScannedRef.current = ""
        // Reset timestamp so next phase gets fresh scans from this point
        lastScannedTimestampRef.current = new Date().toISOString()
        setScanPhase("waiting-user")
    }

    const handleBorrow = async () => {
        if (scannedItems.length === 0) {
            setMessage({ type: "error", text: "Please scan at least one item" })
            return
        }

        if (!userRfid) {
            setMessage({ type: "error", text: "Please scan user RFID" })
            return
        }

        setLoading(true)
        try {
            for (const item of scannedItems) {
                const result = await lendBorrowAPI.lendOut(item.rfid_uid, userRfid)
                if (!result.success) {
                    setMessage({ type: "error", text: `Failed to lend item: ${result.message}` })
                    setLoading(false)
                    return
                }
            }
            
            setMessage({ type: "success", text: `Successfully lent ${scannedItems.length} item(s)!` })
            setScannedItems([])
            setUserRfid("")
            setScanPhase("waiting-item")
            loadActiveLentItems()
            lastScannedRef.current = ""
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Error lending items" })
        } finally {
            setLoading(false)
        }
    }

    const handleReturnItem = async (rfidUid: string) => {
        setLoading(true)
        try {
            const result = await lendBorrowAPI.returnIn(rfidUid)
            if (result.success) {
                setMessage({ type: "success", text: "Item returned successfully!" })
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

    const handleReset = () => {
        setScannedItems([])
        setUserRfid("")
        setScanPhase("waiting-item")
        setMessage(null)
        lastScannedRef.current = ""
        // Reset timestamp for next scan cycle
        lastScannedTimestampRef.current = ""
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Borrow Items</h2>
                    <p className="text-zinc-500">Scan items and assign them to users</p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => setShowHistory(!showHistory)}
                    className="gap-2"
                >
                    <History className="h-4 w-4" />
                    {showHistory ? "Hide" : "Show"} History
                </Button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${
                    message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : 
                    message.type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
                    "bg-blue-50 text-blue-700 border border-blue-200"
                }`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Scanning Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Phase 1: Wait for Item Scans */}
                    {scanPhase === "waiting-item" && (
                        <Card className="border-2 border-blue-200 bg-blue-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-3xl">📦</span>
                                    Scan Items
                                </CardTitle>
                                <CardDescription>Hold items near the scanner to add them</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                                    {/* Breathing Circle */}
                                    <div className="relative w-32 h-32">
                                        <div className="absolute inset-0 breathing-pulse rounded-full bg-blue-100"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="breathing-circle w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-5xl">
                                                📦
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-blue-900">Waiting for items...</p>
                                        <p className="text-sm text-blue-700 mt-1">Items scanned: <span className="font-bold">{scannedItems.length}</span></p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Phase 2: Items Listed */}
                    {(scanPhase === "items-listed" || scanPhase === "waiting-user") && (
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-2xl">✓</span>
                                    Scanned Items ({scannedItems.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {scannedItems.length === 0 ? (
                                    <p className="text-zinc-500 text-center py-8">No items scanned yet</p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {scannedItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                                <div>
                                                    <p className="font-mono text-sm text-gray-600">{item.rfid_uid}</p>
                                                    <p className="text-xs text-gray-500">{item.scanned_at}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Phase 3: Waiting User Scan */}
                    {scanPhase === "waiting-user" && (
                        <Card className="border-2 border-green-200 bg-green-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-3xl">👤</span>
                                    Scan User ID
                                </CardTitle>
                                <CardDescription>Scan user's RFID badge or ID</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                                    {/* Breathing Circle - Green */}
                                    <div className="relative w-32 h-32">
                                        <div className="absolute inset-0 breathing-pulse-green rounded-full bg-green-100"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="breathing-circle w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-5xl">
                                                👤
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        {userRfid ? (
                                            <>
                                                <div className="flex items-center justify-center gap-2 text-green-900 mb-2">
                                                    <Check className="h-6 w-6" />
                                                    <p className="text-lg font-semibold">User Scanned!</p>
                                                </div>
                                                <p className="text-sm font-mono text-green-700">{userRfid}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-lg font-semibold text-green-900">Waiting for user...</p>
                                                <p className="text-sm text-green-700 mt-1">Ready to scan {scannedItems.length} item(s)</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        {scanPhase === "waiting-item" && scannedItems.length > 0 && (
                            <>
                                <Button 
                                    onClick={handleExitScan}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Exit Scan ({scannedItems.length})
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={handleReset}
                                >
                                    Reset
                                </Button>
                            </>
                        )}

                        {scanPhase === "items-listed" && (
                            <>
                                <Button 
                                    onClick={handleProceedToUserScan}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    Proceed to User Scan
                                </Button>
                                <Button 
                                    onClick={() => setScanPhase("waiting-item")}
                                    variant="outline"
                                >
                                    Scan More Items
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={handleReset}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}

                        {scanPhase === "waiting-user" && userRfid && (
                            <>
                                <Button 
                                    onClick={handleBorrow}
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                >
                                    {loading ? "Processing..." : `Confirm Borrow (${scannedItems.length} items)`}
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={() => {
                                        setUserRfid("")
                                        lastScannedRef.current = ""
                                    }}
                                >
                                    Rescan User
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Sidebar: Active Lent Items */}
                <div>
                    <Card className="sticky top-4">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg">Currently Lent</CardTitle>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={loadActiveLentItems}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardDescription>{activeLentItems.length} item(s) out</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {activeLentItems.length === 0 ? (
                                <p className="text-center text-zinc-500 py-8 text-sm">No items currently lent out</p>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {activeLentItems.map((item, idx) => (
                                        <div key={idx} className="p-3 border rounded-lg bg-yellow-50">
                                            <p className="font-mono text-xs text-gray-600 truncate">{item.rfid_uid}</p>
                                            {item.user_name && <p className="text-xs font-semibold mt-1">👤 {item.user_name}</p>}
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(item.out_datetime).toLocaleDateString()}
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReturnItem(item.rfid_uid)}
                                                disabled={loading}
                                                className="w-full mt-2 text-xs h-7"
                                            >
                                                Return
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* History Modal */}
            {showHistory && (
                <Card className="bg-gray-50">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Borrow History</span>
                            <Button 
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHistory(false)}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-500 text-sm">
                            All lending/borrowing transactions are tracked with timestamps.
                            Items returned are automatically removed from the "Currently Lent" list.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
