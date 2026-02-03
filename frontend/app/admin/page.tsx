"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Plus, Package, Settings } from "lucide-react"

export default function AdminPage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Admin Console</h2>
                <p className="text-zinc-500">Manage rooms and inventory items.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Link href="/admin/add-room">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Plus className="h-6 w-6 text-blue-600" />
                                </div>
                                <CardTitle>Add Room</CardTitle>
                            </div>
                            <CardDescription>
                                Create a new room with details, location, and initial inventory items.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full bg-white text-black border border-zinc-300 hover:bg-zinc-50">Add New Room</Button>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/admin/manage-items">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Package className="h-6 w-6 text-green-600" />
                                </div>
                                <CardTitle>Manage Items</CardTitle>
                            </div>
                            <CardDescription>
                                Add, update, rename, or delete items across all rooms.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full bg-white text-black border border-zinc-300 hover:bg-zinc-50">Manage Items</Button>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 rounded-lg">
                            <Settings className="h-5 w-5 text-zinc-600" />
                        </div>
                        <div>
                            <CardTitle>System Settings</CardTitle>
                            <CardDescription>Additional features coming soon</CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    )
}
