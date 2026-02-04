"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { auditingAPI, authAPI } from "@/lib/api"
import { ChevronLeft, ChevronRight, CalendarCheck, ClipboardCheck } from "lucide-react"

const getMonthLabel = (date: Date) =>
    date.toLocaleDateString(undefined, { month: "long", year: "numeric" })

const formatDate = (date: Date) => date.toISOString().slice(0, 10)

const buildCalendarDays = (monthDate: Date) => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay()
    const days = []

    for (let i = 0; i < startWeekday; i += 1) {
        days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
        days.push(new Date(year, month, d))
    }
    return days
}

export default function AuditingPage() {
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()))
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [auditsForDate, setAuditsForDate] = useState<any[]>([])
    const [pendingAudits, setPendingAudits] = useState<any[]>([])
    const [isAdmin, setIsAdmin] = useState(false)

    const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth])

    const loadAudits = async (date: string) => {
        const result = await auditingAPI.list(date)
        if (result.success) setAuditsForDate(result.audits)
    }

    const loadPending = async () => {
        const result = await auditingAPI.list()
        if (result.success) {
            setPendingAudits(result.audits.filter(a => a.status !== "COMPLETED"))
        }
    }

    useEffect(() => {
        const init = async () => {
            const me = await authAPI.getMe()
            setIsAdmin(me.success && me.user?.userid === "admin")
            await loadAudits(selectedDate)
            await loadPending()
        }
        init()
    }, [])

    useEffect(() => {
        loadAudits(selectedDate)
    }, [selectedDate])

    const handleSelectDate = (date: Date | null) => {
        if (!date) return
        setSelectedDate(formatDate(date))
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Auditing</h2>
                    <p className="text-zinc-500">Track scheduled audits and manage assignments.</p>
                </div>
                {isAdmin && (
                    <Button className="bg-black text-white hover:bg-zinc-800" onClick={() => router.push("/createaudit")}
                    >
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Assign Audits
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <CalendarCheck className="h-5 w-5" />
                            {getMonthLabel(currentMonth)}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-2 text-center text-xs text-zinc-500 mb-2">
                            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                                <span key={d}>{d}</span>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {days.map((day, idx) => {
                                const isSelected = day ? formatDate(day) === selectedDate : false
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectDate(day)}
                                        className={
                                            "h-12 rounded border text-sm " +
                                            (day ? "bg-white hover:bg-zinc-50" : "bg-transparent border-transparent cursor-default") +
                                            (isSelected ? " border-black text-black" : " border-zinc-200 text-zinc-700")
                                        }
                                        disabled={!day}
                                    >
                                        {day ? day.getDate() : ""}
                                    </button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Audits on {selectedDate}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {auditsForDate.length === 0 && (
                                <p className="text-sm text-zinc-500">No audits scheduled for this date.</p>
                            )}
                            {auditsForDate.map((audit) => (
                                <Link
                                    key={audit.id}
                                    href={`/auditing/${audit.id}`}
                                    className="block border rounded p-3 hover:bg-zinc-50"
                                >
                                    <div className="font-medium">{audit.room_name || "Unassigned room"}</div>
                                    <div className="text-xs text-zinc-500">{audit.floor_title || ""}</div>
                                    <div className="text-xs mt-1 text-zinc-600">Status: {audit.status}</div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>My Pending Audits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pendingAudits.length === 0 && (
                                <p className="text-sm text-zinc-500">No pending audits assigned.</p>
                            )}
                            {pendingAudits.map((audit) => (
                                <Link
                                    key={audit.id}
                                    href={`/auditing/${audit.id}`}
                                    className="block border rounded p-3 hover:bg-zinc-50"
                                >
                                    <div className="font-medium">{audit.room_name || "Unassigned room"}</div>
                                    <div className="text-xs text-zinc-500">{audit.floor_title || ""}</div>
                                    <div className="text-xs mt-1 text-zinc-600">Due: {audit.scheduled_date}</div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
