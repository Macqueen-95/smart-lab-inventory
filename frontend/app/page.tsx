"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Package, Users, Activity, Router, Bell, Calendar } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { itemsAPI, roomsAPI, rfidAPI, periodicAuditAPI, authAPI, type RFIDScanLog } from "@/lib/api"
import Link from "next/link"

export default function Home() {
  const [roomData, setRoomData] = useState<Array<{ name: string; total: number }>>([])
  const [recentLogs, setRecentLogs] = useState<RFIDScanLog[]>([])
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeScanners: 0,
    recentActivity: 0,
    totalRooms: 0,
  })
  const [loading, setLoading] = useState(true)
  const [todayScans, setTodayScans] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      try {
        // Check if admin
        const me = await authAPI.getMe()
        const admin = me.success && me.user?.userid === "admin"
        setIsAdmin(admin)

        const roomsRes = await roomsAPI.list()
        const rooms = roomsRes.success ? roomsRes.rooms : []

        const roomTotals = await Promise.all(
          rooms.map(async (room) => {
            const itemsRes = await itemsAPI.listByRoom(room.id)
            const count = itemsRes.success ? itemsRes.items.length : 0
            return { name: room.room_name, total: count }
          })
        )

        const totalAssets = roomTotals.reduce((sum, r) => sum + r.total, 0)
        setRoomData(roomTotals)

        const logsRes = await rfidAPI.getScanLogs(100)
        const logs = logsRes.success ? logsRes.logs : []
        const now = Date.now()
        const lastHourLogs = logs.filter((log) => {
          const t = new Date(log.scanned_at).getTime()
          return now - t <= 60 * 60 * 1000
        })
        const activeScanners = new Set(lastHourLogs.map((l) => l.scanner_id)).size

        setRecentLogs(logs.slice(0, 5))
        setStats({
          totalAssets,
          activeScanners,
          recentActivity: lastHourLogs.length,
          totalRooms: rooms.length,
        })

        // Load all assigned periodic scans (for admin)
        if (admin) {
          try {
            const periodicRes = await periodicAuditAPI.list()
            if (periodicRes.success && periodicRes.audits) {
              // Show all active periodic scans, not just today's
              const allScans = periodicRes.audits.filter((audit: any) => audit.is_active)
              setTodayScans(allScans)
            }
          } catch (e) {
            console.error("Failed to load periodic audits:", e)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Overview of your smart campus inventory.</p>
      </div>

      {/* Notice Section - Assigned Periodic Scans */}
      {isAdmin && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Assigned Periodic Scans
            </CardTitle>
            <CardDescription>
              {todayScans.length === 0 
                ? "No periodic scans configured"
                : `${todayScans.length} ${todayScans.length === 1 ? "active periodic scan" : "active periodic scans"} configured`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayScans.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-zinc-500 mb-2">No periodic scans assigned yet.</p>
                <Link href="/periodic-audit">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium underline">
                    Create periodic scan →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayScans.map((scan: any) => {
                  const today = new Date().toISOString().split('T')[0]
                  const isToday = scan.next_audit_date === today
                  return (
                    <div key={scan.id} className={`flex items-center justify-between p-3 bg-white rounded-lg border ${isToday ? "border-blue-400 bg-blue-50" : "border-blue-200"}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-900">{scan.room_name}</p>
                          {isToday && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Today</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-600">
                          Scanner: <span className="font-mono">{scan.scanner_id}</span>
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Next scan: <span className="font-medium">{scan.next_audit_date}</span>
                        </p>
                        {scan.note && (
                          <p className="text-xs text-zinc-500 mt-1">{scan.note}</p>
                        )}
                      </div>
                      <Link href="/auditing">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          View →
                        </button>
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : stats.totalAssets}</div>
            <p className="text-xs text-zinc-500">Tagged items across rooms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Scanners</CardTitle>
            <Router className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : stats.activeScanners}</div>
            <p className="text-xs text-zinc-500">Active in the last hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : stats.recentActivity}</div>
            <p className="text-xs text-zinc-500">Scans in the last hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : stats.totalRooms}</div>
            <p className="text-xs text-zinc-500">Monitored spaces</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Asset Distribution</CardTitle>
            <CardDescription>
              Number of tagged assets per room.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roomData}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#333', border: 'none', borderRadius: '4px', color: '#fff' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar
                    dataKey="total"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-zinc-900 dark:fill-zinc-50"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
            <CardDescription>
              Latest RFID scans across the campus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentLogs.length === 0 && (
                <p className="text-sm text-zinc-500">No recent scans.</p>
              )}
              {recentLogs.map((log) => (
                <div className="flex items-center" key={log.id}>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{log.room || "Unknown Room"}</p>
                    <p className="text-xs text-zinc-500 text-muted-foreground">
                      {log.item_name || log.rfid_uid} Detected
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-xs text-zinc-500">
                    {new Date(log.scanned_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
