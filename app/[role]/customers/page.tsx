"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Search, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { useRouter } from "next/navigation" // For navigation
import { websiteCustomer } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import type { Customer, CustomersApiResponse, CustomerBooking } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils"

interface CustomersPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

const ITEMS_PER_PAGE = 10

export default function CustomersPage({ params }: CustomersPageProps) {
  // Handle params which might be a Promise
  let resolvedParams: { role: UserRole }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role } = resolvedParams
  
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  // State management
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [loading, setLoading] = React.useState(true)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalCustomers, setTotalCustomers] = React.useState(0)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = React.useState(false)
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = React.useState(false)
  const [customerBookings, setCustomerBookings] = React.useState<CustomerBooking[]>([])
  const [loadingBookings, setLoadingBookings] = React.useState(false)
  const [showBookingsDialog, setShowBookingsDialog] = React.useState(false)

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when searching
    }, 500) // Increased debounce time to 500ms
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Separate handler for search input
  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  // Fetch customers data
  const fetchCustomers = React.useCallback(async (page: number = 1, search: string = "") => {
    if (!user) return
    
    setLoading(true)
    setApiError(null)
    
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("No valid authentication token found")
      }

      const body: any = {
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      }
      
      // Add search parameter if search term is provided
      if (search && search.trim()) {
        body.search = search.trim()
      }

      const response = await fetch(websiteCustomer.GET_ALL_PAGINATED_CUSTOMERS_DATA, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: CustomersApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch customers")
      }

      setCustomers(data.data.customerData || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalCustomers(data.data.totalCustomers || 0)
      setCurrentPage(data.data.currentPage || 1)
      
    } catch (error) {
      console.error("Error fetching customers:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch customers"
      setApiError(errorMessage)
      setShowErrorDialog(true)
      setCustomers([])
      setTotalPages(1)
      setTotalCustomers(0)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Load data on mount and when dependencies change
  React.useEffect(() => {
    fetchCustomers(currentPage, debouncedSearchTerm)
  }, [fetchCustomers, currentPage, debouncedSearchTerm])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRefresh = () => {
    fetchCustomers(currentPage, debouncedSearchTerm)
  }

  // Format phone number for display
  const formatPhoneNumber = (phone: number) => {
    return `+91 ${phone.toString()}`
  }

  // Get customer status badge
  const getStatusBadge = (status: number) => {
    return status === 1 ? (
      <Badge variant="default" className="bg-green-500">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    )
  }
  // Get registration type
  const getRegistrationType = (type: number) => {
    return type === 1 ? "Website" : "Mobile"
  }
  
  const handleViewBookings = (customerId: string, customerName: string) => {
    const customer = customers.find(c => c._id === customerId)
    if (customer) {
      setSelectedCustomer(customer)
      setShowDetailsDialog(true)
    } else {
      toast({
        title: "Error",
        description: "Customer not found",
        variant: "destructive"
      })
    }
  }

  const fetchCustomerBookings = async (customerId: string) => {
    try {
      setLoadingBookings(true)
      setCustomerBookings([])
      
      const authToken = getValidToken()
      
      if (!authToken) {
        throw new Error("Authentication required")
      }

      const response = await fetch("https://node.eventingclub.in/websitecustomers/getCustomerBookings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId,
          page: "1",
          limit: "10"
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch customer bookings")
      }

      setCustomerBookings(data.data?.BookingsData || [])
      
    } catch (error) {
      console.error("Error fetching customer bookings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch customer bookings",
        variant: "destructive"
      })
      setCustomerBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold">Customers Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-card/90 to-card/95 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary h-4 w-4 animate-spin z-10" />
            )}
            <Input
              placeholder="Search by customer name, email, or phone number..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-10 h-12 bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base transition-all duration-200 shadow-inner"
              disabled={loading}
              autoComplete="off"
            />
            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Customers</span>
            <div className="text-sm text-muted-foreground">
              {loading ? "Loading..." : `${totalCustomers} customers found`}
            </div>
          </CardTitle>
          <CardDescription>View website-signed-up customers and their details.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Loading skeleton
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 bg-muted animate-pulse rounded w-1/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-medium text-muted-foreground">No customers found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? "Try adjusting your search terms" : "No customers have been registered yet"}
                  </p>
                </div>
                <Button variant="outline" onClick={handleRefresh} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Registration Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Registered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((cust) => (
                    <TableRow key={cust._id}>
                      <TableCell className="font-medium">
                        {cust.CustomerName || "N/A"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {cust.Email || "N/A"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatPhoneNumber(cust.MobileNumber)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(cust.status)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline">
                          {getRegistrationType(cust.RegistrationType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(cust.createdAt)}
                      </TableCell>
                      <TableCell>                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewBookings(cust._id, cust.CustomerName || "Unknown")}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage > 1) handlePageChange(currentPage - 1)
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      const pageNum = i + 1
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === pageNum}
                            onClick={(e) => {
                              e.preventDefault()
                              handlePageChange(pageNum)
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage < totalPages) handlePageChange(currentPage + 1)
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Bookings Dialog */}
      <Dialog open={showBookingsDialog} onOpenChange={setShowBookingsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Customer Bookings</DialogTitle>
            <DialogDescription>
              {selectedCustomer ? `Booking history for ${selectedCustomer.CustomerName || "Customer"}` : "Customer booking history"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {loadingBookings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading bookings...
              </div>
            ) : customerBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No bookings found for this customer</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Total Bookings: {customerBookings.length}
                </div>
                
                <div className="space-y-3">
                  {customerBookings.map((booking, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {booking.Booking_id}
                          </Badge>
                          <Badge variant="outline">
                            {booking.EventTicketType}
                          </Badge>
                        </div>
                        <div className="text-lg font-semibold text-green-600">
                          ₹{booking.TotalAmount?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event</label>
                            <p className="text-sm font-medium">{booking.EventName}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ticket</label>
                            <p className="text-sm">{booking.TicketName}</p>
                          </div>
                          <div className="flex gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price</label>
                              <p className="text-sm">₹{booking.TicketPrice}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</label>
                              <p className="text-sm">{booking.TicketQuantity}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Venue</label>
                            <p className="text-sm">{booking.EventVenue}</p>
                            <p className="text-xs text-muted-foreground">{booking.VenueCity}</p>
                          </div>
                          <div className="flex gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</label>
                              <p className="text-sm">{booking.EventDate}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time</label>
                              <p className="text-sm">{booking.EventTime}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowBookingsDialog(false)
              setShowDetailsDialog(true)
            }}>
              Back to Details
            </Button>
            <Button variant="outline" onClick={() => setShowBookingsDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View detailed information about the customer
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer Name</label>
                    <p className="text-sm font-semibold">{selectedCustomer.CustomerName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{selectedCustomer.Email || "N/A"}</p>
                  </div>                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-sm">{selectedCustomer.MobileNumber || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registration Type</label>
                    <Badge variant="outline">
                      {getRegistrationType(selectedCustomer.RegistrationType)}
                    </Badge>
                  </div>
                </div>                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Account Status</label>
                    <Badge variant={selectedCustomer.status === 1 ? "default" : "secondary"}>
                      {selectedCustomer.status === 1 ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registered</label>
                    <p className="text-sm">{formatDate(selectedCustomer.createdAt)}</p>
                  </div>
                </div>
              </div>
                {/* Location Information */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Location Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Country</label>
                    <p className="text-sm">{selectedCustomer.country || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">State</label>
                    <p className="text-sm">{selectedCustomer.state || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">City</label>
                    <p className="text-sm">{selectedCustomer.city || "N/A"}</p>
                  </div>
                </div>              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>            <Button onClick={() => {
              if (selectedCustomer) {
                setShowDetailsDialog(false)
                fetchCustomerBookings(selectedCustomer._id)
                setShowBookingsDialog(true)
              }
            }}>
              View Bookings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Error Loading Customers
            </DialogTitle>
            <DialogDescription className="text-left">
              {apiError}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowErrorDialog(false)
              handleRefresh()
            }}>
              Retry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
