"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { periodicAuditAPI, authAPI, adminFloorPlansAPI } from "@/lib/api"
import { ArrowLeft, CalendarCheck, Zap } from "lucide-react"

const DUMMY_SCANNERS = [
  { id: "SCANNER_01", name: "Main Floor Scanner" },
  { id: "SCANNER_02", name: "Storage Room Scanner" },
  { id: "SCANNER_03", name: "Archive Scanner" },
  { id: "SCANNER_04", name: "Warehouse Scanner" },
  { id: "SCANNER_05", name: "Lab Scanner" },
]

// Interval configuration with flexible units
const INTERVAL_UNITS = {
  hours: [1, 2, 4, 6, 8, 12, 24],
  days: [1, 2, 3, 5, 7, 14, 30],
  months: [1, 2, 3, 6, 12],
}

// Map to backend format (24h, 2d, 5d) - backend needs to support more
// For now, we'll convert to closest supported value
const convertToBackendInterval = (value: number, unit: string): string => {
  if (unit === "hours") {
    if (value <= 24) return "24h"
    return "24h" // Default to 24h for hours > 24
  }
  if (unit === "days") {
    if (value <= 2) return "2d"
    if (value <= 5) return "5d"
    return "5d" // Default to 5d
  }
  if (unit === "months") {
    // Convert months to days (approximate)
    const days = value * 30
    if (days <= 2) return "2d"
    if (days <= 5) return "5d"
    return "5d"
  }
  return "24h"
}

export default function PeriodicAuditPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [floorPlans, setFloorPlans] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedPlan, setSelectedPlan] = useState<number | "">("")
  const [selectedRoom, setSelectedRoom] = useState<number | "">("")
  const [selectedScanner, setSelectedScanner] = useState<string>("")
  const [intervalValue, setIntervalValue] = useState<number>(24)
  const [intervalUnit, setIntervalUnit] = useState<"hours" | "days" | "months">("hours")
  const [note, setNote] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Load admin data on mount
  useEffect(() => {
    const init = async () => {
      const me = await authAPI.getMe()
      const admin = me.success && me.user?.userid === "admin"
      setIsAdmin(admin)
      if (!admin) return

      // Load floor plans for admin user
      const plansRes = await adminFloorPlansAPI.listAll()
      if (plansRes.success) {
        setFloorPlans(plansRes.floor_plans || [])
      }
    }
    init()
  }, [])

  // Load rooms when floor plan is selected
  useEffect(() => {
    const loadRooms = async () => {
      if (!selectedPlan) {
        setRooms([])
        setSelectedRoom("")
        return
      }
      const res = await adminFloorPlansAPI.listRoomsById(Number(selectedPlan))
      if (res.success) setRooms(res.rooms)
    }
    loadRooms()
  }, [selectedPlan])

  const handleCreate = async () => {
    setError(null)
    setSuccess(null)

    if (!selectedRoom || !selectedScanner || !intervalValue) {
      setError("Please select room, scanner, and interval")
      return
    }

    const backendInterval = convertToBackendInterval(intervalValue, intervalUnit)

    setLoading(true)
    const res = await periodicAuditAPI.create({
      floor_plan_id: selectedPlan ? Number(selectedPlan) : null,
      room_id: Number(selectedRoom),
      scanner_id: selectedScanner,
      interval_type: backendInterval,
      note: note || undefined,
    })

    setLoading(false)

    if (res.success) {
      setSuccess("Periodic audit created successfully!")
      setTimeout(() => router.push("/auditing"), 1500)
    } else {
      setError(res.message || "Failed to create periodic audit")
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Periodic Audits</h2>
        <p className="text-zinc-500">Only admin can create periodic audits.</p>
        <Link href="/auditing">
          <Button variant="outline">Back to Auditing</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/createaudit">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Periodic Audit</h2>
          <p className="text-zinc-500">Setup automated scanning at regular intervals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Select Floor Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedPlan}
              onChange={(e) => {
                setSelectedPlan(e.target.value ? Number(e.target.value) : "")
                setSelectedRoom("")
              }}
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
              disabled={!selectedPlan}
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

        <Card>
          <CardHeader>
            <CardTitle>Select Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedScanner}
              onChange={(e) => setSelectedScanner(e.target.value)}
            >
              <option value="">Select a scanner</option>
              {DUMMY_SCANNERS.map((scanner) => (
                <option key={scanner.id} value={scanner.id}>
                  {scanner.name} ({scanner.id})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Scan Interval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-700 mb-1 block">Interval Value</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(Number(e.target.value))}
                >
                  {INTERVAL_UNITS[intervalUnit].map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-700 mb-1 block">Unit</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={intervalUnit}
                  onChange={(e) => {
                    const newUnit = e.target.value as "hours" | "days" | "months"
                    setIntervalUnit(newUnit)
                    // Reset to first available value for the new unit
                    setIntervalValue(INTERVAL_UNITS[newUnit][0])
                  }}
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-zinc-700 mb-1 block">Preview</label>
                <div className="border rounded px-3 py-2 bg-zinc-50 text-sm">
                  Every {intervalValue} {intervalUnit === "hours" ? (intervalValue === 1 ? "hour" : "hours") : intervalUnit === "days" ? (intervalValue === 1 ? "day" : "days") : (intervalValue === 1 ? "month" : "months")}
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Note: Backend currently supports 24h, 2d, and 5d intervals. Your selection will be mapped to the closest supported value.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Additional Notes (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter any notes for this periodic audit..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full"
            />
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

      <div className="flex gap-3">
        <Button 
          className="bg-black text-white hover:bg-zinc-800"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Periodic Audit"}
        </Button>
        <Link href="/createaudit">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>
    </div>
  )
}
