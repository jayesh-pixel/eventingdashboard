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
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, PlusCircle, Edit, KeyRound, Loader2, AlertCircle } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { promoterEndpoint } from "@/lib/api-endpoints"
import { mockPromoters } from "@/lib/mock-data"
import type { UserRole } from "@/lib/navigation"

interface PromotersPageProps {
  params: Promise<{ role: UserRole }> | { role: UserRole }
}

interface Promoter {
  _id: string
  promoterName: string
  email: string
  phone: string
  status: "Active" | "Inactive" | "Disabled"
  commissionRate: number // Percentage
  totalSalesGenerated: number
  createdAt: string
}

const ITEMS_PER_PAGE = 10

export default function PromotersPage({ params }: PromotersPageProps) {
  // Handle both Promise and direct params
  const resolvedParams = React.use(
    params instanceof Promise ? params : Promise.resolve(params)
  )
  const { role } = resolvedParams
  const { toast } = useToast()
  const { user } = useAuth()

  const [promoters, setPromoters] = React.useState<Promoter[]>([])
  const [originalData, setOriginalData] = React.useState<Promoter[]>([])
  const [loading, setLoading] = React.useState(true)
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [useMockData, setUseMockData] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingPromoter, setEditingPromoter] = React.useState<Promoter | null>(null)

  const [formData, setFormData] = React.useState({
    promoterName: "",
    email: "",
    phone: "",
    commissionRate: "",
    password: "",
  })

  // Normalize promoter data to ensure consistent structure
  const normalizePromotersData = (data: any[]): Promoter[] => {
    return data.map((item: any) => ({
      _id: item._id || item.id || `prm${Date.now()}${Math.random()}`,
      promoterName: item.promoterName || item.name || item.FullName || "Unknown Promoter",
      email: item.email || item.Email || "",
      phone: item.phone || item.Phone1 || item.phoneNumber || "",
      status: item.status || item.Status || "Active",
      commissionRate: item.commissionRate || item.commission || 0,
      totalSalesGenerated: item.totalSalesGenerated || item.totalSales || 0,
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    }))
  }

  // Fetch all promoters data with improved error handling
  const getAllPromotersData = async () => {
    try {
      setLoading(true)
      setApiError(null)

      // Check if we have a user and auth token
      const authToken = localStorage.getItem("authToken")
      const storedUser = localStorage.getItem("authUser")

      console.log("Debug localStorage:")
      console.log("- authToken:", authToken ? "present" : "missing")
      console.log("- authUser:", storedUser ? "present" : "missing")
      console.log("- current user object:", user)

      if (!user || !authToken) {
        console.error("No user or auth token available")
        setApiError("Authentication required. Please log in to view promoters.")
        setLoading(false)
        return
      }

      // Use paginated endpoint for better performance, fallback to regular endpoint
      let apiEndpoint = promoterEndpoint.GET_ALL_PROMOTER_DATA_PAGINATED_URL
      let requestPayload: any = {
        page: 1,
        limit: 100, // Get more records initially
      }

      console.log("Fetching promoters...")
      console.log("Using endpoint:", apiEndpoint)
      console.log("Request payload:", requestPayload)

      let response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestPayload),
      })

      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)

      // If paginated endpoint fails, try the regular endpoint
      if (!response.ok && response.status === 404) {
        console.log("Paginated endpoint failed, trying regular endpoint...")
        apiEndpoint = promoterEndpoint.GET_ALL_PROMOTER_DATA_URL
        
        response = await fetch(apiEndpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        })
        
        console.log("Fallback response status:", response.status)
        console.log("Fallback response ok:", response.ok)
      }

      if (!response.ok) {
        // Try to get error details from response
        let errorText = ""
        let errorData = null
        try {
          errorText = await response.text()
          console.error("Error response:", errorText)
          
          // Try to parse as JSON to get structured error
          try {
            errorData = JSON.parse(errorText)
          } catch (e) {
            // Not JSON, use as plain text
          }
        } catch (e) {
          console.error("Could not read error response")
        }

        // Handle 404 "not found" responses as empty data rather than errors
        if (response.status === 404 && errorData && 
            (errorData.message?.toLowerCase().includes('not found') || 
             errorData.message?.toLowerCase().includes('no data'))) {
          console.log("API returned 404 - no promoters found, treating as empty dataset")
          setPromoters([])
          setOriginalData([])
          setUseMockData(false)
          setApiError(null)
          
          toast({
            title: "No Data",
            description: "No promoters found in the system.",
          })
          setLoading(false)
          return
        }

        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
      }

      const data = await response.json()
      console.log("Raw API response:", data)

      // Handle different possible response structures
      let promotersArray = []
      
      // First check if the response has the standard API wrapper format
      if (data.error === false && data.data) {
        console.log("Found standard API wrapper, extracting data:", data.data)
        const innerData = data.data
        
        // Check if data.data is an array
        if (Array.isArray(innerData)) {
          promotersArray = innerData
        } else if (typeof innerData === 'object') {
          // Handle case where data.data is an object that contains arrays
          console.log("Data object structure:", innerData)
          console.log("Data object keys:", Object.keys(innerData))
          
          // Look for common array property names in data.data
          if (innerData.promoters && Array.isArray(innerData.promoters)) {
            promotersArray = innerData.promoters
          } else if (innerData.users && Array.isArray(innerData.users)) {
            promotersArray = innerData.users
          } else if (innerData.records && Array.isArray(innerData.records)) {
            promotersArray = innerData.records
          } else if (innerData.items && Array.isArray(innerData.items)) {
            promotersArray = innerData.items
          } else if (innerData.list && Array.isArray(innerData.list)) {
            promotersArray = innerData.list
          } else {
            // Try to find any array in data.data
            const possibleArrays = Object.values(innerData).filter(value => Array.isArray(value))
            if (possibleArrays.length > 0) {
              console.log("Found arrays in data.data:", possibleArrays)
              promotersArray = possibleArrays[0] as any[]
            } else {
              // Search recursively for arrays in nested objects
              const findArraysRecursively = (obj: any): any[] => {
                if (Array.isArray(obj)) return obj
                if (typeof obj === 'object' && obj !== null) {
                  for (const value of Object.values(obj)) {
                    if (Array.isArray(value)) return value
                    if (typeof value === 'object' && value !== null) {
                      const found = findArraysRecursively(value)
                      if (found.length > 0) return found
                    }
                  }
                }
                return []
              }
              
              const foundArray = findArraysRecursively(innerData)
              if (foundArray.length > 0) {
                console.log("Found array recursively:", foundArray)
                promotersArray = foundArray
              }
            }
          }
        }
      } else if (Array.isArray(data)) {
        promotersArray = data
      } else if (data.data && Array.isArray(data.data)) {
        promotersArray = data.data
      } else if (data.data && typeof data.data === 'object') {
        // Handle case where data.data is an object that contains arrays
        console.log("Data object structure:", data.data)
        console.log("Data object keys:", Object.keys(data.data))
        
        // Look for common array property names in data.data
        if (data.data.promoters && Array.isArray(data.data.promoters)) {
          promotersArray = data.data.promoters
        } else if (data.data.users && Array.isArray(data.data.users)) {
          promotersArray = data.data.users
        } else if (data.data.records && Array.isArray(data.data.records)) {
          promotersArray = data.data.records
        } else if (data.data.items && Array.isArray(data.data.items)) {
          promotersArray = data.data.items
        } else if (data.data.list && Array.isArray(data.data.list)) {
          promotersArray = data.data.list
        } else {
          // Try to find any array in data.data
          const possibleArrays = Object.values(data.data).filter(value => Array.isArray(value))
          if (possibleArrays.length > 0) {
            console.log("Found arrays in data.data:", possibleArrays)
            promotersArray = possibleArrays[0] as any[]
          }
        }
      } else if (data.promoters && Array.isArray(data.promoters)) {
        promotersArray = data.promoters
      } else if (data.result && Array.isArray(data.result)) {
        promotersArray = data.result
      } else if (data.users && Array.isArray(data.users)) {
        promotersArray = data.users
      } else if (data.records && Array.isArray(data.records)) {
        promotersArray = data.records
      } else if (data.items && Array.isArray(data.items)) {
        promotersArray = data.items
      } else if (data.list && Array.isArray(data.list)) {
        promotersArray = data.list
      } else {
        console.warn("Unexpected API response structure:", data)
        console.warn("Available keys:", Object.keys(data))
        
        // Try to find any array in the response
        const possibleArrays = Object.values(data).filter(value => Array.isArray(value))
        if (possibleArrays.length > 0) {
          console.log("Found arrays in response:", possibleArrays)
          promotersArray = possibleArrays[0] as any[]
        } else {
          // Last resort: look deeper into nested objects
          const allArrays: any[] = []
          const findArraysRecursively = (obj: any, depth = 0) => {
            if (depth > 3) return // Prevent infinite recursion
            if (Array.isArray(obj)) {
              allArrays.push(obj)
            } else if (obj && typeof obj === 'object') {
              Object.values(obj).forEach(value => findArraysRecursively(value, depth + 1))
            }
          }
          
          findArraysRecursively(data)
          
          if (allArrays.length > 0) {
            console.log("Found arrays recursively:", allArrays)
            // Use the largest array (most likely to contain the data)
            promotersArray = allArrays.reduce((largest, current) => 
              current.length > largest.length ? current : largest, []
            )
          } else {
            console.warn("No arrays found in response")
            throw new Error("API returned unexpected format - no promoters array found")
          }
        }
      }

      console.log("Extracted promoters array:", promotersArray)

      if (promotersArray.length === 0) {
        console.warn("No promoters found in API response")
        setPromoters([])
        setOriginalData([])
        setUseMockData(false)
        setApiError(null)
        
        toast({
          title: "No Data",
          description: "No promoters found in the system.",
        })
        return
      }

      // Normalize and set the data
      const normalizedData = normalizePromotersData(promotersArray)
      console.log("Final normalized data:", normalizedData)

      setPromoters(normalizedData)
      setOriginalData(normalizedData)
      setUseMockData(false)
      setApiError(null)

      toast({
        title: "Success",
        description: `Loaded ${normalizedData.length} promoters from API`,
      })
    } catch (error) {
      console.error("Error in getAllPromotersData:", error)
      
      // Extract meaningful error message
      let errorMessage = "Failed to load promoters"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setApiError(errorMessage)
      setPromoters([])
      setOriginalData([])
      setUseMockData(false)
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Search with debounce
  React.useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 700)

    return () => clearTimeout(delay)
  }, [searchTerm])

  React.useEffect(() => {
    if (debouncedSearchTerm === "") {
      setPromoters(originalData)
      return
    }

    // Filter locally or use API search
    const filtered = originalData.filter((promoter) =>
      promoter.promoterName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      promoter.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
    setPromoters(filtered)
    setCurrentPage(1) // Reset to first page when searching
  }, [debouncedSearchTerm, originalData])

  // Load data on component mount
  React.useEffect(() => {
    getAllPromotersData()
  }, [user])

  const filteredPromoters = React.useMemo(() => {
    if (!searchTerm) return promoters
    return promoters.filter((prm) => 
      prm.promoterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prm.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [promoters, searchTerm])

  const totalPages = Math.ceil(filteredPromoters.length / ITEMS_PER_PAGE)
  const currentPromoters = filteredPromoters.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => setCurrentPage(page)

  const resetForm = () => {
    setFormData({ promoterName: "", email: "", phone: "", commissionRate: "", password: "" })
    setEditingPromoter(null)
  }

  const handleFormSubmit = async () => {
    if (!formData.promoterName || !formData.email || !formData.commissionRate) {
      toast({ title: "Error", description: "Name, Email, and Commission Rate are required.", variant: "destructive" })
      return
    }
    setLoading(true)
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    if (editingPromoter) {
      setPromoters(
        promoters.map((prm) =>
          prm._id === editingPromoter._id
            ? {
                ...editingPromoter,
                ...formData,
                commissionRate: Number.parseFloat(formData.commissionRate),
                totalSalesGenerated: prm.totalSalesGenerated,
              }
            : prm,
        ),
      )
      toast({ title: "Success", description: "Promoter updated." })
    } else {
      const newPromoter: Promoter = {
        _id: `prm${Date.now()}`,
        promoterName: formData.promoterName,
        email: formData.email,
        phone: formData.phone,
        commissionRate: Number.parseFloat(formData.commissionRate),
        status: "Active",
        totalSalesGenerated: 0,
        createdAt: new Date().toISOString(),
      }
      setPromoters([newPromoter, ...promoters])
      setOriginalData([newPromoter, ...originalData])
      toast({ title: "Success", description: "Promoter created." })
    }
    setLoading(false)
    setIsFormOpen(false)
    resetForm()
  }

  const handleEdit = (promoter: Promoter) => {
    setEditingPromoter(promoter)
    setFormData({
      promoterName: promoter.promoterName,
      email: promoter.email,
      phone: promoter.phone,
      commissionRate: promoter.commissionRate.toString(),
      password: "",
    })
    setIsFormOpen(true)
  }

  const handleDisable = async (promoterId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    const updatedPromoters = promoters.map((prm) =>
      prm._id === promoterId ? { ...prm, status: prm.status === "Disabled" ? "Active" : "Disabled" } as Promoter : prm
    )
    const updatedOriginalData = originalData.map((prm) =>
      prm._id === promoterId ? { ...prm, status: prm.status === "Disabled" ? "Active" : "Disabled" } as Promoter : prm
    )
    
    setPromoters(updatedPromoters)
    setOriginalData(updatedOriginalData)
    toast({ title: "Success", description: "Promoter status updated." })
    setLoading(false)
  }

  const handleResetPassword = async (promoterId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast({ title: "Success", description: `Password reset link sent to promoter ${promoterId}.` })
    setLoading(false)
  }

  const handleRefresh = () => {
    setSearchTerm("")
    setCurrentPage(1)
    getAllPromotersData()
  }

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Promoters Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setIsFormOpen(true)
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Promoter
          </Button>
        </div>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {apiError}
            {useMockData && (
              <Button variant="link" className="h-auto p-0 ml-2" onClick={handleRefresh}>
                Try again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Filter by Promoter Name or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Promoters</CardTitle>
          <CardDescription>
            View and manage event promoters.
            {useMockData && <span className="text-orange-600"> (Sample Data)</span>}
            {!loading && !useMockData && ` (${promoters.length} total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading promoters...</span>
            </div>
          ) : currentPromoters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? `No promoters found matching "${searchTerm}"` : "No promoters found"}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="text-center">Commission</TableHead>
                    <TableHead className="text-right">Sales Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPromoters.map((prm) => (
                    <TableRow key={prm._id}>
                      <TableCell className="font-medium">{prm.promoterName}</TableCell>
                      <TableCell className="hidden md:table-cell">{prm.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">{prm.phone}</TableCell>
                      <TableCell className="text-center">{prm.commissionRate}%</TableCell>
                      <TableCell className="text-right">${prm.totalSalesGenerated.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            prm.status === "Active" ? "default" : prm.status === "Inactive" ? "secondary" : "destructive"
                          }
                        >
                          {prm.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={loading}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(prm)}>
                              <Edit className="mr-2 h-4 w-4" /> View & Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDisable(prm._id)}>
                              {prm.status === "Disabled" ? "Enable" : "Disable"} Promoter
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(prm._id)}>
                              <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

      {/* Add/Edit Promoter Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPromoter ? "Edit Promoter" : "Add New Promoter"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="promoterName">Promoter Name</Label>
              <Input
                id="promoterName"
                value={formData.promoterName}
                onChange={(e) => setFormData({ ...formData, promoterName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
              />
            </div>
            {!editingPromoter && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsFormOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingPromoter ? "Save Changes" : "Create Promoter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
