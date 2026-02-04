import axios from 'axios'

// Backend API: local dev uses localhost; on Render use NEXT_PUBLIC_API_URL or fallback to Render backend
function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, "")
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`
}

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://cyber-forge-1.onrender.com/api'
  }
  return 'http://localhost:8000/api'
}

const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface RegisterData {
  name: string
  userid: string
  password: string
  confirm_password: string
}

export interface LoginData {
  userid: string
  password: string
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: {
    name: string
    userid: string
  }
}

export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/register', data)
      return response.data
    } catch (error: any) {
      // If we get a response with error data, return it
      if (error.response?.data) {
        return error.response.data
      }
      // Otherwise throw the error
      throw error
    }
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/login', data)
      return response.data
    } catch (error: any) {
      // If we get a response with error data, return it
      if (error.response?.data) {
        return error.response.data
      }
      // Otherwise throw the error
      throw error
    }
  },

  getMe: async (): Promise<AuthResponse> => {
    try {
      const response = await api.get<AuthResponse>('/user/me')
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  logout: async (): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/logout')
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  getUser: async (userid: string) => {
    const response = await api.get(`/user/${userid}`)
    return response.data
  },
}

// ---- Floor plans, rooms, items (backend DB) ----

export interface FloorPlan {
  id: number
  floor_title: string
  floor_description: string | null
  floor_url: string | null
  created_at: string
}

export interface Room {
  id: number
  room_name: string
  room_description: string | null
  floor_plan_id: number
  created_at: string
}

export interface InventoryItem {
  id: number
  item_name: string
  item_icon_url: string | null
  rfid_uid?: string | null
  room_id: number
  created_at: string
  last_scanned_at?: string | null
}

export interface Audit {
  id: number
  scheduled_date: string
  floor_plan_id?: number | null
  room_id?: number | null
  assigned_userid: string
  assigned_by: string
  status: string
  scanner_id?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at?: string | null
  room_name?: string | null
  floor_title?: string | null
  assigned_name?: string | null
}

export const floorPlansAPI = {
  list: async (): Promise<{ success: boolean; floor_plans: FloorPlan[] }> => {
    const res = await api.get<{ success: boolean; floor_plans: FloorPlan[] }>("/floor-plans")
    return res.data
  },
  create: async (data: {
    floor_title: string
    floor_description?: string
    floor_url?: string
  }) => {
    const res = await api.post<{ success: boolean; floor_plan: FloorPlan }>("/floor-plans", data)
    return res.data
  },
  get: async (planId: number) => {
    const res = await api.get<{ success: boolean; floor_plan: FloorPlan }>(`/floor-plans/${planId}`)
    return res.data
  },
  updateUrl: async (planId: number, floor_url: string) => {
    const res = await api.patch<{ success: boolean; floor_plan: FloorPlan }>(`/floor-plans/${planId}`, {
      floor_url,
    })
    return res.data
  },
  createRoom: async (planId: number, data: { room_name: string; room_description?: string }) => {
    const res = await api.post<{ success: boolean; room: Room }>(`/floor-plans/${planId}/rooms`, data)
    return res.data
  },
  listRooms: async (planId: number) => {
    const res = await api.get<{ success: boolean; rooms: Room[] }>(`/floor-plans/${planId}/rooms`)
    return res.data
  },
}

export const adminFloorPlansAPI = {
  listByUser: async (userid: string): Promise<{ success: boolean; floor_plans: FloorPlan[] }> => {
    const res = await api.get<{ success: boolean; floor_plans: FloorPlan[] }>("/admin/floor-plans", {
      params: { userid },
    })
    return res.data
  },
  listRoomsByUserPlan: async (userid: string, planId: number): Promise<{ success: boolean; rooms: Room[] }> => {
    const res = await api.get<{ success: boolean; rooms: Room[] }>(`/admin/floor-plans/${planId}/rooms`, {
      params: { userid },
    })
    return res.data
  },
}

export const roomsAPI = {
  list: async (): Promise<{ success: boolean; rooms: Room[] }> => {
    const res = await api.get<{ success: boolean; rooms: Room[] }>("/rooms")
    return res.data
  },
  create: async (data: {
    floor_plan_id: number
    room_name: string
    room_description?: string
  }): Promise<{ success: boolean; room?: Room; message?: string }> => {
    const res = await api.post<{ success: boolean; room?: Room; message?: string }>("/rooms", data)
    return res.data
  },
}

export const usersAPI = {
  list: async (): Promise<{ success: boolean; users: Array<{ id: number; name: string; userid: string }> }> => {
    const res = await api.get<{ success: boolean; users: Array<{ id: number; name: string; userid: string }> }>("/users")
    return res.data
  },
}

export const itemsAPI = {
  listByRoom: async (roomId: number) => {
    const res = await api.get<{ success: boolean; items: InventoryItem[] }>(`/rooms/${roomId}/items`)
    return res.data
  },
  create: async (
    roomId: number,
    data: { item_name: string; item_quantity?: number; item_icon_url?: string }
  ) => {
    const res = await api.post<{
      success: boolean
      item?: InventoryItem
      items?: InventoryItem[]
      count?: number
    }>(`/rooms/${roomId}/items`, data)
    return res.data
  },
  updateIcon: async (itemId: number, roomId: number, item_icon_url: string) => {
    const res = await api.patch<{ success: boolean; item: InventoryItem }>(`/items/${itemId}/icon`, {
      room_id: roomId,
      item_icon_url,
    })
    return res.data
  },
  assignRfid: async (itemId: number, rfid_uid: string) => {
    const res = await api.post<{ success: boolean; message: string; item?: InventoryItem }>(
      `/items/${itemId}/assign-rfid`,
      { rfid_uid }
    )
    return res.data
  },
}

// ---- RFID Management ----

export interface RFIDScanLog {
  id: number
  rfid_uid: string
  item_name: string | null
  room: string | null
  scanner_id: string
  scan_status: string
  scanned_at: string
}

export const rfidAPI = {
  scan: async (rfid_uid: string, scanner_id: string) => {
    const res = await api.post<{
      success: boolean
      status: string
      message: string
      item?: InventoryItem | null
      rfid_uid: string
    }>("/rfid/scan", { rfid_uid, scanner_id })
    return res.data
  },
  getScanLogs: async (limit: number = 100) => {
    const res = await api.get<{ success: boolean; logs: RFIDScanLog[] }>("/rfid/scan-logs", {
      params: { limit },
    })
    return res.data
  },
  getLatestUnassigned: async () => {
    const res = await api.get<{ success: boolean; rfid_uid?: string; scanned_at?: string }>("/rfid/latest-unassigned")
    return res.data
  },
  getLatestScan: async () => {
    const res = await api.get<{ success: boolean; rfid_uid?: string; scanned_at?: string }>("/rfid/latest-scan")
    return res.data
  },
}

// ---- Service & Repair Management ----

export interface ServiceRecord {
  id: number
  item_id: number
  rfid_uid: string
  item_name: string
  room_name: string
  floor_title: string
  out_date: string
  in_date?: string | null
  status: string
}

export const serviceAPI = {
  sendOut: async (rfid_uid: string) => {
    const res = await api.post<{ success: boolean; service_record?: ServiceRecord; message?: string }>(
      "/service/out",
      { rfid_uid }
    )
    return res.data
  },
  receiveIn: async (rfid_uid: string) => {
    const res = await api.post<{ success: boolean; message?: string }>("/service/in", { rfid_uid })
    return res.data
  },
  getOutItems: async () => {
    const res = await api.get<{ success: boolean; items: ServiceRecord[] }>("/service/out-items")
    return res.data
  },
  getHistory: async () => {
    const res = await api.get<{ success: boolean; history: ServiceRecord[] }>("/service/history")
    return res.data
  },
  getItemByRfid: async (rfid_uid: string) => {
    const res = await api.get<{
      success: boolean
      item?: {
        id: number
        item_name: string
        rfid_uid: string
        room_name: string
        floor_title: string
      }
    }>(`/service/item-by-rfid/${rfid_uid}`)
    return res.data
  },
}

export const auditingAPI = {
  list: async (date?: string): Promise<{ success: boolean; audits: Audit[] }> => {
    const res = await api.get<{ success: boolean; audits: Audit[] }>("/audits", {
      params: date ? { date } : undefined,
    })
    return res.data
  },
  get: async (auditId: number): Promise<{ success: boolean; audit?: Audit }> => {
    const res = await api.get<{ success: boolean; audit?: Audit }>(`/audits/${auditId}`)
    return res.data
  },
  create: async (data: {
    scheduled_date: string
    floor_plan_id?: number | null
    room_id?: number | null
    assigned_userid: string
  }): Promise<{ success: boolean; audit?: Audit; message?: string }> => {
    const res = await api.post<{ success: boolean; audit?: Audit; message?: string }>("/audits", data)
    return res.data
  },
  start: async (auditId: number, scanner_id: string): Promise<{ success: boolean; audit?: Audit; message?: string }> => {
    const res = await api.post<{ success: boolean; audit?: Audit; message?: string }>(`/audits/${auditId}/start`, {
      scanner_id,
    })
    return res.data
  },
  complete: async (auditId: number): Promise<{ success: boolean; audit?: Audit; message?: string }> => {
    const res = await api.post<{ success: boolean; audit?: Audit; message?: string }>(`/audits/${auditId}/complete`)
    return res.data
  },
  report: async (auditId: number): Promise<{ success: boolean; report?: any; message?: string }> => {
    const res = await api.get<{ success: boolean; report?: any; message?: string }>(`/audits/${auditId}/report`)
    return res.data
  },
  items: async (auditId: number): Promise<{ success: boolean; items?: any[]; summary?: any; audit?: any; message?: string }> => {
    const res = await api.get<{ success: boolean; items?: any[]; summary?: any; audit?: any; message?: string }>(`/audits/${auditId}/items`)
    return res.data
  },
}

/** Upload a file to Vercel Blob via our API route. Returns the public URL. Call from client only. */
export async function uploadToBlob(file: File, prefix: "floor" | "icon" | "upload" = "upload"): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("prefix", prefix)
  const res = await fetch("/api/upload", { method: "POST", body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Upload failed")
  }
  const data = await res.json()
  return data.url
}

export default api
