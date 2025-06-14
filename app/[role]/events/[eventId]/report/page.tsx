"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Download,
  Loader2,
  Search,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { promoterEndPointPannel } from "@/lib/api-endpoints"
import { getValidToken } from "@/lib/token-utils"
import { useRouter } from "next/navigation"
import type { UserRole } from "@/lib/navigation"

interface EventReportPageProps {
  params: { role: UserRole; eventId: string } | Promise<{ role: UserRole; eventId: string }>
}

const BookingTypeOptions = [
  { id: 1, value: 1, text: "Summary Booking" },
  { id: 2, value: 2, text: "Transaction Booking" },
]

export default function EventReportPage({ params }: EventReportPageProps) {
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
  const [downloadLoading, setDownloadLoading] = React.useState(false)
  
  // Filter state
  const [nameDropDownVisible, setNameDropDownVisible] = React.useState(false)
  const [selectedNameIndex, setSelectedNameIndex] = React.useState<number | null>(null)
  const [ticketNameFilterData, setTicketNameFilterData] = React.useState<string[]>([])
  const [storeFilterDates, setStoreFilterDates] = React.useState<any[]>([])
  
  const [dropdownVisible, setDropdownVisible] = React.useState(false)
  const [dropdownVisibleBooking, setDropdownVisibleBooking] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [selectedBookingType, setSelectedBookingType] = React.useState(2)
  
  // Data state
  const [eventTicketsData, setEventTicketsData] = React.useState<any[]>([])
  const [allTransactionBookingData, setAllTransactionBookingData] = React.useState<any[]>([])
  const [originalData, setOriginalData] = React.useState<any[]>([])
  
  // Search state
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  
  const [storeFilterdDatePayload, setFilterdDatePayload] = React.useState<any>({})
  const [filters, setFilters] = React.useState({
    eventDateTime_id: "",
    ticketName: "",
  })

  // Get event report data
  const getAllEventReportDataByEventID = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken || !eventId) return

      const payload = {
        promoter_id: user.user_id,
        event_id: eventId,
      }

      const response = await fetch(
        promoterEndPointPannel.GET_ALL_PROMOTER_EVENT_BOOKING_DATA_BY_EVENT_ID,
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
        setTicketNameFilterData(data.data.TicketNamesArray || [])
        setStoreFilterDates(data.data.EventDateTimeData || [])
        setEventTicketsData(data.data.TicketsData || [])
        setOriginalData(data.data.TicketsData || [])
      } else {
        throw new Error("Failed to fetch event report data")
      }
    } catch (error) {
      console.error("Error fetching event report:", error)
      toast({
        title: "Error",
        description: "Failed to load event report data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Get transaction booking data
  const getAllTransactionBookingData = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken || !eventId) return

      const payload = {
        promoter_id: user.user_id,
        event_id: eventId,
      }

      const response = await fetch(
        promoterEndPointPannel.GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENY_AND_PROMOTER_ID,
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
        setAllTransactionBookingData(data.data || [])
        setOriginalData(data.data || [])
      } else {
        throw new Error("Failed to fetch transaction booking data")
      }
    } catch (error) {
      console.error("Error fetching transaction data:", error)
      toast({
        title: "Error",
        description: "Failed to load transaction booking data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter functions
  const handleNameFilter = (ticketName: string, index: number | null) => {
    setSelectedNameIndex(index)

    if (ticketName === "resetAllNames") {
      setEventTicketsData(originalData)
      setFilters({ eventDateTime_id: "", ticketName: "" })
      setFilterdDatePayload({})
    } else {
      const newFilters = { ...filters, ticketName: ticketName }
      setFilters(newFilters)
      fetchFilteredData(newFilters)
    }
    setNameDropDownVisible(false)
  }

  const handleDateFilter = (eventDateId: string | null, eventDate: string) => {
    setSelectedDate(eventDateId)
    setSelectedNameIndex(null)

    if (eventDate === "reset") {
      setEventTicketsData(originalData)
      setFilters({ eventDateTime_id: "", ticketName: "" })
      setFilterdDatePayload({})
    } else {
      const newFilters = { ...filters, eventDateTime_id: eventDateId || "" }
      setFilters(newFilters)
      fetchFilteredData(newFilters)
    }
    setDropdownVisible(false)
  }

  const fetchFilteredData = async (filterParams: any) => {
    try {
      const authToken = getValidToken()
      if (!user || !authToken || !eventId) return

      const filteredParams = Object.keys(filterParams).reduce((acc: any, key) => {
        if (filterParams[key]) {
          acc[key] = filterParams[key]
        }
        return acc
      }, {})

      const payload = {
        event_id: eventId,
        promoter_id: user.user_id,
        ...filteredParams,
      }

      const response = await fetch(
        promoterEndPointPannel.FILTER_EVENT_BOOKING_DATA_BY_NAME_AND_DATE_IN_PROMOTER,
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
        setFilterdDatePayload(payload)
        toast({
          title: "Success",
          description: data.message || "Data filtered successfully",
        })
      } else {
        setEventTicketsData([])
        toast({
          title: "No Data",
          description: "No data found for the selected filters",
        })
      }
    } catch (error) {
      console.error("Filter error:", error)
      setEventTicketsData([])
      toast({
        title: "Error",
        description: "Failed to filter data",
        variant: "destructive",
      })
    }
  }

  // Download report handler
  const downloadReportHandler = async () => {
    try {
      setDownloadLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken || !eventId) return

      let endpoint: string
      let payload: any

      if (selectedBookingType === 1) {
        if (eventTicketsData.length === 0) {
          toast({
            title: "No Data",
            description: "No Summary Booking data found for this event.",
            variant: "destructive",
          })
          return
        }

        payload = {
          promoter_id: user.user_id,
          event_id: eventId,
        }

        if (storeFilterdDatePayload.ticketName) {
          payload.ticketName = storeFilterdDatePayload.ticketName
        }

        if (storeFilterdDatePayload.eventDateTime_id) {
          payload.eventDateTime_id = storeFilterdDatePayload.eventDateTime_id
        }

        endpoint = promoterEndPointPannel.DOWNLOAD_EXECEL_REPORT_OF_SUMMARY_BOOKING
      } else {
        if (allTransactionBookingData.length === 0) {
          toast({
            title: "No Data",
            description: "No transaction data found for this event.",
            variant: "destructive",
          })
          return
        }

        payload = {
          promoter_id: user.user_id,
          event_id: eventId,
        }

        if (searchTerm && searchTerm.length >= 3) {
          payload.searchKeyword = searchTerm
        }

        endpoint = promoterEndPointPannel.DOWNLOAD_EXECEL_REPORT_OF_TRANSACTION_BOOKING
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute(
          "download",
          `${selectedBookingType === 1 ? "Summary Report" : "Transaction Report"}_Report.xlsx`
        )
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast({
          title: "Success",
          description: "Report downloaded successfully",
        })
      } else {
        throw new Error("Failed to download report")
      }
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      })
    } finally {
      setDownloadLoading(false)
    }
  }

  // Load initial data
  React.useEffect(() => {
    if (selectedBookingType === 1) {
      getAllEventReportDataByEventID()
    } else if (selectedBookingType === 2) {
      getAllTransactionBookingData()
    }
  }, [selectedBookingType, eventId, user])

  // Search with debounce
  React.useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 1000)

    return () => clearTimeout(delay)
  }, [searchTerm])

  // Search functionality for transaction data
  React.useEffect(() => {
    const fetchSearchData = async () => {
      if (selectedBookingType !== 2) return
      
      try {
        if (debouncedSearchTerm.length < 3) {
          if (debouncedSearchTerm.length > 0) {
            toast({
              title: "Search",
              description: "Search keyword must be at least 3 characters long.",
            })
          }
          return
        }

        const authToken = getValidToken()
        if (!user || !authToken || !eventId) return

        const payload = {
          promoter_id: user.user_id,
          event_id: eventId,
          searchKeyword: debouncedSearchTerm,
        }

        const response = await fetch(
          promoterEndPointPannel.GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENY_AND_PROMOTER_ID,
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
          setAllTransactionBookingData(data.data || [])
        } else {
          throw new Error("Failed to search transaction data")
        }
      } catch (error) {
        console.error("Error searching transaction data:", error)
        toast({
          title: "Search Error",
          description: "Failed to search transaction data",
          variant: "destructive",
        })
      }
    }

    if (debouncedSearchTerm) {
      fetchSearchData()
    }
  }, [debouncedSearchTerm, selectedBookingType, eventId, user])

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Event Booking Report</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading report data...</span>
        </div>
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
          <h1 className="text-2xl font-semibold">Event Booking Report</h1>
        </div>
        
        <Button
          onClick={downloadReportHandler}
          disabled={downloadLoading}
          className="flex items-center gap-2"
        >
          {downloadLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
            {/* Booking Type Filter */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setDropdownVisibleBooking(!dropdownVisibleBooking)}
                className="flex items-center justify-between w-48"
              >
                {selectedBookingType === 1 ? "Summary Booking" : "Transaction Booking"}
                {dropdownVisibleBooking ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              {dropdownVisibleBooking && (
                <div className="absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {BookingTypeOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => {
                        setSelectedBookingType(option.value)
                        setDropdownVisibleBooking(false)
                      }}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                        selectedBookingType === option.value ? "bg-gray-100" : ""
                      }`}
                    >
                      {option.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conditional Filters */}
            {selectedBookingType === 1 ? (
              <div className="flex gap-4">
                {/* Name Filter */}
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setNameDropDownVisible(!nameDropDownVisible)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Name Filter
                  </Button>

                  {nameDropDownVisible && (
                    <div className="absolute top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {ticketNameFilterData.map((name, index) => (
                        <div
                          key={index}
                          onClick={() => handleNameFilter(name, index)}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                            selectedNameIndex === index ? "bg-gray-100" : ""
                          }`}
                        >
                          {name}
                        </div>
                      ))}
                      <div
                        onClick={() => handleNameFilter("resetAllNames", null)}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200"
                      >
                        Reset Filter
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Filter */}
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setDropdownVisible(!dropdownVisible)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Date Filter
                  </Button>

                  {dropdownVisible && (
                    <div className="absolute top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {storeFilterDates.map((date) => (
                        <div
                          key={date._id}
                          onClick={() => handleDateFilter(date._id, date.EventStartDate)}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                            selectedDate === date._id ? "bg-gray-100" : ""
                          }`}
                        >
                          {formatDate(date.EventStartDate)}
                        </div>
                      ))}
                      <div
                        onClick={() => handleDateFilter(null, "reset")}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-t border-gray-200"
                      >
                        Reset Filter
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by Booking ID and Customer Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Tables */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedBookingType === 1 ? "Summary Booking Report" : "Transaction Booking Report"}
          </CardTitle>
          <CardDescription>
            {selectedBookingType === 1 
              ? `${eventTicketsData.length} ticket record(s) found`
              : `${allTransactionBookingData.length} transaction record(s) found`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedBookingType === 1 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Ticket Price</TableHead>
                  <TableHead>Ticket Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventTicketsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No summary booking data available</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  eventTicketsData.map((ticket, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{ticket.TicketName}</TableCell>
                      <TableCell>{ticket.Quantity}</TableCell>
                      <TableCell>₹{ticket.TicketPrice}</TableCell>
                      <TableCell>{formatDate(ticket.TicketDate)}</TableCell>
                      <TableCell>₹{ticket.TotalAmount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Phone No.</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Ticket Name</TableHead>
                  <TableHead>Ticket Type</TableHead>
                  <TableHead>Ticket Price</TableHead>
                  <TableHead>Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTransactionBookingData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No transaction booking data available</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  allTransactionBookingData.map((transaction, index) => (
                    <TableRow key={index} className={transaction.Status === "2" ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{transaction.CustomerName}</TableCell>
                      <TableCell>{transaction.Booking_id}</TableCell>
                      <TableCell>{transaction.PhoneNumber}</TableCell>
                      <TableCell>{transaction.Email}</TableCell>
                      <TableCell>{transaction.BookingDateTime}</TableCell>
                      <TableCell>{transaction.EventName}</TableCell>
                      <TableCell>{formatDate(transaction.TicketDate)}</TableCell>
                      <TableCell>{transaction.TicketQuantity}</TableCell>
                      <TableCell>{transaction.Check_In}</TableCell>
                      <TableCell>{transaction.TicketName}</TableCell>
                      <TableCell>{transaction.EventTicketType}</TableCell>
                      <TableCell>₹{transaction.TicketPrice}</TableCell>
                      <TableCell>₹{transaction.TotalAmount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
