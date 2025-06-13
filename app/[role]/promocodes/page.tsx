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
import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2 } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"

interface PromoCodesPageProps {
  params: { role: UserRole }
}

interface PromoCode {
  _id: string
  code: string
  discountType: "Percentage" | "Fixed Amount"
  discountValue: number
  appliesTo: "All Events" | "Specific Event"
  eventId?: string // if specific event
  eventName?: string
  customerScope: "All Customers" | "Specific Customer"
  customerId?: string // if specific customer
  customerName?: string
  usageLimit: number
  timesUsed: number
  startDate: string
  endDate: string
  status: "Active" | "Inactive" | "Expired"
  createdAt: string
}

const mockPromoCodes: PromoCode[] = [
  {
    _id: "promo001",
    code: "SUMMER25",
    discountType: "Percentage",
    discountValue: 25,
    appliesTo: "All Events",
    customerScope: "All Customers",
    usageLimit: 1000,
    timesUsed: 250,
    startDate: "2025-06-01T00:00:00.000Z",
    endDate: "2025-08-31T00:00:00.000Z",
    status: "Active",
    createdAt: "2025-05-15T00:00:00.000Z",
  },
  {
    _id: "promo002",
    code: "TECHSAVE50",
    discountType: "Fixed Amount",
    discountValue: 50,
    appliesTo: "Specific Event",
    eventId: "evt002",
    eventName: "Tech Conference 2025",
    customerScope: "All Customers",
    usageLimit: 200,
    timesUsed: 85,
    startDate: "2025-07-01T00:00:00.000Z",
    endDate: "2025-09-01T00:00:00.000Z",
    status: "Active",
    createdAt: "2025-06-20T00:00:00.000Z",
  },
  {
    _id: "promo003",
    code: "FIRSTUSER",
    discountType: "Percentage",
    discountValue: 10,
    appliesTo: "All Events",
    customerScope: "Specific Customer",
    customerId: "cus001",
    customerName: "Alice Smith",
    usageLimit: 1,
    timesUsed: 1,
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: "2025-12-31T00:00:00.000Z",
    status: "Inactive", // Used up
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    _id: "promo004",
    code: "EXPIREDCODE",
    discountType: "Percentage",
    discountValue: 15,
    appliesTo: "All Events",
    customerScope: "All Customers",
    usageLimit: 500,
    timesUsed: 100,
    startDate: "2024-01-01T00:00:00.000Z",
    endDate: "2024-03-31T00:00:00.000Z",
    status: "Expired",
    createdAt: "2023-12-15T00:00:00.000Z",
  },
]

// Mock data for dropdowns
const mockEventsList = [
  { _id: "evt001", eventName: "Summer Music Festival" },
  { _id: "evt002", eventName: "Tech Conference 2025" },
  { _id: "evt003", eventName: "Art Expo Downtown" },
]
const mockCustomersList = [
  { _id: "cus001", customerName: "Alice Smith" },
  { _id: "cus002", customerName: "Bob Johnson" },
  { _id: "cus003", customerName: "Carol Williams" },
]

const ITEMS_PER_PAGE = 10

export default function PromoCodesPage({ params }: PromoCodesPageProps) {
  const { role } = params
  const { toast } = useToast()

  const [promoCodes, setPromoCodes] = React.useState<PromoCode[]>(mockPromoCodes)
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingPromoCode, setEditingPromoCode] = React.useState<PromoCode | null>(null)

  const [formData, setFormData] = React.useState({
    code: "",
    discountType: "Percentage" as "Percentage" | "Fixed Amount",
    discountValue: "",
    appliesTo: "All Events" as "All Events" | "Specific Event",
    eventId: "",
    customerScope: "All Customers" as "All Customers" | "Specific Customer",
    customerId: "",
    usageLimit: "",
    startDate: "",
    endDate: "",
    status: true, // for active/inactive switch
  })

  const filteredPromoCodes = React.useMemo(() => {
    if (!searchTerm) return promoCodes
    return promoCodes.filter((pc) => pc.code.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [promoCodes, searchTerm])

  const totalPages = Math.ceil(filteredPromoCodes.length / ITEMS_PER_PAGE)
  const currentPromoCodes = filteredPromoCodes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => setCurrentPage(page)

  const resetForm = () => {
    setFormData({
      code: "",
      discountType: "Percentage",
      discountValue: "",
      appliesTo: "All Events",
      eventId: "",
      customerScope: "All Customers",
      customerId: "",
      usageLimit: "",
      startDate: "",
      endDate: "",
      status: true,
    })
    setEditingPromoCode(null)
  }

  const handleFormSubmit = async () => {
    if (!formData.code || !formData.discountValue || !formData.usageLimit || !formData.startDate || !formData.endDate) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" })
      return
    }
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const selectedEvent = mockEventsList.find((e) => e._id === formData.eventId)
    const selectedCustomer = mockCustomersList.find((c) => c._id === formData.customerId)

    if (editingPromoCode) {
      setPromoCodes(
        promoCodes.map((pc) =>
          pc._id === editingPromoCode._id
            ? {
                ...editingPromoCode,
                ...formData,
                discountValue: Number.parseFloat(formData.discountValue),
                usageLimit: Number.parseInt(formData.usageLimit),
                status: formData.status ? "Active" : "Inactive",
                eventName: formData.appliesTo === "Specific Event" ? selectedEvent?.eventName : undefined,
                customerName:
                  formData.customerScope === "Specific Customer" ? selectedCustomer?.customerName : undefined,
              }
            : pc,
        ),
      )
      toast({ title: "Success", description: "Promo code updated." })
    } else {
      const newPromoCode: PromoCode = {
        _id: `promo${Date.now()}`,
        code: formData.code,
        discountType: formData.discountType,
        discountValue: Number.parseFloat(formData.discountValue),
        appliesTo: formData.appliesTo,
        eventId: formData.appliesTo === "Specific Event" ? formData.eventId : undefined,
        eventName: formData.appliesTo === "Specific Event" ? selectedEvent?.eventName : undefined,
        customerScope: formData.customerScope,
        customerId: formData.customerScope === "Specific Customer" ? formData.customerId : undefined,
        customerName: formData.customerScope === "Specific Customer" ? selectedCustomer?.customerName : undefined,
        usageLimit: Number.parseInt(formData.usageLimit),
        timesUsed: 0,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status ? "Active" : "Inactive",
        createdAt: new Date().toISOString(),
      }
      setPromoCodes([newPromoCode, ...promoCodes])
      toast({ title: "Success", description: "Promo code created." })
    }
    setLoading(false)
    setIsFormOpen(false)
    resetForm()
  }

  const handleEdit = (promoCode: PromoCode) => {
    setEditingPromoCode(promoCode)
    setFormData({
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue.toString(),
      appliesTo: promoCode.appliesTo,
      eventId: promoCode.eventId || "",
      customerScope: promoCode.customerScope,
      customerId: promoCode.customerId || "",
      usageLimit: promoCode.usageLimit.toString(),
      startDate: promoCode.startDate.split("T")[0],
      endDate: promoCode.endDate.split("T")[0],
      status: promoCode.status === "Active",
    })
    setIsFormOpen(true)
  }

  const handleToggleStatus = async (promoCodeId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setPromoCodes(
      promoCodes.map((pc) => {
        if (pc._id === promoCodeId) {
          const newStatus = pc.status === "Active" ? "Inactive" : "Active"
          // Cannot activate an expired code
          if (newStatus === "Active" && new Date(pc.endDate) < new Date()) {
            toast({ title: "Error", description: "Cannot activate an expired promo code.", variant: "destructive" })
            return pc
          }
          return { ...pc, status: newStatus }
        }
        return pc
      }),
    )
    toast({ title: "Success", description: "Promo code status updated." })
    setLoading(false)
  }

  const handleDelete = async (promoCodeId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setPromoCodes(promoCodes.filter((pc) => pc._id !== promoCodeId))
    toast({ title: "Success", description: "Promo code deleted." })
    setLoading(false)
  }

  const getStatusBadgeVariant = (status: PromoCode["status"]) => {
    if (new Date(promoCodes.find((pc) => pc.status === status)?.endDate || "") < new Date() && status === "Active")
      return "destructive" // Show active but past end date as expired-like
    switch (status) {
      case "Active":
        return "default"
      case "Inactive":
        return "secondary"
      case "Expired":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getEffectiveStatus = (pc: PromoCode): PromoCode["status"] => {
    if (pc.status !== "Expired" && new Date(pc.endDate) < new Date()) {
      return "Expired"
    }
    return pc.status
  }

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Promo Codes Management</h1>
        <Button
          onClick={() => {
            resetForm()
            setIsFormOpen(true)
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Create Promo Code
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Filter by Promo Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Promo Codes</CardTitle>
          <CardDescription>Manage discount codes for events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="hidden md:table-cell">Applies To</TableHead>
                <TableHead className="hidden lg:table-cell">Validity</TableHead>
                <TableHead className="text-center">Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPromoCodes.map((pc) => {
                const effectiveStatus = getEffectiveStatus(pc)
                return (
                  <TableRow key={pc._id}>
                    <TableCell className="font-medium">{pc.code}</TableCell>
                    <TableCell>
                      {pc.discountType === "Percentage" ? `${pc.discountValue}%` : `$${pc.discountValue.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {pc.appliesTo === "Specific Event" ? pc.eventName || pc.eventId : "All Events"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(pc.startDate).toLocaleDateString()} - {new Date(pc.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {pc.timesUsed}/{pc.usageLimit}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(effectiveStatus)}>{effectiveStatus}</Badge>
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
                          <DropdownMenuItem onClick={() => handleEdit(pc)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          {effectiveStatus !== "Expired" && (
                            <DropdownMenuItem onClick={() => handleToggleStatus(pc._id)}>
                              {pc.status === "Active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(pc._id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
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

      {/* Add/Edit Promo Code Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPromoCode ? "Edit Promo Code" : "Create New Promo Code"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Promo Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountType">Discount Type *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: "Percentage" | "Fixed Amount") =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Percentage">Percentage</SelectItem>
                    <SelectItem value="Fixed Amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountValue">Discount Value *</Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Usage Limit *</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appliesTo">Applies To *</Label>
                <Select
                  value={formData.appliesTo}
                  onValueChange={(value: "All Events" | "Specific Event") =>
                    setFormData({ ...formData, appliesTo: value, eventId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Events">All Events</SelectItem>
                    <SelectItem value="Specific Event">Specific Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.appliesTo === "Specific Event" && (
                <div className="space-y-2">
                  <Label htmlFor="eventId">Select Event</Label>
                  <Select
                    value={formData.eventId}
                    onValueChange={(value) => setFormData({ ...formData, eventId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockEventsList.map((event) => (
                        <SelectItem key={event._id} value={event._id}>
                          {event.eventName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerScope">Customer Scope *</Label>
                <Select
                  value={formData.customerScope}
                  onValueChange={(value: "All Customers" | "Specific Customer") =>
                    setFormData({ ...formData, customerScope: value, customerId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Customers">All Customers</SelectItem>
                    <SelectItem value="Specific Customer">Specific Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.customerScope === "Specific Customer" && (
                <div className="space-y-2">
                  <Label htmlFor="customerId">Select Customer</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCustomersList.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.customerName} ({customer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={formData.status}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
              />
              <Label htmlFor="status">Active</Label>
            </div>
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
              {editingPromoCode ? "Save Changes" : "Create Promo Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
