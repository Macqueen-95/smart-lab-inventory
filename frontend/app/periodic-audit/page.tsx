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

const INTERVAL_OPTIONS = [
  { value: "24h", label: "Every 24 Hours" },
  { value: "2d", label: "Every 2 Days" },
  { value: "5d", label: "Every 5 Days" },
]

export default function PeriodicAuditPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [floorPlans, setFloorPlans] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedPlan, setSelectedPlan] = useState<number | "">("")
  const [selectedRoom, setSelectedRoom] = useState<number | "">("")
  const [selectedScanner, setSelectedScanner] = useState<string>("")
  const [selectedInterval, setSelectedInterval] = useState<string>("24h")
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

    if (!selectedRoom || !selectedScanner || !selectedInterval) {
      setError("Please select room, scanner, and interval")
      return
    }

    setLoading(true)
    const res = await periodicAuditAPI.create({
      floor_plan_id: selectedPlan ? Number(selectedPlan) : null,
      room_id: Number(selectedRoom),
      scanner_id: selectedScanner,
      interval_type: selectedInterval,
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Scan Interval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
            >
              {INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
