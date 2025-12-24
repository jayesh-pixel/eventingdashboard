"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { getMockData } from "@/lib/mock-data"

// Set this to true to use mock data instead of real API calls
const USE_MOCK_DATA = false

interface UseApiOptions {
  immediate?: boolean
}

export function useApi<T>(endpoint: string, options: UseApiOptions = { immediate: true }) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      if (USE_MOCK_DATA) {
        // Use mock data in development
        const mockData = getMockData(endpoint)
        setData(mockData as T)
        setLoading(false)
        return
      }

      const response = await apiClient.get<T>(endpoint)

      if (response.success) {
        setData(response.data)
      } else {
        setError(response.error || "Failed to fetch data")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const refetch = () => {
    fetchData()
  }

  useEffect(() => {
    if (options.immediate) {
      fetchData()
    }
  }, [endpoint, options.immediate])

  return { data, loading, error, refetch }
}

export function useMutation<T, P = any>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (endpoint: string, data?: P, method: "POST" | "PUT" | "DELETE" = "POST") => {
    setLoading(true)
    setError(null)

    try {
      if (USE_MOCK_DATA) {
        // Simulate successful mutation with mock data
        setLoading(false)
        return { success: true } as T
      }

      let response
      switch (method) {
        case "POST":
          response = await apiClient.post<T>(endpoint, data)
          break
        case "PUT":
          response = await apiClient.put<T>(endpoint, data)
          break
        case "DELETE":
          response = await apiClient.delete<T>(endpoint)
          break
      }

      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || "Mutation failed")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}
