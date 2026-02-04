import axios from 'axios'

// Backend API: local dev uses localhost; on Render use NEXT_PUBLIC_API_URL or fallback to Render backend
function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
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
  item_count: number
  item_icon_url: string | null
  rfid_uid?: string | null
  room_id: number
  created_at: string
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

export const roomsAPI = {
  list: async (): Promise<{ success: boolean; rooms: Room[] }> => {
    const res = await api.get<{ success: boolean; rooms: Room[] }>("/rooms")
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
    data: { item_name: string; item_count?: number; item_icon_url?: string }
  ) => {
    const res = await api.post<{ success: boolean; item: InventoryItem }>(`/rooms/${roomId}/items`, data)
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
