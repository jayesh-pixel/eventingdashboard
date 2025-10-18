"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import CreateEvent from "@/components/create-event"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, CheckCircle, X } from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getValidToken } from "@/lib/token-utils"
import { eventEndPoint } from "@/lib/api-endpoints"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface EditEventPageProps {
  params: Promise<{ role: UserRole; eventId: string }>
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Use React.use() for async params
  const { role, eventId } = React.use(params)
  const [eventData, setEventData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  // Check if this is view-only mode
  const isViewOnly = searchParams.get('viewOnly') === 'true'

  // Approve/Reject state
  const [showRejectModal, setShowRejectModal] = React.useState(false)
  const [eventRejectRemark, setEventRejectRemark] = React.useState("")
  const [isApproving, setIsApproving] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)

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

  // Handle approve event (change status to Published)
  const handleApproveEvent = async () => {
    if (!eventData) return

    try {
      setIsApproving(true)
      const authToken = getValidToken()
      if (!authToken) {
        toast({
          title: "Error",
          description: "Authentication required. Please log in again.",
          variant: "destructive",
        })
        return
      }

      // Create payload with complete event data
      const payload = {
        event_id: eventId,
        Status: "3", // Published status
        
        // Include all event fields from the original data
        EventName: eventData.EventName || eventData.eventName,
        EventDescription: eventData.EventDescription || eventData.eventDescription,
        EventLanguages: eventData.EventLanguages || eventData.eventLanguages || [],
        EventTermsCondition: eventData.EventTermsCondition || eventData.eventTermsCondition || "",
        
        // Event flags and settings
        TourEvent: (eventData.TourEvent ?? eventData.tourEvent ?? 0).toString(),
        VenueEventFlag: eventData.VenueEventFlag ?? eventData.venueEventFlag ?? 1,
        EventType: eventData.EventType ?? eventData.eventType ?? 1,
        OnlineEventFlag: eventData.OnlineEventFlag ?? eventData.onlineEventFlag ?? 0,
        FeaturedEventFlag: eventData.FeaturedEventFlag ?? eventData.featuredEventFlag ?? 0,
        VenueToBeAnnounced: eventData.VenueToBeAnnounced ?? eventData.venueToBeAnnounced ?? 0,
        EventVisibility: eventData.EventVisibility ?? eventData.eventVisibility ?? 1,
        
        // Additional fields
        BestSuitedFor: eventData.BestSuitedFor ?? eventData.bestSuitedFor ?? "21",
        venue_id: eventData.venue_id ?? eventData.venueId,
        
        // Online event link if applicable
        ...(eventData.OnlineEventFlag === 1 && {
          Online_Event_Link: eventData.Online_Event_Link ?? eventData.onlineEventLink
        }),
        
        // Venue to be announced fields if applicable
        ...(eventData.VenueToBeAnnounced === 1 && {
          VenueToBeAnnouncedCity: eventData.VenueToBeAnnouncedCity ?? eventData.venueToBeAnnouncedCity,
          VenueToBeAnnouncedCityIsoCode: eventData.VenueToBeAnnouncedCityIsoCode ?? eventData.venueToBeAnnouncedCityIsoCode,
          VenueToBeAnnouncedState: eventData.VenueToBeAnnouncedState ?? eventData.venueToBeAnnouncedState,
          VenueToBeAnnouncedStateIsoCode: eventData.VenueToBeAnnouncedStateIsoCode ?? eventData.venueToBeAnnouncedStateIsoCode
        })
      }

      const response = await fetch(eventEndPoint.UPDATE_EVENT_DATA, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to approve event")
      }

      const data = await response.json()
      
      toast({
        title: "Success",
        description: data.message || "Event has been approved and published successfully.",
      })

      // Navigate back to events page
      router.push(`/${role}/events`)

    } catch (error) {
      console.error("Error approving event:", error)
      toast({
        title: "Error",
        description: "Failed to approve the event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  // Handle reject event (change status to Rejected)
  const handleRejectEvent = async () => {
    if (!eventRejectRemark.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      })
      return
    }

    if (!eventData) return

    try {
      setIsRejecting(true)
      const authToken = getValidToken()
      if (!authToken) {
        toast({
          title: "Error",
          description: "Authentication required. Please log in again.",
          variant: "destructive",
        })
        return
      }

      // Create payload with complete event data plus rejection remark
      const payload = {
        event_id: eventId,
        Status: "4", // Rejected status
        EventRejectRemark: eventRejectRemark.trim(), // Rejection remark
        
        // Include all event fields from the original data
        EventName: eventData.EventName || eventData.eventName,
        EventDescription: eventData.EventDescription || eventData.eventDescription,
        EventLanguages: eventData.EventLanguages || eventData.eventLanguages || [],
        EventTermsCondition: eventData.EventTermsCondition || eventData.eventTermsCondition || "",
        
        // Event flags and settings
        TourEvent: (eventData.TourEvent ?? eventData.tourEvent ?? 0).toString(),
        VenueEventFlag: eventData.VenueEventFlag ?? eventData.venueEventFlag ?? 1,
        EventType: eventData.EventType ?? eventData.eventType ?? 1,
        OnlineEventFlag: eventData.OnlineEventFlag ?? eventData.onlineEventFlag ?? 0,
        FeaturedEventFlag: eventData.FeaturedEventFlag ?? eventData.featuredEventFlag ?? 0,
        VenueToBeAnnounced: eventData.VenueToBeAnnounced ?? eventData.venueToBeAnnounced ?? 0,
        EventVisibility: eventData.EventVisibility ?? eventData.eventVisibility ?? 1,
        
        // Additional fields
        BestSuitedFor: eventData.BestSuitedFor ?? eventData.bestSuitedFor ?? "21",
        venue_id: eventData.venue_id ?? eventData.venueId,
        
        // Online event link if applicable
        ...(eventData.OnlineEventFlag === 1 && {
          Online_Event_Link: eventData.Online_Event_Link ?? eventData.onlineEventLink
        }),
        
        // Venue to be announced fields if applicable
        ...(eventData.VenueToBeAnnounced === 1 && {
          VenueToBeAnnouncedCity: eventData.VenueToBeAnnouncedCity ?? eventData.venueToBeAnnouncedCity,
          VenueToBeAnnouncedCityIsoCode: eventData.VenueToBeAnnouncedCityIsoCode ?? eventData.venueToBeAnnouncedCityIsoCode,
          VenueToBeAnnouncedState: eventData.VenueToBeAnnouncedState ?? eventData.venueToBeAnnouncedState,
          VenueToBeAnnouncedStateIsoCode: eventData.VenueToBeAnnouncedStateIsoCode ?? eventData.venueToBeAnnouncedStateIsoCode
        })
      }

      const response = await fetch(eventEndPoint.UPDATE_EVENT_DATA, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to reject event")
      }

      const data = await response.json()
      
      toast({
        title: "Success",
        description: data.message || "Event has been rejected successfully.",
      })

      // Reset modal state
      setShowRejectModal(false)
      setEventRejectRemark("")

      // Navigate back to events page
      router.push(`/${role}/events`)

    } catch (error) {
      console.error("Error rejecting event:", error)
      toast({
        title: "Error",
        description: "Failed to reject the event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRejecting(false)
    }
  }

  // Open reject modal
  const openRejectModal = () => {
    setEventRejectRemark("")
    setShowRejectModal(true)
  }

  // Check if event is in "To Be Reviewed" status
  const isEventToBeReviewed = () => {
    if (!eventData) return false
    const status = eventData.Status || eventData.status || eventData.EventStatus
    return status === 2 || status === "2" || status === "To Be Reviewed"
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
                  {isViewOnly ? "View Event" : "Edit Event"}
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
      <div className="py-6">
        <CreateEvent
          eventSelectionFlag={eventData?.EventFormat || eventData?.eventFormat || 0}
          setEventCreationModal={handleEventUpdated}
          role={role}
          editMode={true}
          viewOnly={isViewOnly}
          existingEventData={eventData}
          eventId={eventId}
          showApprovalButtons={(role as UserRole) === "superadmin" && isEventToBeReviewed()}
          onApproveEvent={handleApproveEvent}
          onRejectEvent={openRejectModal}
          isApproving={isApproving}
          isRejecting={isRejecting}
        />
      </div>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Event</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this event. This will be shared with the organizer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter the reason for rejection..."
                value={eventRejectRemark}
                onChange={(e) => setEventRejectRemark(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRejectModal(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectEvent}
              disabled={isRejecting || !eventRejectRemark.trim()}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
