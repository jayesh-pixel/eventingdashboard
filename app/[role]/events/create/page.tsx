"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, X, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import type { UserRole } from "@/lib/navigation"
import CreateEvent from "@/components/create-event"

interface CreateEventPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

// Event Format Enum (matching the original code)
const EventFormat = {
  EventTour: 1,
  StandardEvent: 0,
}

// Event Selection Data (matching the original structure)
const EventingSelection = [
  { id: 1, EventType: "All" },
  { id: 2, EventType: "Published" },
  { id: 3, EventType: "Draft" },
  { id: 4, EventType: "To Be Reviewed" },
  { id: 5, EventType: "Self" },
  { id: 6, EventType: "Rejected" },
]

const BookingTypeOptions = [
  { id: 1, value: 1, text: "Summary Booking" },
  { id: 2, value: 2, text: "Transaction Booking" },
]

export default function CreateEventPage({ params }: CreateEventPageProps) {
  // Handle params which might be a Promise
  let resolvedParams: { role: UserRole }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role } = resolvedParams

  const router = useRouter()

  // State management (matching original structure)
  const [eventCreationModal, setEventCreationModal] = React.useState(false)
  const [eventSelectFormatModal, setEventSelectFormatModal] = React.useState(false)
  const [eventSelectionFlag, setEventSelectionFlag] = React.useState<number | null>(null)
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [selectedEventType, setSelectedEventType] = React.useState("All")

  const renderComponent = () => {
    switch (selectedEventType) {
      case "All":
        return <div>All Events Component</div>
      case "Published":
        return <div>Published Events Component</div>
      case "Draft":
        return <div>Draft Events Component</div>
      case "To Be Reviewed":
        return <div>To Be Reviewed Events Component</div>
      case "Self":
        return <div>Self Events Component</div>
      case "Rejected":
        return <div>Rejected Events Component</div>
      default:
        return <div>All Events Component</div>
    }
  }

  const HandlerCreatePage = (status: number) => {
    // Set Flag Value
    setEventSelectionFlag(status)

    // Set Event Creation Modal True
    setEventCreationModal(true)

    // Set Selection Event Format Modal False
    setEventSelectFormatModal(false)
  }

  const HandlerBackEvent = () => {
    setEventCreationModal(false)
    setEventSelectFormatModal(false)
  }

  const handlerManage = () => {
    if (!eventCreationModal) {
      setEventSelectFormatModal(!eventCreationModal)
    } else {
      setEventCreationModal(false)
      setEventSelectFormatModal(false)
    }
  }

  // Check if user can create events
  const canCreateEvent = role === "superadmin" || role === "organizer"

  if (!canCreateEvent) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/${role}/events`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Events
            </Button>
            <h1 className="text-2xl font-semibold">Create Event</h1>
          </div>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                You don't have permission to create events.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/${role}/events`)}
                className="mt-4"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/${role}/events`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
          <h1 className="text-2xl font-semibold">Create Event</h1>
        </div>
        
        <Button
          onClick={handlerManage}
          className={`${
            eventCreationModal
              ? "border-2 text-gray-600 border-gray-400 bg-transparent hover:bg-gray-50"
              : "bg-primary text-white hover:bg-primary/90"
          } flex justify-center items-center`}
        >
          {eventCreationModal ? "Back" : "Create Event"}
        </Button>
      </div>

      {/* Dropdown for mobile - only show when not in creation mode */}
      {!eventCreationModal && (
        <div className="block md:hidden">
          <label className="font-semibold">Select Event type:</label>
          <div className="relative mt-2">
            <Button
              variant="outline"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full justify-between"
            >
              {selectedEventType || "Select Event Type"}
            </Button>
            {dropdownOpen && (
              <div className="absolute top-12 left-0 w-full bg-white shadow-md rounded-md z-10 border">
                {EventingSelection.map((event) => (
                  <button
                    key={event.id}
                    className={`w-full px-4 py-2 text-left ${
                      event.EventType === selectedEventType
                        ? "bg-gray-200"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => {
                      setSelectedEventType(event.EventType)
                      setDropdownOpen(false)
                    }}
                  >
                    {event.EventType}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop tabs - only show when not in creation mode */}
      {!eventCreationModal && (
        <div className="hidden md:flex gap-6">
          {EventingSelection.map((event) => (
            <div key={event.id}>
              <Button
                variant={event.EventType === selectedEventType ? "default" : "ghost"}
                onClick={() => setSelectedEventType(event.EventType)}
              >
                {event.EventType}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Event Selection Format Modal */}
      {eventSelectFormatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <Card className="w-[90%] md:w-[40%]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">
                  Please select the Event format
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEventSelectFormatModal(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription>
                Choose the appropriate option which best describes your event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between gap-4">
                <Button
                  onClick={() => HandlerCreatePage(EventFormat.EventTour)}
                  className="flex-1"
                >
                  Event Tour
                </Button>
                <Button
                  onClick={() => HandlerCreatePage(EventFormat.StandardEvent)}
                  className="flex-1"
                >
                  Standard Event
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div>
        {eventCreationModal ? (
          <CreateEvent
            eventSelectionFlag={eventSelectionFlag}
            setEventCreationModal={setEventCreationModal}
            role={role}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Event Management</CardTitle>
              <CardDescription>
                Manage your events by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderComponent()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
