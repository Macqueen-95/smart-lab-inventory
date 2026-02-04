"use client"

import { useState, useEffect } from "react"
import { Search, RefreshCw, RotateCcw } from "lucide-react"
import { rfidAPI, type RFIDScanLog } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

export default function LogsPage() {
    const [scanLogs, setScanLogs] = useState<RFIDScanLog[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterStatus, setFilterStatus] = useState<"all" | "OK" | "UNKNOWN">("all")

    const loadLogs = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await rfidAPI.getScanLogs(500)
            if (result.success && result.logs) {
                setScanLogs(result.logs)
            } else {
                setError("Failed to load logs")
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load logs")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadLogs()
        // Auto-refresh every 10 seconds
        const interval = setInterval(loadLogs, 10000)
        return () => clearInterval(interval)
    }, [])

    const filteredLogs = scanLogs.filter((log) => {
        if (filterStatus !== "all" && log.scan_status !== filterStatus) return false
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
            log.rfid_uid.toLowerCase().includes(q) ||
            (log.item_name?.toLowerCase().includes(q)) ||
            (log.room?.toLowerCase().includes(q)) ||
            log.scanner_id.toLowerCase().includes(q)
        )
    })

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString()
    }

    return (
        <div className="flex flex-col h-full bg-white text-black font-sans text-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-300 bg-gray-50">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-black">RFID Scan Logs</h2>
                        <p className="text-gray-600 text-sm">Real-time RFID scanning activity</p>
                    </div>
                    <Button onClick={loadLogs} variant="outline" size="sm" disabled={isLoading}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {isLoading ? "Loading..." : "Refresh"}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-gray-300 bg-gray-50 space-y-3">
                <div className="flex items-center gap-2">
                    <label className="font-bold text-xs w-20">Search:</label>
                    <div className="flex-1 flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                type="text"
                                className="pl-9 border-gray-400 h-8"
                                placeholder="Search by UID, item name, room, or scanner..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pl-[88px]">
                    <label className="flex items-center gap-1.5 text-xs select-none">
                        <input
                            type="radio"
                            name="status"
                            value="all"
                            checked={filterStatus === "all"}
                            onChange={(e) => setFilterStatus(e.target.value as "all")}
                            className="w-3.5 h-3.5"
                        />
                        All
                    </label>
                    <label className="flex items-center gap-1.5 text-xs select-none">
                        <input
                            type="radio"
                            name="status"
                            value="OK"
                            checked={filterStatus === "OK"}
                            onChange={(e) => setFilterStatus(e.target.value as "all" | "OK" | "UNKNOWN")}
                            className="w-3.5 h-3.5"
                        />
                        Found (OK)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs select-none">
                        <input
                            type="radio"
                            name="status"
                            value="UNKNOWN"
                            checked={filterStatus === "UNKNOWN"}
                            onChange={(e) => setFilterStatus(e.target.value as "all" | "OK" | "UNKNOWN")}
                            className="w-3.5 h-3.5"
                        />
                        Unknown
                    </label>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Summary Stats */}
            <div className="px-4 py-2 bg-white border-b border-gray-200 flex justify-between text-xs text-gray-600">
                <span>
                    Results: <span className="font-bold">{filteredLogs.length}</span> of{" "}
                    <span className="font-bold">{scanLogs.length}</span>
                </span>
                <span>
                    {scanLogs.filter((l) => l.scan_status === "OK").length} found,{" "}
                    {scanLogs.filter((l) => l.scan_status === "UNKNOWN").length} unknown
                </span>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto bg-white">
                {isLoading && scanLogs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Loading logs...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No scan logs found</div>
                ) : (
                    <table className="w-full border-collapse text-xs font-mono">
                        <thead className="bg-gray-200 sticky top-0 z-10">
                            <tr className="divide-x divide-gray-300 border-b border-gray-300">
                                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-[140px]">
                                    Scanned At
                                </th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700 min-w-[140px]">
                                    RFID UID
                                </th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-[100px]">
                                    Status
                                </th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-[120px]">
                                    Item Name
                                </th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-[100px]">
                                    Room
                                </th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-[100px]">
                                    Scanner ID
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-blue-50 divide-x divide-gray-200">
                                    <td className="px-3 py-1 whitespace-nowrap text-gray-600">
                                        {formatDate(log.scanned_at)}
                                    </td>
                                    <td className="px-3 py-1 whitespace-nowrap font-semibold text-gray-800">
                                        {log.rfid_uid}
                                    </td>
                                    <td className={`px-3 py-1 whitespace-nowrap font-bold ${
                                        log.scan_status === "OK"
                                            ? "text-green-700 bg-green-50"
                                            : "text-orange-700 bg-orange-50"
                                    }`}>
                                        {log.scan_status}
                                    </td>
                                    <td className="px-3 py-1 whitespace-nowrap max-w-[120px] truncate text-gray-800"
                                        title={log.item_name || "Unknown"}>
                                        {log.item_name || "—"}
                                    </td>
                                    <td className="px-3 py-1 whitespace-nowrap max-w-[100px] truncate text-gray-800"
                                        title={log.room || "Unknown"}>
                                        {log.room || "—"}
                                    </td>
                                    <td className="px-3 py-1 whitespace-nowrap text-gray-700">
                                        {log.scanner_id}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
