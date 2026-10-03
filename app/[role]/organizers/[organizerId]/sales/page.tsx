"use client"

import { authFetch } from "@/lib/auth-fetch"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { organizerEndpoint } from "@/lib/api-endpoints"
import type { UserRole } from "@/lib/navigation"
import {
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  IndianRupee,
  FileText,
  Trash2,
  X,
  ArrowLeft,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface OrganizerSalesPageProps {
  params: Promise<{ role: UserRole; organizerId: string }> | { role: UserRole; organizerId: string }
}

// Sales data interfaces
interface SalesEvent {
  _id: string
  event_id: string
  EventName: string
  EventStartDate: string
  totalOnlineSales: number
  totalPromoterSales: number
  totalConvenienceFeeAmount: number
  totalSales: number
  PendingAmount: number
}

interface SalesDataResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: string
    totalEvents: number
    EventsData: SalesEvent[]
  }
}

interface TotalSalesDataResponse {
  error: boolean
  message: string
  data: {
    totalEventCount: number
    totalSalesSum: number
    totalPendingAmountSum: number
    totalConvenienceFeeAmountSum: number
  }
}

interface Payment {
  _id: string
  Date: string
  Remark?: string
  AmountRecived: number
}

interface PaymentResponse {
  error: boolean
  message: string
  data: Payment[]
}

const ITEMS_PER_PAGE = 10

export default function OrganizerSalesPage({ params }: OrganizerSalesPageProps) {
  const resolvedParams = React.use(params instanceof Promise ? params : Promise.resolve(params))
  const { role, organizerId } = resolvedParams
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // State management
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [apiError, setApiError] = React.useState<string | null>(null)

  // Sales data state
  const [salesData, setSalesData] = React.useState<SalesEvent[]>([])
  const [originalSalesData, setOriginalSalesData] = React.useState<SalesEvent[]>([])
  const [totalSalesData, setTotalSalesData] = React.useState<TotalSalesDataResponse['data'] | null>(null)

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false)
  const [selectedEventId, setSelectedEventId] = React.useState<string>("")
  const [payments, setPayments] = React.useState<Payment[]>([])
  const [paymentLoading, setPaymentLoading] = React.useState(false)

  // Payment form state
  const [paymentForm, setPaymentForm] = React.useState({
    date: "",
    remark: "",
    amount: "",
  })

  // Organizer info
  const [organizerInfo, setOrganizerInfo] = React.useState<any>(null)

  // Debounce search term
  React.useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(delay)
  }, [searchTerm])

  // salesData supports search_keyword (EventName regex), so search runs on the server
  // across every page instead of only the 10 events already loaded.
  const lastSearchRef = React.useRef("")
  React.useEffect(() => {
    // The initial load below already fetched with an empty search.
    if (lastSearchRef.current === debouncedSearchTerm) return
    lastSearchRef.current = debouncedSearchTerm
    if (organizerId && user) {
      setCurrentPage(1)
      fetchSalesData(1, debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])

  // Fetch organizer info
  const fetchOrganizerInfo = async () => {
    try {
      const authToken = getValidToken()
      if (!authToken) return

      const response = await authFetch(organizerEndpoint.GET_ORGANIZER_DATA_BY_ID_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        // /organizer/getById reads user_id, not organizer_id.
        body: JSON.stringify({ user_id: organizerId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.error) {
          setOrganizerInfo(data.data)
        }
      }
    } catch (error) {
      console.error("Error fetching organizer info:", error)
    }
  }

  // Fetch total sales data
  const fetchTotalSalesData = async () => {
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        setApiError("Authentication required")
        return
      }

      const response = await authFetch(organizerEndpoint.ORGANIZER_TOTAL_SALES_DATA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ organizer_id: organizerId }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: TotalSalesDataResponse = await response.json()
      if (data.error) {
        // Don't show error for "Not Found" cases - this is normal when no data exists
        if (data.message?.toLowerCase().includes('not found')) {
          setTotalSalesData(null)
          return
        }
        throw new Error(data.message || "Failed to fetch total sales data")
      }

      setTotalSalesData(data.data)
    } catch (error) {
      console.error("Error fetching total sales data:", error)
      // Only set API error for actual errors, not for "not found" cases
      if (error instanceof Error && !error.message.toLowerCase().includes('not found')) {
        setApiError("Failed to fetch total sales data")
      }
    }
  }

  // Fetch sales data with pagination
  const fetchSalesData = async (page: number = 1, search: string = debouncedSearchTerm) => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = getValidToken()
      if (!user || !authToken) {
        setApiError("Authentication required")
        return
      }

      const payload: Record<string, string> = {
        organizer_id: organizerId,
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      }
      if (search.trim()) {
        payload.search_keyword = search.trim()
      }

      const response = await authFetch(organizerEndpoint.ORGANIZER_SALES_DATA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      // 404 "Events not found" = organizer has no (matching) events, not a failure.
      if (response.status === 404) {
        setSalesData([])
        setOriginalSalesData([])
        setTotalPages(1)
        setCurrentPage(1)
        return
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: SalesDataResponse = await response.json()
      if (data.error) {
        // Don't show error for "Not Found" cases - this is normal when no data exists
        if (data.message?.toLowerCase().includes('not found')) {
          setSalesData([])
          setOriginalSalesData([])
          setTotalPages(1)
          setCurrentPage(1)
          return
        }
        throw new Error(data.message || "Failed to fetch sales data")
      }

      setSalesData(data.data.EventsData || [])
      setOriginalSalesData(data.data.EventsData || [])
      setTotalPages(data.data.totalPages || 1)
      setCurrentPage(parseInt(data.data.currentPage) || page)
    } catch (error) {
      console.error("Error fetching sales data:", error)
      // Only set API error for actual errors, not for "not found" cases
      if (error instanceof Error && !error.message.toLowerCase().includes('not found')) {
        setApiError("Failed to fetch sales data")
      }
      setSalesData([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch payments for an event
  const fetchPayments = async (eventId: string) => {
    try {
      setPaymentLoading(true)
      
      const authToken = getValidToken()
      if (!authToken) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive"
        })
        return
      }

      const response = await authFetch(organizerEndpoint.GET_ALL_ORGANIZER_PAYMENTS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ event_id: eventId }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: PaymentResponse = await response.json()
      if (data.error) {
        if (response.status === 404) {
          // No payments found is not an error
          setPayments([])
          return
        }
        throw new Error(data.message || "Failed to fetch payments")
      }

      setPayments(data.data.reverse() || []) // Reverse to show latest first
    } catch (error) {
      console.error("Error fetching payments:", error)
      setPayments([])
      if (error instanceof Error && !error.message.includes("404")) {
        toast({
          title: "Error",
          description: "Failed to fetch payment data",
          variant: "destructive"
        })
      }
    } finally {
      setPaymentLoading(false)
    }
  }

  // Add payment
  const handleAddPayment = async () => {
    if (!paymentForm.date) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive"
      })
      return
    }

    if (!paymentForm.amount) {
      toast({
        title: "Error",
        description: "Please enter amount",
        variant: "destructive"
      })
      return
    }

    try {
      const authToken = getValidToken()
      if (!authToken) {
        throw new Error("Authentication required")
      }

      const payload: any = {
        event_id: selectedEventId,
        Amount: paymentForm.amount,
        Date: paymentForm.date,
      }

      if (paymentForm.remark) {
        payload.Remark = paymentForm.remark
      }

      const response = await authFetch(organizerEndpoint.ADD_PAYMENT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      // Read the body first: a 409 carries "Pending Amount is X", which is the message
      // the user needs when the amount is more than what is still owed.
      const data = await response.json().catch(() => null)
      if (!response.ok || data?.error) {
        throw new Error(data?.message || `API error: ${response.status}`)
      }

      toast({
        title: "Success",
        description: "Payment added successfully"
      })

      // Reset form
      setPaymentForm({ date: "", remark: "", amount: "" })

      // Refresh payments, totals and the table's Pending Amount column
      await Promise.all([
        fetchPayments(selectedEventId),
        fetchTotalSalesData(),
        fetchSalesData(currentPage),
      ])
    } catch (error) {
      console.error("Error adding payment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add payment",
        variant: "destructive"
      })
    }
  }

  // Delete payment
  const handleDeletePayment = async (paymentId: string) => {
    try {
      const authToken = getValidToken()
      if (!authToken) {
        throw new Error("Authentication required")
      }

      const response = await authFetch(organizerEndpoint.DELETE_PAYMENT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ paymentaccount_id: paymentId }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.message || "Failed to delete payment")
      }

      toast({
        title: "Success",
        description: "Payment deleted successfully"
      })

      // Refresh payments, totals and the table's Pending Amount column
      await Promise.all([
        fetchPayments(selectedEventId),
        fetchTotalSalesData(),
        fetchSalesData(currentPage),
      ])
    } catch (error) {
      console.error("Error deleting payment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete payment",
        variant: "destructive"
      })
    }
  }

  // Open payment modal
  const openPaymentModal = (eventId: string) => {
    setSelectedEventId(eventId)
    setIsPaymentModalOpen(true)
    fetchPayments(eventId)
  }

  // Close payment modal
  const closePaymentModal = () => {
    setIsPaymentModalOpen(false)
    setSelectedEventId("")
    setPayments([])
    setPaymentForm({ date: "", remark: "", amount: "" })
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchSalesData(page)
  }

  // Format amount
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN')
    } catch {
      return dateString
    }
  }

  // Initialize data
  React.useEffect(() => {
    if (organizerId) {
      fetchOrganizerInfo()
      fetchTotalSalesData()
      fetchSalesData(1)
    }
  }, [organizerId, user])

  // Search and paging both happen on the server, so the rows are already the current page.
  const paginatedSalesData = salesData
  const totalPagesForSearch = totalPages

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${role}/organizers`)}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Sales Data</h1>
          {organizerInfo && (
            <p className="text-muted-foreground">
              {organizerInfo.FullName} ({organizerInfo.CompanyName})
            </p>
          )}
        </div>
      </div>

      {/* API Error Alert */}
      {/* {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {apiError}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => {
                setApiError(null)
                fetchSalesData(currentPage)
                fetchTotalSalesData()
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )} */}

      {/* Sales Summary Cards */}
      {totalSalesData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Total Events</div>
              <div className="text-2xl font-bold">{totalSalesData.totalEventCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Total Sales</div>
              <div className="text-2xl font-bold">{formatAmount(totalSalesData.totalSalesSum)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Convenience Fee</div>
              <div className="text-2xl font-bold">{formatAmount(totalSalesData.totalConvenienceFeeAmountSum)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Pending Amount</div>
              <div className="text-2xl font-bold text-red-600">{formatAmount(totalSalesData.totalPendingAmountSum)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Data</CardTitle>
          <CardDescription>
            View sales data for each event.
            {loading && " Loading..."}
            {!loading && ` (${salesData.length} events found)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading sales data...</span>
            </div>
          ) : paginatedSalesData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchTerm ? `No events found matching "${searchTerm}"` : "No sales data found"}
              </div>
              {searchTerm && (
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSearchTerm("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Event Date</TableHead>
                      <TableHead>Total Sales</TableHead>
                      <TableHead>Online Sales</TableHead>
                      <TableHead>Promoter Sales</TableHead>
                      <TableHead>Convenience Fee</TableHead>
                      <TableHead>Pending Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSalesData.map((event) => (
                      <TableRow key={event._id}>
                        <TableCell className="font-medium">{event.EventName}</TableCell>
                        <TableCell>{formatDate(event.EventStartDate)}</TableCell>
                        <TableCell className="font-semibold">{formatAmount(event.totalSales)}</TableCell>
                        <TableCell>{formatAmount(event.totalOnlineSales)}</TableCell>
                        <TableCell>{formatAmount(event.totalPromoterSales)}</TableCell>
                        <TableCell>{formatAmount(event.totalConvenienceFeeAmount)}</TableCell>
                        <TableCell className="text-red-600 font-semibold">{formatAmount(event.PendingAmount)}</TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => openPaymentModal(event.event_id)}
                          >
                            Accounts
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPagesForSearch > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage > 1) {
                            if (debouncedSearchTerm) {
                              setCurrentPage(currentPage - 1)
                            } else {
                              handlePageChange(currentPage - 1)
                            }
                          }
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {[...Array(Math.min(totalPagesForSearch, 10))].map((_, i) => {
                      const page = i + 1
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === page}
                            onClick={(e) => {
                              e.preventDefault()
                              if (debouncedSearchTerm) {
                                setCurrentPage(page)
                              } else {
                                handlePageChange(page)
                              }
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage < totalPagesForSearch) {
                            if (debouncedSearchTerm) {
                              setCurrentPage(currentPage + 1)
                            } else {
                              handlePageChange(currentPage + 1)
                            }
                          }
                        }}
                        className={currentPage === totalPagesForSearch ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payment Notes
            </DialogTitle>
            <DialogDescription>Add and manage payment notes for this event.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Add Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-date">Date *</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-remark">Remark</Label>
                    <Input
                      id="payment-remark"
                      placeholder="Payment remark"
                      value={paymentForm.remark}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, remark: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Received Amount *</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      placeholder="Amount"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddPayment} className="w-full">
                      <IndianRupee className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payments List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading payments...</span>
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">No payments found for this event.</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment._id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Date</Label>
                            <div className="font-medium">{formatDate(payment.Date)}</div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Remark</Label>
                            <div className="font-medium">{payment.Remark || "N/A"}</div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Amount Received</Label>
                            <div className="font-semibold text-green-600">{formatAmount(payment.AmountRecived)}</div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePayment(payment._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={closePaymentModal}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
