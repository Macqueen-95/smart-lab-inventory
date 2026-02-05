"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { auditingAPI, authAPI, periodicAuditAPI } from "@/lib/api"
import { ChevronLeft, ChevronRight, CalendarCheck, ClipboardCheck, Zap, X } from "lucide-react"

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
    const [monthAudits, setMonthAudits] = useState<any[]>([])
    const [periodicAudits, setPeriodicAudits] = useState<any[]>([])
    const [isAdmin, setIsAdmin] = useState(false)

    const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth])

    // Map of dates that have audits with status breakdown
    const auditDateMap = useMemo(() => {
        const map = new Map<string, { total: number; pending: number; ongoing: number; completed: number }>()
        monthAudits.forEach(audit => {
            const dateStr = audit.scheduled_date
            const current = map.get(dateStr) || { total: 0, pending: 0, ongoing: 0, completed: 0 }
            current.total += 1
            if (audit.status === "ASSIGNED" || audit.status === "PENDING") {
                current.pending += 1
            } else if (audit.status === "IN_PROGRESS") {
                current.ongoing += 1
            } else if (audit.status === "COMPLETED") {
                current.completed += 1
            }
            map.set(dateStr, current)
        })
        return map
    }, [monthAudits])

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

    const loadMonthAudits = async () => {
        // Load all audits - backend filters by user if not admin
        const result = await auditingAPI.list()
        if (result.success) {
            // Filter audits that fall within the current month
            const year = currentMonth.getFullYear()
            const month = currentMonth.getMonth()
            const filtered = result.audits.filter((audit: any) => {
                const auditDate = new Date(audit.scheduled_date)
                return auditDate.getFullYear() === year && auditDate.getMonth() === month
            })
            setMonthAudits(filtered)
        }
    }

    const loadPeriodicAudits = async () => {
        if (!isAdmin) return
        const result = await periodicAuditAPI.list()
        if (result.success) {
            setPeriodicAudits(result.audits || [])
        }
    }

    const handleDeactivatePeriodicAudit = async (auditId: number) => {
        const result = await periodicAuditAPI.deactivate(auditId)
        if (result.success) {
            await loadPeriodicAudits()
        }
    }

    useEffect(() => {
        const init = async () => {
            const me = await authAPI.getMe()
            const admin = me.success && me.user?.userid === "admin"
            setIsAdmin(admin)
            await loadAudits(selectedDate)
            await loadPending()
            await loadMonthAudits()
            if (admin) {
                await loadPeriodicAudits()
            }
        }
        init()
    }, [])

    useEffect(() => {
        loadAudits(selectedDate)
    }, [selectedDate])

    useEffect(() => {
        loadMonthAudits()
    }, [currentMonth])

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
                                const dateStr = day ? formatDate(day) : ""
                                const auditInfo = auditDateMap.get(dateStr) || { total: 0, pending: 0, ongoing: 0, completed: 0 }
                                const hasAudits = auditInfo.total > 0
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectDate(day)}
                                        className={
                                            "h-20 rounded border text-sm relative flex flex-col items-center justify-center p-1 " +
                                            (day ? "bg-white hover:bg-zinc-50" : "bg-transparent border-transparent cursor-default") +
                                            (isSelected ? " border-black ring-2 ring-black" : " border-zinc-200") +
                                            (hasAudits && !isSelected ? " bg-zinc-50" : "")
                                        }
                                        disabled={!day}
                                    >
                                        {day && (
                                            <>
                                                <span className={hasAudits ? "text-zinc-900 font-semibold" : "text-zinc-700"}>
                                                    {day.getDate()}
                                                </span>
                                                {hasAudits && (
                                                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                                                        {auditInfo.pending > 0 && (
                                                            <span className="text-[8px] bg-yellow-100 text-yellow-800 px-1 rounded" title={`${auditInfo.pending} pending`}>
                                                                {auditInfo.pending}
                                                            </span>
                                                        )}
                                                        {auditInfo.ongoing > 0 && (
                                                            <span className="text-[8px] bg-blue-100 text-blue-800 px-1 rounded" title={`${auditInfo.ongoing} ongoing`}>
                                                                {auditInfo.ongoing}
                                                            </span>
                                                        )}
                                                        {auditInfo.completed > 0 && (
                                                            <span className="text-[8px] bg-green-100 text-green-800 px-1 rounded" title={`${auditInfo.completed} completed`}>
                                                                {auditInfo.completed}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
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

            {isAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Active Periodic Scans
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {periodicAudits.length === 0 && (
                            <p className="text-sm text-zinc-500">No periodic audits configured. 
                                <Link href="/periodic-audit" className="text-blue-600 hover:underline ml-1">Create one</Link>
                            </p>
                        )}
                        {periodicAudits.length > 0 && (
                            <div className="space-y-3">
                                {periodicAudits.map((audit) => (
                                    <div key={audit.id} className="border rounded p-4 bg-yellow-50 border-yellow-200">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-yellow-900">{audit.room_name}</div>
                                                <div className="text-xs text-yellow-700 mt-1">
                                                    Scanner: <span className="font-mono">{audit.scanner_id}</span>
                                                </div>
                                                <div className="text-xs text-yellow-700">
                                                    Interval: 
                                                    {audit.interval_type === "24h" && " Every 24 Hours"}
                                                    {audit.interval_type === "2d" && " Every 2 Days"}
                                                    {audit.interval_type === "5d" && " Every 5 Days"}
                                                </div>
                                                {audit.note && (
                                                    <div className="text-xs text-yellow-700 mt-1">Note: {audit.note}</div>
                                                )}
                                                <div className="text-xs text-yellow-600 mt-2">
                                                    Next scan: <span className="font-medium">{audit.next_audit_date}</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeactivatePeriodicAudit(audit.id)}
                                                className="text-yellow-700 hover:text-red-700"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
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
