"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { auditingAPI, authAPI, adminFloorPlansAPI, usersAPI } from "@/lib/api"
import { ArrowLeft, CalendarCheck, Search, UserPlus } from "lucide-react"

const formatDate = (date: Date) => date.toISOString().slice(0, 10)

export default function CreateAuditPage() {
    const router = useRouter()
    const [isAdmin, setIsAdmin] = useState(false)
    const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
    const [floorPlans, setFloorPlans] = useState<any[]>([])
    const [rooms, setRooms] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [selectedPlan, setSelectedPlan] = useState<number | "">("")
    const [selectedRoom, setSelectedRoom] = useState<number | "">("")
    const [selectedUser, setSelectedUser] = useState<string>("")
    const [search, setSearch] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            const me = await authAPI.getMe()
            const admin = me.success && me.user?.userid === "admin"
            setIsAdmin(admin)
            if (!admin) return

            const usersRes = await usersAPI.list()
            if (usersRes.success) setUsers(usersRes.users)
        }
        init()
    }, [])

    useEffect(() => {
        const loadPlans = async () => {
            if (!selectedUser) {
                setFloorPlans([])
                setRooms([])
                setSelectedPlan("")
                setSelectedRoom("")
                return
            }
            const res = await adminFloorPlansAPI.listByUser(selectedUser)
            if (res.success) setFloorPlans(res.floor_plans)
        }
        loadPlans()
    }, [selectedUser])

    useEffect(() => {
        const loadRooms = async () => {
            if (!selectedUser || !selectedPlan) {
                setRooms([])
                setSelectedRoom("")
                return
            }
            const res = await adminFloorPlansAPI.listRoomsByUserPlan(selectedUser, Number(selectedPlan))
            if (res.success) setRooms(res.rooms)
        }
        loadRooms()
    }, [selectedUser, selectedPlan])

    const filteredUsers = useMemo(() => {
        if (!search) return users
        const s = search.toLowerCase()
        return users.filter((u: any) => u.name.toLowerCase().includes(s) || u.userid.toLowerCase().includes(s))
    }, [search, users])

    const handleCreate = async () => {
        setError(null)
        setSuccess(null)

        if (!selectedDate || !selectedRoom || !selectedUser) {
            setError("Please select date, room, and user")
            return
        }

        const res = await auditingAPI.create({
            scheduled_date: selectedDate,
            floor_plan_id: Number(selectedPlan) || null,
            room_id: Number(selectedRoom),
            assigned_userid: selectedUser,
        })

        if (res.success) {
            setSuccess("Audit assigned successfully")
            setTimeout(() => router.push("/auditing"), 1000)
        } else {
            setError(res.message || "Failed to create audit")
        }
    }

    if (!isAdmin) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">Create Audit</h2>
                <p className="text-zinc-500">Only admin can assign audits.</p>
                <Link href="/auditing">
                    <Button variant="outline">Back to Auditing</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Link href="/auditing">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Create Audit</h2>
                    <p className="text-zinc-500">Assign auditing tasks to a user.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarCheck className="h-5 w-5" />
                            Select Date
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Assign User
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-zinc-500" />
                            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="max-h-52 overflow-y-auto border rounded">
                            {filteredUsers.map((u: any) => (
                                <button
                                    key={u.userid}
                                    onClick={() => setSelectedUser(u.userid)}
                                    className={
                                        "w-full text-left px-3 py-2 text-sm border-b last:border-b-0 " +
                                        (selectedUser === u.userid ? "bg-black text-white" : "hover:bg-zinc-50")
                                    }
                                >
                                    {u.name} ({u.userid})
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Floor Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value ? Number(e.target.value) : "")}
                            disabled={!selectedUser}
                        >
                            <option value="">Select a floor plan</option>
                            {floorPlans.map((plan: any) => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.floor_title}
                                </option>
                            ))}
                        </select>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Room</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value ? Number(e.target.value) : "")}
                            disabled={!selectedUser || !selectedPlan}
                        >
                            <option value="">Select a room</option>
                            {rooms.map((room: any) => (
                                <option key={room.id} value={room.id}>
                                    {room.room_name}
                                </option>
                            ))}
                        </select>
                    </CardContent>
                </Card>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6 text-red-700 text-sm">{error}</CardContent>
                </Card>
            )}

            {success && (
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6 text-green-700 text-sm">{success}</CardContent>
                </Card>
            )}

            <div>
                <Button className="bg-black text-white hover:bg-zinc-800" onClick={handleCreate}>
                    Assign Audit
                </Button>
            </div>
        </div>
    )
}
