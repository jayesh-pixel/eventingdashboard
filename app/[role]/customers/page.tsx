"use client"

import { authFetch } from "@/lib/auth-fetch"
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

  // Debounce search term for API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when searching
    }, 800) // Increased debounce time for API calls
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Search input handler
  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  // Handle search submit (for immediate search)
  const handleSearchSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setDebouncedSearchTerm(searchTerm)
    setCurrentPage(1)
  }, [searchTerm])

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

      let apiUrl: string
      let body: any

      // Use different endpoint and payload structure based on search
      if (search && search.trim()) {
        // Use search endpoint
        apiUrl = websiteCustomer.CUSTOMER_SEARCH_PAGINATED
        body = {
          search_keyword: search.trim(),
          page: page.toString(),
          limit: ITEMS_PER_PAGE.toString(),
        }
      } else {
        // Use regular paginated endpoint
        apiUrl = websiteCustomer.GET_ALL_PAGINATED_CUSTOMERS_DATA
        body = {
          page: page.toString(),
          limit: ITEMS_PER_PAGE.toString(),
        }
      }

      const response = await authFetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      // Both endpoints answer 404 "Customers not found" for an empty page/search.
      if (response.status === 404) {
        setCustomers([])
        setTotalPages(1)
        setTotalCustomers(0)
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: CustomersApiResponse = await response.json()
      
      console.log('Customers API Response:', data) // Debug log
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch customers")
      }

      // Handle both possible response structures
      const customersArray = data.data.customersData || data.data.customerData || []
      
      setCustomers(customersArray)
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
  // Get registration type — backend: CustomerType = { WebsiteRegistration: 1, AdminPanelRegistration: 2 }
  const getRegistrationType = (type: number) => {
    return type === 1 ? "Website" : "Admin Panel"
  }
  
  const handleViewBookings = (customerId: string, customerName: string) => {
    // Navigate to the dedicated bookings page
    router.push(`/${role}/customers/${customerId}/bookings`)
  }

  const handleViewDetails = (customerId: string) => {
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
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
            {loading && (
              <Loader2 className="absolute right-12 top-1/2 transform -translate-y-1/2 text-primary h-4 w-4 animate-spin z-10" />
            )}
            <Input
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-20 h-12 bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base transition-all duration-200 shadow-inner"
              disabled={loading}
              autoComplete="off"
            />
            <Button 
              type="submit" 
              size="sm" 
              className="absolute right-1 top-1 h-10"
              disabled={loading || !searchTerm.trim()}
            >
              Search
            </Button>
            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          </form>
          
          {/* Search status and clear button */}
          {debouncedSearchTerm && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <span className="text-sm text-muted-foreground">
                {loading ? "Searching..." : `Showing results for "${debouncedSearchTerm}"`}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchTerm("")
                  setDebouncedSearchTerm("")
                  setCurrentPage(1)
                }}
                disabled={loading}
                className="h-7 px-2 text-xs"
              >
                Clear Search
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Customers</span>
            <div className="text-sm text-muted-foreground">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {debouncedSearchTerm ? "Searching..." : "Loading..."}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{totalCustomers} customers found</span>
                  {debouncedSearchTerm && (
                    <Badge variant="outline" className="text-xs">
                      Search: "{debouncedSearchTerm}"
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {debouncedSearchTerm 
              ? `Search results for "${debouncedSearchTerm}". Use the API search to find specific customers.`
              : "View website-signed-up customers and their details. Use search to find specific customers via API."
            }
          </CardDescription>
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
                  <p className="text-base font-medium text-muted-foreground">
                    {debouncedSearchTerm ? "No customers found for this search" : "No customers found"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {debouncedSearchTerm 
                      ? "Try adjusting your search terms or clear the search to view all customers" 
                      : "No customers have been registered yet"
                    }
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
                          <Eye className="mr-2 h-4 w-4" /> View Bookings
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
                    
                    {/* Show first page */}
                    {currentPage > 3 && totalPages > 5 && (
                      <>
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              handlePageChange(1)
                            }}
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                        {currentPage > 4 && <span className="px-2">...</span>}
                      </>
                    )}
                    
                    {/* Show pages around current page */}
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === pageNum}
                            onClick={(e) => {
                              e.preventDefault()
                              handlePageChange(pageNum)
                            }}
                            className={currentPage === pageNum ? "bg-primary text-primary-foreground font-semibold" : ""}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                    
                    {/* Show last page */}
                    {currentPage < totalPages - 2 && totalPages > 5 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              handlePageChange(totalPages)
                            }}
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                    
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
                router.push(`/${role}/customers/${selectedCustomer._id}/bookings`)
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
