"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table } from "@/components/ui/Table"
import { Package, Calendar, AlertCircle } from "lucide-react"
import { serviceAPI, type ServiceRecord } from "@/lib/api"

export default function ServiceAndRepairPage() {
    const [outItems, setOutItems] = useState<ServiceRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadOutItems()
    }, [])

    const loadOutItems = async () => {
        try {
            const res = await serviceAPI.getOutItems()
            if (res.success) {
                setOutItems(res.items)
            }
        } catch (e) {
            setError("Failed to load items out for service")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Service & Repair</h2>
                <p className="text-zinc-500">Manage items sent out for service and repair.</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/serviceandrepair/outforservice">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-red-200 bg-red-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-4 bg-red-600 rounded-full">
                                    <Package className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-red-700">Out for Service</h3>
                                <p className="text-sm text-red-600">Send items out for service/repair</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/serviceandrepair/in">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200 bg-green-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="p-4 bg-green-600 rounded-full">
                                    <Package className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-green-700">In</h3>
                                <p className="text-sm text-green-600">Receive items back from service</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="p-4 bg-blue-600 rounded-full">
                                <Calendar className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-blue-700">Calendar</h3>
                            <p className="text-sm text-blue-600">View service schedule</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Items Out for Service Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Items Currently Out for Service</CardTitle>
                    <CardDescription>
                        {outItems.length} {outItems.length === 1 ? "item" : "items"} currently being serviced
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-center text-zinc-500 py-8">Loading...</p>
                    ) : error ? (
                        <div className="text-center text-red-600 py-8">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : outItems.length === 0 ? (
                        <p className="text-center text-zinc-500 py-8">No items currently out for service</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3 text-sm font-medium text-zinc-700">Out Date & Time</th>
                                        <th className="text-left p-3 text-sm font-medium text-zinc-700">Item Name</th>
                                        <th className="text-left p-3 text-sm font-medium text-zinc-700">Room</th>
                                        <th className="text-left p-3 text-sm font-medium text-zinc-700">Floor</th>
                                        <th className="text-left p-3 text-sm font-medium text-zinc-700">RFID UID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outItems.map((item) => (
                                        <tr key={item.id} className="border-b hover:bg-zinc-50">
                                            <td className="p-3 text-sm">
                                                <div>
                                                    <p className="font-medium">
                                                        {new Date(item.out_date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        {new Date(item.out_date).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm font-medium">{item.item_name}</td>
                                            <td className="p-3 text-sm text-zinc-600">{item.room_name}</td>
                                            <td className="p-3 text-sm text-zinc-600">{item.floor_title}</td>
                                            <td className="p-3">
                                                <code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                    {item.rfid_uid}
                                                </code>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
