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
import { MoreHorizontal, PlusCircle, Eye, KeyRound, DollarSign, FilePlus, Loader2, Search, AlertCircle } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UserRole } from "@/lib/navigation"
import { organizerEndpoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { mockOrganizers } from "@/lib/mock-data"

interface OrganizersPageProps {
  params: Promise<{ role: UserRole }> | { role: UserRole }
}

interface Organizer {
  _id: string
  organizerName: string
  email: string
  phone: string
  status: "Active" | "Inactive" | "Disabled"
  totalEvents: number
  totalSales: number
  convenienceFeeCharged: number
  pendingAmount: number
  createdAt: string
}

const ITEMS_PER_PAGE = 10

export default function OrganizersPage({ params }: OrganizersPageProps) {
  // Handle params as either a Promise or direct object
  const resolvedParams = React.use(params instanceof Promise ? params : Promise.resolve(params))
  const { role } = resolvedParams
  const { toast } = useToast()
  const { user } = useAuth()

  const [organizers, setOrganizers] = React.useState<Organizer[]>([])
  const [originalData, setOriginalData] = React.useState<Organizer[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingOrganizer, setEditingOrganizer] = React.useState<Organizer | null>(null)
  const [isAccountManagerOpen, setIsAccountManagerOpen] = React.useState(false)
  const [selectedOrganizerForAccounts, setSelectedOrganizerForAccounts] = React.useState<Organizer | null>(null)
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [useMockData, setUseMockData] = React.useState(false)

  const [formData, setFormData] = React.useState({
    organizerName: "",
    email: "",
    phone: "",
    password: "",
  })

  const [accountFormData, setAccountFormData] = React.useState({
    date: "",
    remark: "",
    amountReceived: "",
  })

  // Fetch organizers data with API integration
  const fetchOrganizers = async () => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = localStorage.getItem("authToken")
      if (!user || !authToken) {
        console.error("No user or auth token available")
        setApiError("Authentication required. Please log in to view organizers.")
        setLoading(false)
        return
      }

      console.log("Fetching organizers with API...")
      const response = await fetch(organizerEndpoint.GET_ALL_ORGANIZERS_DATA_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("Organizers API response:", data)

      // Handle different response structures
      let organizersData = []
      if (data.organizers) {
        organizersData = data.organizers
      } else if (Array.isArray(data)) {
        organizersData = data
      } else if (data.data && Array.isArray(data.data)) {
        organizersData = data.data
      }

      // Normalize the data to match our interface
      const normalizedOrganizers = organizersData.map((org: any) => ({
        _id: org._id || org.id,
        organizerName: org.organizerName || org.FullName || org.name || org.organizerName,
        email: org.email || org.Email,
        phone: org.phone || org.Phone1 || org.phoneNumber,
        status: org.status || org.Status || "Active",
        totalEvents: org.totalEvents || 0,
        totalSales: org.totalSales || 0,
        convenienceFeeCharged: org.convenienceFeeCharged || 0,
        pendingAmount: org.pendingAmount || 0,
        createdAt: org.createdAt || org.CreatedAt || new Date().toISOString(),
      }))

      setOrganizers(normalizedOrganizers)
      setOriginalData(normalizedOrganizers)
      setUseMockData(false)
      setApiError(null)
    } catch (error) {
      console.error("Error fetching organizers:", error)
      
      // Extract meaningful error message
      let errorMessage = "Failed to load organizers"
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setApiError(errorMessage)
      setOrganizers([])
      setOriginalData([])
      setUseMockData(false)
    } finally {
      setLoading(false)
    }
  }

  // Search with API integration
  const searchOrganizers = async (keyword: string) => {
    if (!keyword.trim()) {
      setOrganizers(originalData)
      return
    }

    try {
      setLoading(true)
      setApiError(null)

      const authToken = localStorage.getItem("authToken")
      if (!user || !authToken) {
        // Fallback to local filtering when no auth
        const filtered = originalData.filter((org) =>
          org.organizerName.toLowerCase().includes(keyword.toLowerCase()) ||
          org.email.toLowerCase().includes(keyword.toLowerCase())
        )
        setOrganizers(filtered)
        return
      }

      const response = await fetch(organizerEndpoint.SEARCH_ORGANIZER_BY_ORGANIZER_NAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ search_keyword: keyword }),
      })

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("Search response:", data)

      let organizersData = []
      if (data.organizers) {
        organizersData = data.organizers
      } else if (Array.isArray(data)) {
        organizersData = data
      } else if (data.data && Array.isArray(data.data)) {
        organizersData = data.data
      }

      const normalizedOrganizers = organizersData.map((org: any) => ({
        _id: org._id || org.id,
        organizerName: org.organizerName || org.FullName || org.name,
        email: org.email || org.Email,
        phone: org.phone || org.Phone1,
        status: org.status || org.Status || "Active",
        totalEvents: org.totalEvents || 0,
        totalSales: org.totalSales || 0,
        convenienceFeeCharged: org.convenienceFeeCharged || 0,
        pendingAmount: org.pendingAmount || 0,
        createdAt: org.createdAt || org.CreatedAt || new Date().toISOString(),
      }))

      setOrganizers(normalizedOrganizers)
    } catch (error) {
      console.error("Error searching organizers:", error)
      // Fallback to local filtering
      const filtered = originalData.filter((org) =>
        org.organizerName.toLowerCase().includes(keyword.toLowerCase()) ||
        org.email.toLowerCase().includes(keyword.toLowerCase())
      )
      setOrganizers(filtered)
      setApiError("Search failed. Using local filtering.")
    } finally {
      setLoading(false)
    }
  }

  // Initialize data on component mount
  React.useEffect(() => {
    fetchOrganizers()
  }, [user])

  // Search with debounce
  React.useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(delay)
  }, [searchTerm])

  React.useEffect(() => {
    if (debouncedSearchTerm === "") {
      setOrganizers(originalData)
      return
    }
    searchOrganizers(debouncedSearchTerm)
  }, [debouncedSearchTerm, originalData])

  const filteredOrganizers = organizers
  const totalPages = Math.ceil(filteredOrganizers.length / ITEMS_PER_PAGE)
  const currentOrganizers = filteredOrganizers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => setCurrentPage(page)

  const resetForm = () => {
    setFormData({ organizerName: "", email: "", phone: "", password: "" })
    setEditingOrganizer(null)
  }

  const handleFormSubmit = async () => {
    if (!formData.organizerName || !formData.email) {
      toast({ title: "Error", description: "Name and Email are required.", variant: "destructive" })
      return
    }
    setLoading(true)
    
    try {
      // Simulate API call - in real implementation, call the API
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      if (editingOrganizer) {
        setOrganizers(
          organizers.map((org) =>
            org._id === editingOrganizer._id
              ? {
                  ...editingOrganizer,
                  ...formData,
                  totalEvents: org.totalEvents,
                  totalSales: org.totalSales,
                  convenienceFeeCharged: org.convenienceFeeCharged,
                  pendingAmount: org.pendingAmount,
                }
              : org,
          ),
        )
        toast({ title: "Success", description: "Organizer updated." })
      } else {
        const newOrganizer: Organizer = {
          _id: `org${Date.now()}`,
          ...formData,
          status: "Active",
          totalEvents: 0,
          totalSales: 0,
          convenienceFeeCharged: 0,
          pendingAmount: 0,
          createdAt: new Date().toISOString(),
        }
        setOrganizers([newOrganizer, ...organizers])
        toast({ title: "Success", description: "Organizer created." })
      }
    } catch (error) {
      console.error("Error saving organizer:", error)
      toast({ 
        title: "Error", 
        description: "Failed to save organizer. Please try again.", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
      setIsFormOpen(false)
      resetForm()
    }
  }

  const handleEdit = (organizer: Organizer) => {
    setEditingOrganizer(organizer)
    setFormData({
      organizerName: organizer.organizerName,
      email: organizer.email,
      phone: organizer.phone,
      password: "",
    })
    setIsFormOpen(true)
  }

  const handleDisable = async (organizerId: string) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))
      setOrganizers(
        organizers.map((org) =>
          org._id === organizerId ? { ...org, status: org.status === "Disabled" ? "Active" : "Disabled" } : org,
        ),
      )
      toast({ title: "Success", description: "Organizer status updated." })
    } catch (error) {
      console.error("Error updating organizer status:", error)
      toast({ 
        title: "Error", 
        description: "Failed to update organizer status.", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (organizerId: string) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({ title: "Success", description: `Password reset link sent to organizer.` })
    } catch (error) {
      console.error("Error resetting password:", error)
      toast({ 
        title: "Error", 
        description: "Failed to send password reset link.", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const openAccountManager = (organizer: Organizer) => {
    setSelectedOrganizerForAccounts(organizer)
    setIsAccountManagerOpen(true)
  }

  const handleAddAccountEntry = async () => {
    if (!accountFormData.date || !accountFormData.amountReceived) {
      toast({ title: "Error", description: "Date and Amount Received are required.", variant: "destructive" })
      return
    }
    
    try {
      // Simulate adding account entry
      toast({ title: "Success", description: `Account entry added for ${selectedOrganizerForAccounts?.organizerName}.` })
      setAccountFormData({ date: "", remark: "", amountReceived: "" })
    } catch (error) {
      console.error("Error adding account entry:", error)
      toast({ 
        title: "Error", 
        description: "Failed to add account entry.", 
        variant: "destructive" 
      })
    }
  }

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organizers Management</h1>
        <Button
          onClick={() => {
            resetForm()
            setIsFormOpen(true)
          }}
          disabled={loading}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Organizer
        </Button>
      </div>

      {/* API Error Alert */}
      {apiError && (
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
                fetchOrganizers()
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search organizers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          {useMockData && (
            <p className="text-sm text-muted-foreground mt-2">
              Using sample data - API integration available
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Organizers</CardTitle>
          <CardDescription>
            View and manage event organizers. 
            {loading && " Loading..."}
            {!loading && ` (${filteredOrganizers.length} total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading organizers...</span>
            </div>
          ) : currentOrganizers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchTerm ? `No organizers found matching "${searchTerm}"` : "No organizers found"}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentOrganizers.map((org) => (
                  <TableRow key={org._id}>
                    <TableCell className="font-medium">{org.organizerName}</TableCell>
                    <TableCell className="hidden md:table-cell">{org.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">{org.phone}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          org.status === "Active" ? "default" : org.status === "Inactive" ? "secondary" : "destructive"
                        }
                      >
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${org.totalSales.toLocaleString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" disabled={loading}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(org)}>
                            <Eye className="mr-2 h-4 w-4" /> View & Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAccountManager(org)}>
                            <DollarSign className="mr-2 h-4 w-4" /> Manage Accounts
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDisable(org._id)}>
                            {org.status === "Disabled" ? "Enable" : "Disable"} Organizer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(org._id)}>
                            <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === i + 1}
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(i + 1)
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
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
        </CardContent>
      </Card>

      {/* Sales Report Summary for a selected organizer - This is a simplified concept. 
          A real implementation would likely be on the "View & Edit" page or a dedicated dashboard for that organizer.
          For now, let's show it if an organizer is selected for account management.
      */}
      {selectedOrganizerForAccounts && (
        <Card>
          <CardHeader>
            <CardTitle>Sales Report: {selectedOrganizerForAccounts.organizerName}</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Total Events</div>
              <div className="text-2xl font-bold">{selectedOrganizerForAccounts.totalEvents}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Total Sales Received</div>
              <div className="text-2xl font-bold">${selectedOrganizerForAccounts.totalSales.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Convenience Fee Charged</div>
              <div className="text-2xl font-bold">
                ${selectedOrganizerForAccounts.convenienceFeeCharged.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Pending Amount</div>
              <div className="text-2xl font-bold text-red-600">
                ${selectedOrganizerForAccounts.pendingAmount.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Organizer Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrganizer ? "Edit Organizer" : "Add New Organizer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="organizerName">Organizer Name</Label>
              <Input
                id="organizerName"
                value={formData.organizerName}
                onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
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
            {!editingOrganizer && (
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
              {editingOrganizer ? "Save Changes" : "Create Organizer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event-wise Account Management Dialog */}
      <Dialog open={isAccountManagerOpen} onOpenChange={setIsAccountManagerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Account Management: {selectedOrganizerForAccounts?.organizerName}</DialogTitle>
            <DialogDescription>Manage event-wise account entries.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* This would typically list events and their account status. For now, a simple form to add an entry. */}
            <h3 className="text-lg font-medium">Add New Account Entry</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="accountDate">Date</Label>
                <Input
                  id="accountDate"
                  type="date"
                  value={accountFormData.date}
                  onChange={(e) => setAccountFormData({ ...accountFormData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountReceived">Amount Received</Label>
                <Input
                  id="amountReceived"
                  type="number"
                  placeholder="0.00"
                  value={accountFormData.amountReceived}
                  onChange={(e) => setAccountFormData({ ...accountFormData, amountReceived: e.target.value })}
                />
              </div>
              <Button onClick={handleAddAccountEntry} className="md:self-end">
                <FilePlus className="mr-2 h-4 w-4" /> Add Entry
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountRemark">Remark</Label>
              <Textarea
                id="accountRemark"
                placeholder="Payment for 'Summer Fest'..."
                value={accountFormData.remark}
                onChange={(e) => setAccountFormData({ ...accountFormData, remark: e.target.value })}
              />
            </div>

            {/* Placeholder for listing existing account entries */}
            <div className="mt-4 border-t pt-4">
              <h4 className="text-md font-medium mb-2">Existing Entries (Placeholder)</h4>
              <p className="text-sm text-muted-foreground">
                Event-wise account entries would be listed here with options to delete.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAccountManagerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
