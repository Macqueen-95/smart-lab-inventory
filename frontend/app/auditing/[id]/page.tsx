"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { auditingAPI, authAPI } from "@/lib/api"
import { ArrowLeft, PlayCircle, FileText, CheckCircle2 } from "lucide-react"

const SCANNERS = ["LAB_EXIT_01"]

export default function AuditDetailPage() {
    const params = useParams()
    const router = useRouter()
    const auditId = Number(params?.id)

    const [audit, setAudit] = useState<any | null>(null)
    const [report, setReport] = useState<any | null>(null)
    const [scannerId, setScannerId] = useState(SCANNERS[0])
    const [isAdmin, setIsAdmin] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadAudit = async () => {
        const res = await auditingAPI.get(auditId)
        if (res.success && res.audit) setAudit(res.audit)
    }

    useEffect(() => {
        const init = async () => {
            const me = await authAPI.getMe()
            setIsAdmin(me.success && me.user?.userid === "admin")
            await loadAudit()
        }
        if (auditId) init()
    }, [auditId])

    const handleStart = async () => {
        setError(null)
        const res = await auditingAPI.start(auditId, scannerId)
        if (res.success) {
            await loadAudit()
        } else {
            setError(res.message || "Failed to start audit")
        }
    }

    const handleReport = async () => {
        setError(null)
        const res = await auditingAPI.report(auditId)
        if (res.success) {
            setReport(res.report)
        } else {
            setError(res.message || "Failed to generate report")
        }
    }

    const handleComplete = async () => {
        setError(null)
        const res = await auditingAPI.complete(auditId)
        if (res.success) {
            router.push("/auditing")
        } else {
            setError(res.message || "Failed to complete audit")
        }
    }

    if (!audit) {
        return (
            <div className="space-y-4">
                <p className="text-zinc-500">Loading audit...</p>
                <Link href="/auditing"><Button variant="outline">Back</Button></Link>
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
                    <h2 className="text-2xl font-bold tracking-tight">Audit #{audit.id}</h2>
                    <p className="text-zinc-500">{audit.room_name || "Unassigned room"} • {audit.floor_title || ""}</p>
                </div>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6 text-red-700 text-sm">{error}</CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Audit Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><span className="text-zinc-500">Scheduled:</span> {audit.scheduled_date}</div>
                    <div><span className="text-zinc-500">Assigned to:</span> {audit.assigned_name || audit.assigned_userid}</div>
                    <div><span className="text-zinc-500">Status:</span> {audit.status}</div>
                    <div><span className="text-zinc-500">Scanner:</span> {audit.scanner_id || "Not selected"}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Start Auditing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <select
                        className="w-full border rounded px-3 py-2"
                        value={scannerId}
                        onChange={(e) => setScannerId(e.target.value)}
                        disabled={audit.status !== "ASSIGNED"}
                    >
                        {SCANNERS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleStart} disabled={audit.status !== "ASSIGNED"}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Start Auditing
                        </Button>
                        <Button variant="outline" onClick={handleReport} disabled={!audit.started_at}>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Report
                        </Button>
                        {(isAdmin || audit.status === "IN_PROGRESS") && (
                            <Button variant="outline" onClick={handleComplete} disabled={audit.status === "COMPLETED"}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark Completed
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {report && (
                <Card>
                    <CardHeader>
                        <CardTitle>Audit Report</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div><span className="text-zinc-500">Expected</span><div className="font-semibold">{report.summary.total_expected}</div></div>
                            <div><span className="text-zinc-500">Scanned</span><div className="font-semibold">{report.summary.scanned}</div></div>
                            <div><span className="text-zinc-500">Missing</span><div className="font-semibold">{report.summary.missing}</div></div>
                            <div><span className="text-zinc-500">In Service</span><div className="font-semibold">{report.summary.in_service}</div></div>
                            <div><span className="text-zinc-500">Unexpected</span><div className="font-semibold">{report.summary.unexpected}</div></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <h4 className="font-medium mb-2">Missing Items</h4>
                                {report.missing_items.length === 0 && <p className="text-sm text-zinc-500">None</p>}
                                {report.missing_items.map((i: any) => (
                                    <div key={i.rfid_uid} className="text-sm border rounded p-2 mb-2">
                                        <div className="font-medium">{i.item_name}</div>
                                        <div className="text-xs text-zinc-500">{i.rfid_uid}</div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">Items Under Service</h4>
                                {report.in_service_items.length === 0 && <p className="text-sm text-zinc-500">None</p>}
                                {report.in_service_items.map((i: any) => (
                                    <div key={i.rfid_uid} className="text-sm border rounded p-2 mb-2">
                                        <div className="font-medium">{i.item_name}</div>
                                        <div className="text-xs text-zinc-500">{i.rfid_uid}</div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">Unexpected Items</h4>
                                {report.unexpected_items.length === 0 && <p className="text-sm text-zinc-500">None</p>}
                                {report.unexpected_items.map((i: any, idx: number) => (
                                    <div key={`${i.rfid_uid}-${idx}`} className="text-sm border rounded p-2 mb-2">
                                        <div className="font-medium">{i.rfid_uid}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
