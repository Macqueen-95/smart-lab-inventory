"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Package, Users, Activity, Router } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { itemsAPI, roomsAPI, rfidAPI, type RFIDScanLog } from "@/lib/api"

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

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      try {
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
