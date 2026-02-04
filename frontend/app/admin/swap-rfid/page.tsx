"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { adminAPI, rfidAPI } from "@/lib/api"
import { ArrowLeft, Radio, RefreshCw, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function SwapRfidPage() {
    const [oldRfid, setOldRfid] = useState("")
    const [newRfid, setNewRfid] = useState("")
    const [step, setStep] = useState<"old" | "new">("old")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)

    const pollRfid = async () => {
        try {
            const result = await rfidAPI.getLatestScan()
            if (result.success && result.rfid_uid) {
                if (step === "old") {
                    setOldRfid(result.rfid_uid)
                } else {
                    setNewRfid(result.rfid_uid)
                }
            }
        } catch (err) {
            // Silent fail for polling
        }
    }

    useEffect(() => {
        const interval = setInterval(pollRfid, 100)
        return () => clearInterval(interval)
    }, [step])

    const handleSwap = async () => {
        if (!oldRfid || !newRfid) {
            setMessage({ type: "error", text: "Both RFID tags are required" })
            return
        }

        setLoading(true)
        try {
            const result = await adminAPI.swapRfid(oldRfid, newRfid)
            if (result.success) {
                setMessage({ 
                    type: "success", 
                    text: `RFID swapped successfully! ${result.item?.item_name || "Item"} now has RFID: ${newRfid}` 
                })
                setOldRfid("")
                setNewRfid("")
                setStep("old")
            } else {
                setMessage({ type: "error", text: result.message || "Failed to swap RFID" })
            }
        } catch (err: any) {
            setMessage({ type: "error", text: err.response?.data?.message || "Error swapping RFID" })
        } finally {
            setLoading(false)
        }
    }

    const reset = () => {
        setOldRfid("")
        setNewRfid("")
        setStep("old")
        setMessage(null)
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Swap RFID Tags</h2>
                    <p className="text-zinc-500">Transfer RFID from damaged item to replacement</p>
                </div>
                <Link href="/admin">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Admin
                    </Button>
                </Link>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {message.text}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Radio className="h-5 w-5" />
                        RFID Swap Process
                    </CardTitle>
                    <CardDescription>
                        Step 1: Scan old/damaged item | Step 2: Scan new/replacement item
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1: Old RFID */}
                    <div className={`p-4 rounded-lg border-2 ${step === "old" ? "border-blue-500 bg-blue-50" : "border-zinc-200"}`}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-sm">1</span>
                                Old/Damaged Item RFID
                            </h3>
                            {oldRfid && step !== "old" && (
                                <Button variant="ghost" size="sm" onClick={() => setStep("old")}>Edit</Button>
                            )}
                        </div>
                        <input
                            type="text"
                            value={oldRfid}
                            onChange={(e) => setOldRfid(e.target.value)}
                            placeholder="Scan old item RFID tag"
                            className="w-full px-3 py-2 border rounded-md"
                            disabled={step !== "old"}
                        />
                        {step === "old" && oldRfid && (
                            <Button 
                                onClick={() => setStep("new")} 
                                className="w-full mt-3 gap-2"
                            >
                                Next: Scan New Item
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Step 2: New RFID */}
                    <div className={`p-4 rounded-lg border-2 ${step === "new" ? "border-green-500 bg-green-50" : "border-zinc-200"} ${!oldRfid ? "opacity-50" : ""}`}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-sm">2</span>
                                New/Replacement Item RFID
                            </h3>
                        </div>
                        <input
                            type="text"
                            value={newRfid}
                            onChange={(e) => setNewRfid(e.target.value)}
                            placeholder="Scan new item RFID tag"
                            className="w-full px-3 py-2 border rounded-md"
                            disabled={step !== "new"}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            onClick={reset}
                            className="flex-1"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                        <Button 
                            onClick={handleSwap} 
                            disabled={loading || !oldRfid || !newRfid}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {loading ? "Swapping..." : "Swap RFID Tags"}
                        </Button>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> This will transfer the inventory assignment from the old RFID to the new RFID. 
                            Use this when replacing damaged items with identical replacements.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
