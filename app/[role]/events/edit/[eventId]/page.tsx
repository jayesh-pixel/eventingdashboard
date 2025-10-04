"use client"

import React from "react"
import { useRouter } from "next/navigation"
import CreateEvent from "@/components/create-event"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getValidToken } from "@/lib/token-utils"
import { eventEndPoint } from "@/lib/api-endpoints"

interface EditEventPageProps {
  params: Promise<{ role: UserRole; eventId: string }>
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Use React.use() for async params
  const { role, eventId } = React.use(params)
  const [eventData, setEventData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch event data for editing
  React.useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId || !user) return

      try {
        setLoading(true)
        setError(null)
        
        const authToken = getValidToken()
        if (!authToken) {
          setError("Authentication required. Please log in again.")
          return
        }

        const response = await fetch(eventEndPoint.GET_EVENTDATA_BY_ID, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            event_id: eventId,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to fetch event data")
        }

        const result = await response.json()
        
        if (result.data) {
          console.log("Fetched event data:", result.data) // Debug log
          setEventData(result.data)
        } else {
          throw new Error("Event not found")
        }

      } catch (error) {
        console.error("Error fetching event data:", error)
        setError("Failed to load event data. Please try again.")
        toast({
          title: "Error",
          description: "Failed to load event data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchEventData()
  }, [eventId, user, toast])

  const handleBackToEvents = () => {
    router.push(`/${role}/events`)
  }

  const handleEventUpdated = () => {
    // Navigate back to events page after successful update
    toast({
      title: "Success",
      description: "Event updated successfully!",
    })
    router.push(`/${role}/events`)
  }

  if (!eventId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border dark:bg-card dark:border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToEvents}
                  className="flex items-center space-x-2 text-foreground hover:bg-accent focus:bg-accent dark:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Events</span>
                </Button>
                <div className="h-6 w-px bg-border dark:bg-border" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Edit Event</h1>
                  <p className="text-sm text-muted-foreground">Loading event data...</p>
                </div>``
              </div>
            </div>
          </div>
        </div>

        <div className="py-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <div className="text-lg text-gray-600">Loading event data...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border dark:bg-card dark:border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToEvents}
                  className="flex items-center space-x-2 text-foreground hover:bg-accent focus:bg-accent dark:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Events</span>
                </Button>
                <div className="h-6 w-px bg-border dark:bg-border" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Edit Event</h1>
                  <p className="text-sm text-muted-foreground">Error loading event</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-16 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                  Retry
                </Button>
                <Button onClick={handleBackToEvents} className="flex-1">
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border dark:bg-card dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToEvents}
                className="flex items-center space-x-2 text-foreground hover:bg-accent focus:bg-accent dark:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Events</span>
              </Button>
              <div className="h-6 w-px bg-border dark:bg-border" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Edit Event
                </h1>
                <p className="text-sm text-muted-foreground">
                  {eventData?.EventName || eventData?.eventName || "Update event details"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-6">        <CreateEvent
          eventSelectionFlag={eventData?.EventFormat || eventData?.eventFormat || 0}
          setEventCreationModal={handleEventUpdated}
          role={role}
          editMode={true}
          existingEventData={eventData}
          eventId={eventId}
        />
      </div>
    </div>
  )
}
