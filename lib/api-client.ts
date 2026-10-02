"use client"

import { getValidToken } from "@/lib/token-utils"

interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  message?: string
  error?: string
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  // Read the token fresh on every request so it is never stale after login/logout
  private get token(): string | null {
    return typeof window !== "undefined" ? getValidToken() : null
  }

  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("authToken", JSON.stringify({ token, expiresAt: Date.now() + 60 * 60 * 24 * 7 * 1000 }))
    }
  }

  removeToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken")
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Check if the response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        // Handle non-JSON response
        const text = await response.text()
        console.error("Non-JSON response:", text.substring(0, 100) + "...")
        throw new Error("Server returned non-JSON response. Please check authentication or endpoint URL.")
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      }
    } catch (error) {
      console.error("API request failed:", error)
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }

  // File upload method
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append("file", file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const headers: HeadersInit = {}
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      }
    } catch (error) {
      console.error("File upload failed:", error)
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
