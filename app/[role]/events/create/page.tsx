"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import CreateEvent from "@/components/create-event"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CreateEventPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

export default function CreateEventPage({ params }: CreateEventPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Handle both sync and async params
  const [role, setRole] = React.useState<UserRole | null>(null)
  
  React.useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params)
      setRole(resolvedParams.role)
    }
    
    resolveParams()
  }, [params])

  // Get event selection flag from URL params (0 for regular event, 1 for tour event)
  const eventSelectionFlag = React.useMemo(() => {
    const flag = searchParams.get('type')
    return flag === 'tour' ? 1 : 0
  }, [searchParams])

  const handleBackToEvents = () => {
    router.push(`/${role}/events`)
  }

  const handleEventCreated = () => {
    // Navigate back to events page after successful creation
    router.push(`/${role}/events`)
  }

  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToEvents}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Events</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Create New {eventSelectionFlag === 1 ? 'Tour' : ''} Event
                </h1>
                <p className="text-sm text-gray-500">
                  {eventSelectionFlag === 1 
                    ? 'Create a new event as part of a tour or campaign series'
                    : 'Create a new standalone event'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-6">
        <CreateEvent
          eventSelectionFlag={eventSelectionFlag}
          setEventCreationModal={handleEventCreated}
          role={role}
        />
      </div>
    </div>
  )
}
