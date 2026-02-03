import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

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

export default api
