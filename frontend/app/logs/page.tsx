"use client"

import { useState } from "react"
import { Search, RotateCcw, Monitor, FileText, Bell, Network } from "lucide-react"

// Mock Data matching the legacy format
const legacyLogs = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    date: "Thu Jan 13 08:39:07 PST 2011",
    source: `managed_pn_0_${i % 5}`,
    severity: i % 3 === 0 ? "WARN" : i % 5 === 0 ? "ERROR" : "INFO",
    message: `Client timer task failed with fatal status ----- Throwable: ----- java.lang.NullPointerException at oracle.axia.wcp.sip.engine.server.SipSessionImpl.receiveFinalResponse(SipSessionImpl.java:1067)`
}))

export default function LogsPage() {
    const [activeTab, setActiveTab] = useState("Log")

    return (
        <div className="flex flex-col h-full bg-white text-black font-sans text-sm">
            {/* Legacy Toolbar / Tabs */}
            <div className="flex items-end border-b border-gray-400 bg-gradient-to-b from-white to-gray-100 px-2 pt-2 gap-1">
                {[
                    { name: "System", icon: Monitor },
                    { name: "Log", icon: FileText },
                    { name: "Alarms", icon: Bell },
                    { name: "Network Configuration", icon: Network },
                ].map((tab) => (
                    <button
                        key={tab.name}
                        onClick={() => setActiveTab(tab.name)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md border-t border-l border-r border-gray-400 text-xs font-medium relative top-[1px] ${activeTab === tab.name
                                ? "bg-white z-10 font-bold"
                                : "bg-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Filter Area */}
            <div className="p-3 border-b border-gray-300 bg-[#f0f0f0] space-y-3">
                <div className="flex items-center gap-2">
                    <label className="font-bold text-xs w-14">Search:</label>
                    <div className="flex-1 flex gap-2">
                        <input
                            type="text"
                            className="flex-1 border border-gray-400 p-1 px-2 text-sm bg-white focus:outline-none focus:border-blue-500 h-7"
                        />
                        <button className="px-4 py-0.5 border border-gray-400 bg-gray-100 hover:bg-gray-200 text-xs shadow-sm active:translate-y-[1px]">
                            Update
                        </button>
                    </div>
                </div>

                <div className="flex gap-6 pl-[64px]">
                    {[
                        "Case sensitive",
                        "Exact search",
                        'Allow wildcards ("*" and "?") in search',
                        "Run search continuously"
                    ].map((label) => (
                        <label key={label} className="flex items-center gap-1.5 text-xs select-none">
                            <input type="checkbox" className="w-3.5 h-3.5 border-gray-400 rounded-none" />
                            {label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Pagination / Status Bar */}
            <div className="flex justify-end gap-2 px-4 py-1 text-xs text-blue-700 bg-white border-b border-gray-200">
                <span className="text-gray-500 hover:underline cursor-pointer">previous</span>
                <span className="text-black font-medium">Results 1 of 100</span>
                <span className="hover:underline cursor-pointer">next</span>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto bg-white">
                <table className="w-full border-collapse text-xs font-mono">
                    <thead className="bg-[#e0e0e0] sticky top-0 z-10">
                        <tr className="divide-x divide-gray-300 border-b border-gray-300">
                            {[
                                { title: "Date", w: "min-w-[180px]" },
                                { title: "Source", w: "w-[120px]" },
                                { title: "Severity", w: "w-[80px]" },
                                { title: "Message", w: "w-auto" }
                            ].map((col) => (
                                <th key={col.title} className={`text-left px-2 py-1 font-semibold text-gray-700 ${col.w} select-none active:bg-gray-300`}>
                                    {col.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {legacyLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-blue-50 divide-x divide-gray-200">
                                <td className="px-2 py-0.5 whitespace-nowrap text-gray-600">{log.date}</td>
                                <td className="px-2 py-0.5 whitespace-nowrap">{log.source}</td>
                                <td className={`px-2 py-0.5 whitespace-nowrap font-bold ${log.severity === 'ERROR' ? 'text-red-700' :
                                        log.severity === 'WARN' ? 'text-orange-700' : 'text-blue-700'
                                    }`}>{log.severity}</td>
                                <td className="px-2 py-0.5 whitespace-nowrap max-w-0 truncate text-gray-800" title={log.message}>
                                    {log.message}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Scrollbar Mock (Optional visual cue if needed, but browser default is fine) */}
        </div>
    )
}
