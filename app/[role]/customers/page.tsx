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
import type { Customer, CustomersApiResponse } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when searching
    }, 300)
    return () => clearTimeout(timer)
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

      const body = {
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(search && { search }) // Add search if provided
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

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return "N/A"
    }
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
    // Placeholder: In a real app, navigate to a dedicated customer bookings page
    // For now, we can log or show a toast.
    // router.push(`/${role}/customers/${customerId}/bookings`);
    toast({
      title: "View Bookings",
      description: `Navigating to bookings for ${customerName} (ID: ${customerId}). This page is not yet implemented.`,
    })
    console.log(`View bookings for customer ID: ${customerId}`)
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 h-12 bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base transition-all duration-200 shadow-inner"
              disabled={loading}
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
                      <TableCell>
                        <Button 
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
