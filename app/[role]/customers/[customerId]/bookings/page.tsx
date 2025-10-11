"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, ArrowLeft, User, Calendar, MapPin, Ticket, IndianRupee, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import type { Customer, CustomerBooking } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { websiteCustomer } from "@/lib/api-endpoints"

interface CustomerBookingsPageProps {
  params: Promise<{ role: UserRole; customerId: string }> | { role: UserRole; customerId: string }
}

export default function CustomerBookingsPage({ params }: CustomerBookingsPageProps) {
  const resolvedParams = React.use(params instanceof Promise ? params : Promise.resolve(params))
  const { role, customerId } = resolvedParams
  
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  // State management
  const [loading, setLoading] = React.useState(true)
  const [customerInfo, setCustomerInfo] = React.useState<Customer | null>(null)
  const [customerBookings, setCustomerBookings] = React.useState<CustomerBooking[]>([])
  const [filteredBookings, setFilteredBookings] = React.useState<CustomerBooking[]>([])
  const [loadingBookings, setLoadingBookings] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  // Fetch customer info
  const fetchCustomerInfo = async () => {
    try {
      const authToken = getValidToken()
      if (!authToken) {
        throw new Error("Authentication required")
      }

      const response = await fetch(websiteCustomer.GET_ALL_PAGINATED_CUSTOMERS_DATA, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      console.log("Customer info response:", data)
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch customer info")
      }

      // Find the specific customer from the customerData array
      const customer = data.data?.customerData?.find((c: any) => c._id === customerId)
      console.log("Found customer:", customer)
      setCustomerInfo(customer || null)
      
    } catch (error) {
      console.error("Error fetching customer info:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch customer information",
        variant: "destructive"
      })
    }
  }

  // Fetch customer bookings
  const fetchCustomerBookings = async () => {
    try {
      setLoadingBookings(true)
      
      const authToken = getValidToken()
      if (!authToken) {
        throw new Error("Authentication required")
      }

      const response = await fetch(websiteCustomer.GET_CUSTOMER_BOOKINGS, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId,
          page: 1,
          limit: 10 // Get more bookings for the dedicated page
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      console.log("Customer bookings response:", data)
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch customer bookings")
      }

      setCustomerBookings(data.data?.BookingsData || [])
      setFilteredBookings(data.data?.BookingsData || [])
      
    } catch (error) {
      console.error("Error fetching customer bookings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch customer bookings",
        variant: "destructive"
      })
      setCustomerBookings([])
      setFilteredBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }

  // Search functionality
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBookings(customerBookings)
    } else {
      const filtered = customerBookings.filter(booking =>
        booking.EventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.TicketName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.Booking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.EventVenue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.VenueCity?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredBookings(filtered)
    }
  }, [searchTerm, customerBookings])

  // Initialize data
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchCustomerInfo(),
        fetchCustomerBookings()
      ])
      setLoading(false)
    }

    if (customerId && user) {
      loadData()
    }
  }, [customerId, user])

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `₹${amount?.toLocaleString() || 'N/A'}`
  }

  // Get registration type
  const getRegistrationType = (type: number) => {
    return type === 1 ? "Website" : "Mobile"
  }

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${role}/customers`)}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Customer Bookings</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Loading customer information...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${role}/customers`)}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Customer Bookings</h1>
          {customerInfo && (
            <p className="text-muted-foreground">
              {customerInfo.CustomerName || "Unknown Customer"}
            </p>
          )}
        </div>
      </div>

      {/* Customer Information Card */}
      {customerInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Name</div>
                <div className="text-sm font-semibold">{customerInfo.CustomerName || "N/A"}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="text-sm">{customerInfo.Email || "N/A"}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Phone</div>
                <div className="text-sm">+91 {customerInfo.MobileNumber || "N/A"}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Registration</div>
                <Badge variant="outline">
                  {getRegistrationType(customerInfo.RegistrationType)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings Summary */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">Total Bookings</div>
            <div className="text-2xl font-bold">{filteredBookings.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Booking History
          </CardTitle>
          <CardDescription>
            Complete booking history for this customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <div className="text-sm text-muted-foreground">
                {filteredBookings.length} of {customerBookings.length} bookings
              </div>
            )}
          </div>

          {loadingBookings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading bookings...
            </div>
          ) : customerBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center">
                  <Ticket className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium text-muted-foreground">No bookings found</p>
                  <p className="text-sm text-muted-foreground">This customer hasn't made any bookings yet</p>
                </div>
              </div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium text-muted-foreground">No results found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Booking ID</TableHead>
                    <TableHead>Event Details</TableHead>
                    <TableHead>Ticket Info</TableHead>
                    <TableHead>Venue & Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {booking.Booking_id}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {booking.EventTicketType}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{booking.EventName}</div>
                          <div className="text-xs text-muted-foreground">{booking.TicketName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{booking.TicketQuantity}x</span> tickets
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(booking.TicketPrice)} each
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {booking.EventVenue}
                          </div>
                          <div className="text-xs text-muted-foreground">{booking.VenueCity}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {booking.EventDate} at {booking.EventTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(booking.TotalAmount)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}