"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { promocodeEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { Promocode, PromocodesApiResponse, PromocodeType, PromocodeStatus } from "@/lib/types"
import { formatDate } from "@/lib/utils"

const statusColors: Record<number, string> = {
  0: "bg-gray-100 text-gray-800",    // Inactive
  1: "bg-green-100 text-green-800",  // Active
  2: "bg-red-100 text-red-800"       // Disabled
}

const statusLabels: Record<number, string> = {
  0: "Inactive",
  1: "Active", 
  2: "Disabled"
}

const typeLabels: Record<number, string> = {
  1: "Fixed Amount",
  2: "Percentage"
}

export default function PromocodesPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [promocodes, setPromocodes] = useState<Promocode[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPromocodes, setTotalPromocodes] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  const itemsPerPage = 10

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when searching
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchPromocodes = useCallback(async (page: number = 1, search: string = "", status: string = "all") => {
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
        limit: itemsPerPage.toString(),
      }
      
      if (search.trim()) {
        body.search = search.trim()
      }
      
      if (status !== "all") {
        body.status = status
      }

      const response = await fetch(promocodeEndPoint.GET_ALL_PAGINATED_PROMOCODES_DATA, {
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

      const data: PromocodesApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch promocodes")
      }

      setPromocodes(data.data.PromocodeData || [])
      setTotalPages(data.data.totalPages || 1)
      setCurrentPage(data.data.currentPage || 1)
      setTotalPromocodes(data.data.totalPromocodes || 0)
      
    } catch (error) {
      console.error("Error fetching promocodes:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch promocodes"
      setApiError(errorMessage)
      setShowErrorDialog(true)
      setPromocodes([])
      setTotalPages(1)
      setTotalPromocodes(0)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Load data on mount and when dependencies change
  useEffect(() => {
    fetchPromocodes(currentPage, debouncedSearchTerm, statusFilter)
  }, [fetchPromocodes, currentPage, debouncedSearchTerm, statusFilter])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    fetchPromocodes(currentPage, debouncedSearchTerm, statusFilter)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const handleCreatePromocode = () => {
    // TODO: Implement create promocode functionality
    toast({
      title: "Feature Coming Soon",
      description: "Create promocode functionality will be available soon.",
    })
    setIsCreateDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promocodes</h1>
          <p className="text-muted-foreground">Manage discount codes and promotional offers</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Promocode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Promocode</DialogTitle>
              <DialogDescription>
                This feature will be available soon.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setIsCreateDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search promocodes..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="1">Active</SelectItem>
            <SelectItem value="0">Inactive</SelectItem>
            <SelectItem value="2">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {apiError && showErrorDialog && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {apiError}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => setShowErrorDialog(false)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Promocodes 
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({totalPromocodes} total)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Overview of all promotional codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading promocodes...</span>
            </div>
          ) : promocodes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" ? "No promocodes found matching your criteria" : "No promocodes found"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Min Amount</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>One Time Use</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promocodes.map((promocode) => (
                    <TableRow key={promocode._id}>
                      <TableCell className="font-medium">{promocode.PromoCodeName}</TableCell>
                      <TableCell>{typeLabels[promocode.PromocodeType] || 'Unknown'}</TableCell>
                      <TableCell>
                        {promocode.PromocodeType === 2 
                          ? `${promocode.Value}%` 
                          : formatCurrency(promocode.Value)
                        }
                      </TableCell>
                      <TableCell>{formatCurrency(promocode.MinCheckoutAmount)}</TableCell>
                      <TableCell>{formatDate(promocode.ExpiryDate)}</TableCell>
                      <TableCell>
                        <Badge variant={promocode.OneTimeUseFlag === 1 ? "default" : "secondary"}>
                          {promocode.OneTimeUseFlag === 1 ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[promocode.status] || "bg-gray-100 text-gray-800"}>
                          {statusLabels[promocode.status] || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toast({
                              title: "Feature Coming Soon",
                              description: "Edit functionality will be available soon.",
                            })}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => toast({
                              title: "Feature Coming Soon",
                              description: "Delete functionality will be available soon.",
                            })}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              {apiError}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>Close</Button>
            <Button onClick={handleRefresh} variant="outline">Retry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
