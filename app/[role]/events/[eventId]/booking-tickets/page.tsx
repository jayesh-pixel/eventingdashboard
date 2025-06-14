"use client"

// Extend the Window interface to include __EVENT_DATA__
declare global {
  interface Window {
    __EVENT_DATA__?: any
  }
}

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Clock,
  Plus,
  Minus,
  Loader2,
  CalendarDays,
  Users,
  IndianRupee,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { promoterEndPointPannel } from "@/lib/api-endpoints"
import { getValidToken } from "@/lib/token-utils"
import { useRouter } from "next/navigation"
import type { UserRole } from "@/lib/navigation"
import { TicketType } from "@/lib/types"

interface BookingTicketsPageProps {
  params: { role: UserRole; eventId: string } | Promise<{ role: UserRole; eventId: string }>
}

interface EventDateTime {
  _id: string
  EventStartDateTime: string
  EventEndDateTime: string
  Event_id: string
  status: number
}

interface TicketData {
  _id: string
  Name: string
  Description: string
  Price: number
  EventStartDateTime: string
  EventEndDateTime: string
  MaxQuantityAllowedPerOrder: number
  AvailableQuantity: number
}

export default function BookingTicketsPage({ params }: BookingTicketsPageProps) {
  // Handle params which might be a Promise
  let resolvedParams: { role: UserRole; eventId: string }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role, eventId } = resolvedParams

  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  // State management
  const [loading, setLoading] = React.useState(true)
  const [selectedDateIndex, setSelectedDateIndex] = React.useState<string | null>(null)
  const [arrangedEventDateTime, setArrangedEventDateTime] = React.useState<EventDateTime[]>([])
  const [eventTicketsData, setEventTicketsData] = React.useState<TicketData[]>([])
  const [counts, setCounts] = React.useState<Record<string, number>>({})
  const [showCount, setShowCount] = React.useState<Record<string, boolean>>({})
  const [checkOutPage, setCheckOutPage] = React.useState(false)
  const [customerFormPage, setCustomerFormPage] = React.useState(false)
  
  // Customer form state
  const [customerData, setCustomerData] = React.useState({
    FullName: "",
    PhoneNo: "",
    Email: "",
    Age: "",
    noteDescription: "",
    WhatsAppNo: "",
    isWhatsApp: 1
  })
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  // Fetch event date data on component mount
  React.useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true)
        const authToken = getValidToken()
        if (!user || !authToken || !eventId) return

        const response = await fetch(
          promoterEndPointPannel.GET_ALL_EVENT_DATE_BY_EVENT_ID,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ event_id: eventId }),
          }
        )

        let eventDateTimes: EventDateTime[] = []
        if (response.ok) {
          const data = await response.json()
          // Try EventDateTimeData (API)
          if (data.data && data.data.EventDateTimeData && data.data.EventDateTimeData.length > 0) {
            eventDateTimes = data.data.EventDateTimeData
          }
          // Fallback: Try EventDateTime (from event object)
          else if (data.data && data.data.EventDateTime && data.data.EventDateTime.length > 0) {
            eventDateTimes = data.data.EventDateTime
          }
        }
        setArrangedEventDateTime(eventDateTimes)
      } catch (error) {
        console.error("Error fetching event data:", error)
        toast({
          title: "Error",
          description: "Failed to load event data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchEventData()
  }, [eventId, user, toast])

  // Get tickets for selected date
  const handleDateClick = async (dateId: string) => {
    setSelectedDateIndex(dateId)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) return

      const payload = {
        event_id: eventId,
        eventDateTime_id: dateId,
        promoter_id: user.user_id,
      }

      const response = await fetch(
        promoterEndPointPannel.GET_PROMOTER_TICKET_DATA_BY_EVENT_DATE,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setEventTicketsData(data.data || [])
      } else {
        throw new Error("Failed to fetch ticket data")
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast({
        title: "Error",
        description: "Failed to load ticket data",
        variant: "destructive",
      })
    }
  }

  // Ticket quantity handlers (only one ticket type can be selected at a time)
  const handleIncrease = (ticketId: string) => {
    setCounts({
      [ticketId]: (counts[ticketId] || 0) + 1, // Set count only for this ticket
    })
    setShowCount({
      [ticketId]: true, // Show count only for this ticket
    })
  }

  const handleDecrease = (ticketId: string) => {
    setCounts((prevCounts) => {
      const newCount = Math.max((prevCounts[ticketId] || 0) - 1, 0)

      if (newCount === 0) {
        setShowCount({}) // Hide all counts
        return {} // Reset all counts
      }

      return { [ticketId]: newCount } // Keep only this ticket's count
    })
  }

  const handleShowCount = (ticketId: string) => {
    setShowCount({
      [ticketId]: true, // Show count only for this ticket
    })
  }

  // Calculate totals
  const totalTickets = Object.values(counts).reduce((acc, count) => acc + count, 0)
  const totalPrice = eventTicketsData.reduce(
    (acc, ticket) => acc + (counts[ticket._id] || 0) * ticket.Price,
    0
  )

  // Calculate booking data
  const calculateTotals = () => {
    const selectedTickets = eventTicketsData.filter(
      (ticket) => counts[ticket._id] > 0
    )

    return {
      totalPrice,
      totalTickets,
      selectedTickets,
      eventId,
      eventDateTime: arrangedEventDateTime.find(date => date._id === selectedDateIndex)
    }
  }

  // Calculate if any count is active (for UI logic)
  const isAnyCountActive = Object.keys(showCount).some(
    (ticketId) => showCount[ticketId] && counts[ticketId] > 0
  )

  // Handle continue to customer form
  const handleContinue = () => {
    setCustomerFormPage(true)
  }

  // Validate customer form
  const validateCustomerForm = () => {
    const errors: Record<string, string> = {}
    
    if (!customerData.FullName.trim()) errors.FullName = "Full name is required"
    if (!customerData.PhoneNo.trim()) {
      errors.PhoneNo = "Phone number is required"
    } else if (customerData.PhoneNo.length !== 10) {
      errors.PhoneNo = "Phone number must be exactly 10 digits"
    }
    
    if (!customerData.Email.trim()) {
      errors.Email = "Email is required"
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(customerData.Email)) {
        errors.Email = "Please enter a valid email"
      }
    }
      if (!customerData.Age.trim()) {
      // Age is now optional - no error if empty
    } else {
      const age = parseInt(customerData.Age)
      if (isNaN(age) || age < 1 || age > 120) {
        errors.Age = "Please enter a valid age (1-120)"
      }
    }
    
    if (customerData.isWhatsApp === 0 && !customerData.WhatsAppNo.trim()) {
      errors.WhatsAppNo = "WhatsApp number is required"
    } else if (customerData.isWhatsApp === 0 && customerData.WhatsAppNo.length !== 10) {
      errors.WhatsAppNo = "WhatsApp number must be exactly 10 digits"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCustomerFormSubmit = () => {
    if (validateCustomerForm()) {
      setCheckOutPage(true)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ""
      }))
    }
  }

  const handleBooking = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken || !selectedDateIndex) return

      // Get the selected ticket
      const selectedTicket = eventTicketsData.find(ticket => counts[ticket._id] > 0)
      if (!selectedTicket) return

      const payload = {
        promoter_id: user.user_id,
        event_id: eventId,
        EventTicketType: TicketType.SingleDay, // Using constant instead of string
        EventDateTime_id: selectedDateIndex,
        EventTicket_id: selectedTicket._id,
        CustomerName: customerData.FullName,
        PhoneNumber: customerData.PhoneNo,
        isWhatsAppNumberisSame: customerData.isWhatsApp,
        Email: customerData.Email,
        TicketQuantity: totalTickets,
        ...(customerData.isWhatsApp === 0 && { WhatsAppNumber: customerData.WhatsAppNo }),
        ...(customerData.noteDescription && { PromoterNote: customerData.noteDescription }),
        ...(customerData.Age && { CustomerAge: parseInt(customerData.Age) }) // Optional age field
      }

      console.log("API Endpoint:", promoterEndPointPannel.BOOKING_TICKET_BY_PROMOTER)
      console.log("Booking payload:", { 
        promoter_id: user.user_id, 
        event_id: eventId, 
        EventTicketType: TicketType.SingleDay,
        quantity: totalTickets,
        hasAge: !!customerData.Age
      })

      const response = await fetch(
        promoterEndPointPannel.BOOKING_TICKET_BY_PROMOTER,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      )

      console.log("API Response Status:", response.status)
      
      // Get response text first to debug
      const responseText = await response.text()
      
      if (response.ok) {
        // Try to parse as JSON
        let data
        try {
          data = JSON.parse(responseText)
          console.log("Booking successful:", data)
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError)
          throw new Error("Invalid response format from server")
        }
        
        toast({
          title: "Booking Successful!",
          description: `Successfully booked ${totalTickets} ticket(s) for ₹${totalPrice}`,
        })
        
        // Reset state and go back to events
        setCounts({})
        setShowCount({})
        setCheckOutPage(false)
        setCustomerFormPage(false)
        setCustomerData({
          FullName: "",
          PhoneNo: "",
          Email: "",
          Age: "",
          noteDescription: "",
          WhatsAppNo: "",
          isWhatsApp: 1
        })
        router.push(`/${role}/events`)      } else {
        // Try to parse as JSON for error message
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Error response is not JSON:", responseText)
          throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}...`)
        }
        
        let errorMessage = "Booking failed"
        
        // Handle specific error codes
        switch (response.status) {
          case 400:
            errorMessage = errorData.message || "Invalid booking data. Please check your information."
            break
          case 404:
            errorMessage = "Event or ticket not found. Please try again."
            break
          case 409:
            errorMessage = errorData.message || "Insufficient tickets available or booking limit exceeded."
            break
          default:
            errorMessage = errorData.message || "Failed to book tickets. Please try again."
        }
        
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error("Error booking tickets:", error)
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to book tickets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    })
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return null
    const eventDateObj = new Date(dateString)
    
    const day = eventDateObj.toLocaleDateString("en-US", {
      weekday: "long",
    })
    const month = eventDateObj.toLocaleDateString("en-US", {
      month: "short",
    })
    const date = eventDateObj.getDate()
    const year = eventDateObj.getFullYear()
    const time = eventDateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    })

    return {
      day,
      month,
      date,
      year,
      time
    }
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Book Event Tickets
              </h1>
            </div>
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
              <CardContent className="flex items-center justify-center h-48 sm:h-64">
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="relative">
                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 animate-spin text-primary" />
                    <div className="absolute inset-0 h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full border-2 border-primary/20"></div>
                  </div>
                  <p className="text-sm sm:text-base lg:text-lg font-medium text-muted-foreground">Loading event data...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }
  // Checkout page
  if (checkOutPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => setCheckOutPage(false)}
                className="flex items-center gap-2 hover:bg-muted/80 transition-colors text-xs sm:text-sm"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Back to Customer Info</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Final Checkout
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {/* Customer Information */}
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Full Name</p>
                      <p className="text-sm sm:text-base font-semibold break-words">{customerData.FullName}</p>
                    </div>
                    {customerData.Age && (
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Age</p>
                        <p className="text-sm sm:text-base font-semibold">{customerData.Age}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Phone Number</p>
                      <p className="text-sm sm:text-base font-semibold break-all">{customerData.PhoneNo}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Email</p>
                      <p className="text-sm sm:text-base font-semibold break-all">{customerData.Email}</p>
                    </div>
                  </div>
                  {customerData.isWhatsApp === 0 && (
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">WhatsApp Number</p>
                      <p className="text-sm sm:text-base font-semibold">{customerData.WhatsAppNo}</p>
                    </div>
                  )}
                  {customerData.noteDescription && (
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Note</p>
                      <p className="text-sm sm:text-base font-semibold break-words">{customerData.noteDescription}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Booking Summary */}
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Booking Summary</CardTitle>
                  <CardDescription className="text-sm sm:text-base">Review your ticket selection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                  <div className="space-y-2 sm:space-y-3">
                    {eventTicketsData
                      .filter(ticket => counts[ticket._id] > 0)
                      .map(ticket => (
                        <div key={ticket._id} className="flex justify-between items-center p-3 sm:p-4 bg-muted/30 dark:bg-muted/50 rounded-xl border border-border/50">
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="text-sm sm:text-base lg:text-lg font-semibold truncate">{ticket.Name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Quantity: {counts[ticket._id]} × ₹{ticket.Price}
                            </p>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">{formatTime(ticket.EventStartDateTime)} - {formatTime(ticket.EventEndDateTime)}</span>
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <p className="text-base sm:text-lg lg:text-xl font-bold text-primary">₹{counts[ticket._id] * ticket.Price}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
                  
                  <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                    <span className="text-base sm:text-lg lg:text-xl font-bold">Total ({totalTickets} ticket{totalTickets !== 1 ? 's' : ''})</span>
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">₹{totalPrice}</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                    <Button 
                      className="flex-1 h-10 sm:h-12 text-sm sm:text-base lg:text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg" 
                      onClick={handleBooking}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />}
                      {loading ? "Processing..." : "Confirm Booking"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setCheckOutPage(false)}
                      className="h-10 sm:h-12 px-6 sm:px-8 hover:bg-muted/80 transition-colors text-sm sm:text-base"
                    >
                      Edit Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }
  // Customer Information Form
  if (customerFormPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCustomerFormPage(false)}
                  className="flex items-center gap-2 hover:bg-muted/80 transition-colors text-xs sm:text-sm"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Back to Tickets</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <h1 className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Contact Information
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Form Section */}
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl lg:text-2xl">Customer Details</CardTitle>
                    <CardDescription className="text-sm sm:text-base">Please provide the customer information for booking</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium">Full Name</label>
                      <input
                        type="text"
                        value={customerData.FullName}
                        onChange={(e) => handleInputChange('FullName', e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl border border-border bg-background dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="Enter full name"
                      />
                      {formErrors.FullName && (
                        <p className="text-xs sm:text-sm text-destructive">{formErrors.FullName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Phone Number */}
                      <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-medium">Phone Number</label>
                        <input
                          type="tel"
                          maxLength={10}
                          pattern="[6-9][0-9]{9}"
                          value={customerData.PhoneNo}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                            handleInputChange('PhoneNo', value)
                          }}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl border border-border bg-background dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                          placeholder="Enter 10-digit phone number"
                        />
                        {formErrors.PhoneNo && (
                          <p className="text-xs sm:text-sm text-destructive">{formErrors.PhoneNo}</p>
                        )}
                      </div>
                      {/* Age */}
                      <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-medium">Age (Optional)</label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={customerData.Age}
                          onChange={(e) => handleInputChange('Age', e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl border border-border bg-background dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                          placeholder="Enter age (optional)"
                        />
                        {formErrors.Age && (
                          <p className="text-xs sm:text-sm text-destructive">{formErrors.Age}</p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium">Email Address</label>
                      <input
                        type="email"
                        value={customerData.Email}
                        onChange={(e) => handleInputChange('Email', e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl border border-border bg-background dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="Enter email address"
                      />
                      {formErrors.Email && (
                        <p className="text-xs sm:text-sm text-destructive">{formErrors.Email}</p>
                      )}
                    </div>

                    {/* WhatsApp Number Section */}
                    <div className="space-y-3 sm:space-y-4">
                      <label className="text-xs sm:text-sm font-medium">Is this number a WhatsApp number?</label>
                      <div className="flex gap-4 sm:gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isWhatsApp"
                            checked={customerData.isWhatsApp === 1}
                            onChange={() => handleInputChange('isWhatsApp', 1)}
                            className="text-primary focus:ring-primary"
                          />
                          <span className="text-sm sm:text-base">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isWhatsApp"
                            checked={customerData.isWhatsApp === 0}
                            onChange={() => handleInputChange('isWhatsApp', 0)}
                            className="text-primary focus:ring-primary"
                          />
                          <span className="text-sm sm:text-base">No</span>
                        </label>
                      </div>

                      {customerData.isWhatsApp === 0 && (
                        <div className="space-y-2">
                          <label className="text-xs sm:text-sm font-medium">WhatsApp Number</label>
                          <input
                            type="tel"
                            maxLength={10}
                            pattern="[6-9][0-9]{9}"
                            value={customerData.WhatsAppNo}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                              handleInputChange('WhatsAppNo', value)
                            }}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl border border-border bg-background dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                            placeholder="Enter 10-digit WhatsApp number"
                          />
                          {formErrors.WhatsAppNo && (
                            <p className="text-xs sm:text-sm text-destructive">{formErrors.WhatsAppNo}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium">Note (Optional)</label>
                      <textarea
                        rows={3}
                        value={customerData.noteDescription}
                        onChange={(e) => handleInputChange('noteDescription', e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl border border-border bg-background dark:bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-colors"
                        placeholder="Add any additional notes..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Section */}
              <div className="lg:col-span-1">
                <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm sticky top-4 sm:top-8">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg lg:text-xl">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    {eventTicketsData
                      .filter(ticket => counts[ticket._id] > 0)
                      .map(ticket => (
                        <div key={ticket._id} className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm sm:text-base font-semibold break-words flex-1 min-w-0 pr-2">{ticket.Name}</h3>
                            <div className="text-right">
                              <p className="text-sm sm:text-base font-bold text-primary">₹{ticket.Price}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{formatTime(ticket.EventStartDateTime)} - {formatTime(ticket.EventEndDateTime)}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Quantity: {counts[ticket._id]}
                          </p>
                        </div>
                      ))}
                    
                    <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
                    
                    <div className="flex justify-between items-center p-2 sm:p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl">
                      <span className="text-sm sm:text-base font-bold">Total ({totalTickets} ticket{totalTickets !== 1 ? 's' : ''})</span>
                      <span className="text-base sm:text-lg lg:text-xl font-bold text-primary">₹{totalPrice}</span>
                    </div>
                    <Button 
                      onClick={handleCustomerFormSubmit}
                      className="w-full h-10 sm:h-12 text-sm sm:text-base lg:text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg rounded-xl"
                    >
                      Continue to Checkout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  // Main event booking page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/${role}/events`)}
                className="flex items-center gap-2 hover:bg-muted/80 transition-colors shadow-sm text-xs sm:text-sm"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Back to Events</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <h1 className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Book Event Tickets
              </h1>
            </div>
          </div>

          {/* Enhanced Event Date Selection */}
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Select Event Date
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">Choose when you want to attend the event</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex gap-3 sm:gap-4 flex-wrap">
                {arrangedEventDateTime.map((eventDate) => {
                  const formattedDate = formatDate(eventDate.EventStartDateTime)
                  if (!formattedDate) return null
                  
                  const isSelected = selectedDateIndex === eventDate._id
                  
                  return (
                    <div
                      key={eventDate._id}
                      onClick={() => handleDateClick(eventDate._id)}
                      className={`
                        relative cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg
                        border-2 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 rounded-2xl min-w-[120px] sm:min-w-[140px] text-center
                        ${isSelected 
                          ? 'border-primary bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg scale-105' 
                          : 'border-border hover:border-primary/50 bg-card hover:bg-muted/50'
                        }
                      `}
                    >
                      <p className="text-xs sm:text-sm font-semibold underline underline-offset-2 mb-1">
                        {formattedDate.day}
                      </p>
                      <p className="text-xs sm:text-sm opacity-80 mb-2">{formattedDate.month}</p>
                      <div className="my-2 sm:my-3">
                        <span className={`
                          text-lg sm:text-xl lg:text-2xl font-bold px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-full
                          ${isSelected 
                            ? 'bg-white/20 text-primary-foreground' 
                            : 'bg-primary/10 text-primary dark:bg-primary/20'
                          }
                        `}>
                          {formattedDate.date}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm opacity-80">{formattedDate.time}</p>
                      
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Ticket Selection */}
          {selectedDateIndex && (
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl lg:text-2xl">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Available Tickets
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">Select the tickets you want to book</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                {eventTicketsData.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-muted/30 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">No tickets available for the selected date</p>
                  </div>
                ) : (
                  eventTicketsData.map((ticket) => {
                    const count = counts[ticket._id] || 0
                    const startTime = formatTime(ticket.EventStartDateTime)
                    const endTime = formatTime(ticket.EventEndDateTime)
                    const isSelected = showCount[ticket._id]
                    const isSoldOut = ticket.AvailableQuantity === 0

                    return (
                      <Card key={ticket._id} className={`
                        transition-all duration-300 hover:shadow-lg border-2
                        ${isSelected ? 'border-primary bg-gradient-to-r from-primary/5 to-primary/10' : 'border-border hover:border-primary/30'}
                        ${isSoldOut ? 'opacity-60' : ''}
                      `}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                            <div className="flex-1 space-y-2 sm:space-y-3">
                              <div className="flex items-start justify-between">
                                <h3 className="text-base sm:text-lg lg:text-xl font-bold break-words flex-1 min-w-0 pr-2">{ticket.Name}</h3>
                                {isSoldOut && (
                                  <Badge variant="destructive" className="ml-2 text-xs">Sold Out</Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium truncate">{startTime} - {endTime}</span>
                              </div>
                              
                              {ticket.Description && (
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{ticket.Description}</p>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                  <span className="text-muted-foreground">Available: {ticket.AvailableQuantity}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                  <span className="text-muted-foreground">Max per order: {ticket.MaxQuantityAllowedPerOrder}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-3 sm:gap-4 lg:ml-6">
                              <div className="text-left lg:text-right">
                                <div className="flex items-center gap-1 text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                                  <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" />
                                  {ticket.Price}
                                </div>
                              </div>

                              {isSelected ? (
                                <div className="flex items-center gap-2 sm:gap-3 bg-background dark:bg-card rounded-xl border border-border p-2 sm:p-3 shadow-sm">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDecrease(ticket._id)}
                                    className="h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                  
                                  <span className="min-w-[2rem] sm:min-w-[3rem] text-center text-lg sm:text-xl font-bold text-primary">
                                    {count}
                                  </span>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleIncrease(ticket._id)}
                                    className="h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-full hover:bg-primary hover:text-primary-foreground"
                                    disabled={count >= ticket.MaxQuantityAllowedPerOrder || count >= ticket.AvailableQuantity}
                                  >
                                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => handleShowCount(ticket._id)}
                                  disabled={isAnyCountActive || isSoldOut}
                                  className={`
                                    px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-base lg:text-lg font-semibold rounded-xl transition-all
                                    ${isAnyCountActive || isSoldOut
                                      ? "opacity-40 cursor-not-allowed" 
                                      : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl"
                                    }
                                  `}
                                >
                                  {isSoldOut ? "Sold Out" : "Select Ticket"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </CardContent>
            </Card>
          )}

          {/* Enhanced Checkout Section */}
          {totalTickets > 0 && (
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden sticky bottom-2 sm:bottom-4 z-10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                  <div className="flex flex-col space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                      <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                      {totalPrice}
                    </div>
                    <p className="text-sm sm:text-base lg:text-lg font-semibold text-muted-foreground">
                      {totalTickets} Ticket{totalTickets !== 1 ? 's' : ''} Selected
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleContinue} 
                    size="lg" 
                    className="w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-12 text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all rounded-xl"
                  >
                    Continue to Checkout
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add some bottom spacing */}
          <div className="h-4 sm:h-8" />
        </div>
      </div>
    </div>
  )
}