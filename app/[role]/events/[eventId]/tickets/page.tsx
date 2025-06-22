"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Ticket,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { getNumericRole } from "@/lib/role-mapping"
import { ticketEndPoint } from "@/lib/api-endpoints"
import { NormalTicket, BulkTicket, Event } from "@/lib/types"

interface EventDateTime {
  _id: string
  event_id: string
  date: string
  start_time: string
  end_time: string
  DateTimeStatus: number
  createdAt: string
}

// Form data types
interface CreateNormalTicketForm {
  TicketName: string
  TicketType: number
  TicketDescription: string
  EventDateTime_id: string
  TicketPrice: number
  MaxQuantity: number
  TicketStatus: number
  VisibilityLevel: number
}

interface CreateBulkTicketForm {
  BulkTicketName: string
  BulkTicketType: number
  BulkTicketDescription: string
  EventDateTime_id: string
  BulkTicketPrice: number
  BulkMinQuantity: number
  BulkMaxQuantity: number
  BulkTicketStatus: number
}

export default function TicketsPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const role = params.role as string
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  // Loading states
  const [loading, setLoading] = React.useState(false)
  const [normalTickets, setNormalTickets] = React.useState<NormalTicket[]>([])
  const [bulkTickets, setBulkTickets] = React.useState<BulkTicket[]>([])
  const [eventData, setEventData] = React.useState<Event | null>(null)
  const [eventDateTimes, setEventDateTimes] = React.useState<EventDateTime[]>([])

  // Tab and filter states
  const [activeTab, setActiveTab] = React.useState("normal")
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  // Modal states
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<NormalTicket | BulkTicket | null>(null)

  // Form states - separate for normal and bulk tickets
  const [normalFormData, setNormalFormData] = React.useState<CreateNormalTicketForm>({
    TicketName: "",
    TicketType: 1,
    TicketDescription: "",
    EventDateTime_id: "",
    TicketPrice: 0,
    MaxQuantity: 0,
    TicketStatus: 1,
    VisibilityLevel: 1
  })
  
  const [bulkFormData, setBulkFormData] = React.useState<CreateBulkTicketForm>({
    BulkTicketName: "",
    BulkTicketType: 4,
    BulkTicketDescription: "",
    EventDateTime_id: "",
    BulkTicketPrice: 0,
    BulkMinQuantity: 0,
    BulkMaxQuantity: 0,
    BulkTicketStatus: 1
  })
  
  const [editFormData, setEditFormData] = React.useState<any>({})

  // Helper functions
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount)
  }

  const getTicketTypeName = (type: number) => {
    switch (type) {
      case 1: return "Single Day"
      case 2: return "Multiple Day"
      case 3: return "Season Pass"
      case 4: return "Bulk"
      default: return "Unknown"
    }
  }

  const getStatusBadge = (status: number) => {
    return status === 1 ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    )
  }

  // API Functions
  const fetchTickets = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return      // Fetch normal tickets
      const normalTicketsResponse = await fetch(ticketEndPoint.GET_ALL_TICKETS_BY_EVENT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          AdminRole: getNumericRole(role),
          user_id: user.user_id,
        }),
      })

      if (normalTicketsResponse.ok) {
        const normalData = await normalTicketsResponse.json()
        if (!normalData.error) {
          setNormalTickets(normalData.data || [])
        }
      }      // Fetch bulk tickets
      const bulkTicketsResponse = await fetch(ticketEndPoint.GET_ALL_BULK_TICKETS_BY_EVENT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          AdminRole: getNumericRole(role),
          user_id: user.user_id,
        }),
      })

      if (bulkTicketsResponse.ok) {
        const bulkData = await bulkTicketsResponse.json()
        if (!bulkData.error) {
          setBulkTickets(bulkData.data || [])
        }
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      toast({
        title: "Error",
        description: "Failed to load tickets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (ticketId: string, currentStatus: number, isNormal: boolean) => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      const newStatus = currentStatus === 1 ? 0 : 1
      const endpoint = isNormal
        ? (newStatus === 1 ? ticketEndPoint.ENABLE_TICKET : ticketEndPoint.DISABLE_TICKET)
        : (newStatus === 1 ? ticketEndPoint.ENABLE_BULK_TICKET : ticketEndPoint.DISABLE_BULK_TICKET)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },        body: JSON.stringify({
          _id: ticketId,
          AdminRole: getNumericRole(role),
          user_id: user.user_id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Ticket ${newStatus === 1 ? "enabled" : "disabled"} successfully`,
        })
        fetchTickets()
      }
    } catch (error) {
      console.error("Error toggling ticket status:", error)
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTicket = async (ticketId: string, isNormal: boolean) => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return

      const endpoint = isNormal ? ticketEndPoint.DELETE_TICKET : ticketEndPoint.DELETE_BULK_TICKET

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },        body: JSON.stringify({
          _id: ticketId,
          AdminRole: getNumericRole(role),
          user_id: user.user_id,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Ticket deleted successfully",
        })
        fetchTickets()
      }
    } catch (error) {
      console.error("Error deleting ticket:", error)
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken) return
      
      const endpoint = activeTab === "normal" 
        ? ticketEndPoint.CREATE_NORMAL_TICKET 
        : ticketEndPoint.CREATE_BULK_TICKET
      
      const formData = activeTab === "normal" ? normalFormData : bulkFormData
        const payload = {
        event_id: eventId,
        AdminRole: getNumericRole(role),
        user_id: user.user_id,
        ...formData
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
        toast({
          title: "Success",
          description: "Ticket created successfully",
        })
        setShowCreateModal(false)
        if (activeTab === "normal") {
          setNormalFormData({
            TicketName: "",
            TicketType: 1,
            TicketDescription: "",
            EventDateTime_id: "",
            TicketPrice: 0,
            MaxQuantity: 0,
            TicketStatus: 1,
            VisibilityLevel: 1
          })
        } else {
          setBulkFormData({
            BulkTicketName: "",
            BulkTicketType: 4,
            BulkTicketDescription: "",
            EventDateTime_id: "",
            BulkTicketPrice: 0,
            BulkMinQuantity: 0,
            BulkMaxQuantity: 0,
            BulkTicketStatus: 1
          })
        }
        fetchTickets()
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditTicket = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      if (!user || !authToken || !selectedTicket) return

      const isNormal = "TicketName" in selectedTicket
      const endpoint = isNormal
        ? ticketEndPoint.UPDATE_TICKET
        : ticketEndPoint.UPDATE_BULK_TICKET

      const payload = {
        _id: selectedTicket._id,
        AdminRole: getNumericRole(role),
        user_id: user.user_id,
        ...editFormData
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
        toast({
          title: "Success",
          description: "Ticket updated successfully",
        })
        setShowEditModal(false)
        setEditFormData({})
        fetchTickets()
      }
    } catch (error) {
      console.error("Error updating ticket:", error)
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Effects
  React.useEffect(() => {
    fetchTickets()
  }, [eventId, user])

  const handleOpenCreateModal = () => {
    setShowCreateModal(true)
  }

  const handleOpenEditModal = (ticket: NormalTicket | BulkTicket) => {
    setSelectedTicket(ticket)
    setEditFormData(ticket)
    setShowEditModal(true)
  }

  // Filter tickets based on search and status
  const filteredNormalTickets = normalTickets.filter(ticket => {
    const matchesSearch = ticket.TicketName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || ticket.TicketStatus.toString() === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredBulkTickets = bulkTickets.filter(ticket => {
    const matchesSearch = ticket.BulkTicketName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || ticket.BulkTicketStatus.toString() === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href={`/${role}/dashboard`}
              className="cursor-pointer"
            >
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={`/${role}/events`}
              className="cursor-pointer"
            >
              Events
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Tickets</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Event Tickets</h1>
            <p className="text-muted-foreground">
              Manage event tickets and configure pricing
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Ticket
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="min-w-[200px]">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="normal" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Normal Tickets ({filteredNormalTickets.length})
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Bulk Tickets ({filteredBulkTickets.length})
          </TabsTrigger>
        </TabsList>

        {/* Normal Tickets Tab */}
        <TabsContent value="normal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Normal Tickets</CardTitle>
              <CardDescription>
                Manage individual event tickets and pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredNormalTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No tickets found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNormalTickets.map((ticket) => (
                        <TableRow key={ticket._id}>
                          <TableCell className="font-medium">
                            {ticket.TicketName}
                          </TableCell>
                          <TableCell>
                            {getTicketTypeName(ticket.TicketType)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(ticket.TicketPrice)}
                          </TableCell>
                          <TableCell>
                            {ticket.TicketQuantity || 0}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(ticket.TicketStatus)}
                          </TableCell>
                          <TableCell>
                            {formatDate(ticket.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditModal(ticket)}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(ticket._id, ticket.TicketStatus, true)}
                                >
                                  {ticket.TicketStatus === 1 ? "Disable" : "Enable"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteTicket(ticket._id, true)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Tickets Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Tickets</CardTitle>
              <CardDescription>
                Manage bulk tickets for large groups and promoters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Min Qty</TableHead>
                      <TableHead>Max Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredBulkTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No bulk tickets found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBulkTickets.map((ticket) => (
                        <TableRow key={ticket._id}>
                          <TableCell className="font-medium">
                            {ticket.BulkTicketName}
                          </TableCell>
                          <TableCell>
                            {getTicketTypeName(ticket.BulkTicketType)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(ticket.BulkTicketPrice)}
                          </TableCell>
                          <TableCell>
                            {ticket.MinBulkTicketPerTransaction || 0}
                          </TableCell>
                          <TableCell>
                            {ticket.MaxBulkTicketPerTransaction || 0}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(ticket.BulkTicketStatus)}
                          </TableCell>
                          <TableCell>
                            {formatDate(ticket.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditModal(ticket)}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(ticket._id, ticket.BulkTicketStatus, false)}
                                >
                                  {ticket.BulkTicketStatus === 1 ? "Disable" : "Enable"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteTicket(ticket._id, false)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Create {activeTab === "normal" ? "Normal" : "Bulk"} Ticket
            </DialogTitle>
            <DialogDescription>
              Add a new {activeTab === "normal" ? "normal" : "bulk"} ticket to this event
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="normal">Normal Ticket</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Ticket</TabsTrigger>
            </TabsList>

            {/* Normal Ticket Form */}
            <TabsContent value="normal" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticketName">Ticket Name</Label>
                  <Input
                    id="ticketName"
                    value={normalFormData.TicketName}
                    onChange={(e) => setNormalFormData(prev => ({ ...prev, TicketName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticketType">Ticket Type</Label>
                  <Select
                    value={normalFormData.TicketType.toString()}
                    onValueChange={(value) => setNormalFormData(prev => ({ ...prev, TicketType: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Single Day</SelectItem>
                      <SelectItem value="2">Multiple Day</SelectItem>
                      <SelectItem value="3">Season Pass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticketDescription">Description</Label>
                  <Textarea
                    id="ticketDescription"
                    value={normalFormData.TicketDescription}
                    onChange={(e) => setNormalFormData(prev => ({ ...prev, TicketDescription: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketPrice">Price (₹)</Label>
                    <Input
                      id="ticketPrice"
                      type="number"
                      value={normalFormData.TicketPrice}
                      onChange={(e) => setNormalFormData(prev => ({ ...prev, TicketPrice: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxQuantity">Max Quantity</Label>
                    <Input
                      id="maxQuantity"
                      type="number"
                      value={normalFormData.MaxQuantity}
                      onChange={(e) => setNormalFormData(prev => ({ ...prev, MaxQuantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketStatus">Status</Label>
                    <Select
                      value={normalFormData.TicketStatus.toString()}
                      onValueChange={(value) => setNormalFormData(prev => ({ ...prev, TicketStatus: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Active</SelectItem>
                        <SelectItem value="0">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visibilityLevel">Visibility</Label>
                    <Select
                      value={normalFormData.VisibilityLevel.toString()}
                      onValueChange={(value) => setNormalFormData(prev => ({ ...prev, VisibilityLevel: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Public</SelectItem>
                        <SelectItem value="0">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={loading || !normalFormData.TicketName}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Ticket
                </Button>
              </div>
            </TabsContent>

            {/* Bulk Ticket Form */}
            <TabsContent value="bulk" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkTicketName">Bulk Ticket Name</Label>
                  <Input
                    id="bulkTicketName"
                    value={bulkFormData.BulkTicketName}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkTicketName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkTicketType">Ticket Type</Label>
                  <Select
                    value={bulkFormData.BulkTicketType.toString()}
                    onValueChange={(value) => setBulkFormData(prev => ({ ...prev, BulkTicketType: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">Bulk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkTicketDescription">Description</Label>
                  <Textarea
                    id="bulkTicketDescription"
                    value={bulkFormData.BulkTicketDescription}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkTicketDescription: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkTicketPrice">Price (₹)</Label>
                    <Input
                      id="bulkTicketPrice"
                      type="number"
                      value={bulkFormData.BulkTicketPrice}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkTicketPrice: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkMinQuantity">Min Quantity</Label>
                    <Input
                      id="bulkMinQuantity"
                      type="number"
                      value={bulkFormData.BulkMinQuantity}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkMinQuantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkMaxQuantity">Max Quantity</Label>
                    <Input
                      id="bulkMaxQuantity"
                      type="number"
                      value={bulkFormData.BulkMaxQuantity}
                      onChange={(e) => setBulkFormData(prev => ({ ...prev, BulkMaxQuantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkTicketStatus">Status</Label>
                  <Select
                    value={bulkFormData.BulkTicketStatus.toString()}
                    onValueChange={(value) => setBulkFormData(prev => ({ ...prev, BulkTicketStatus: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Active</SelectItem>
                      <SelectItem value="0">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={loading || !bulkFormData.BulkTicketName}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Bulk Ticket
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>
              Update ticket information
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="grid gap-4">
              {/* Edit form fields based on ticket type */}
              {"TicketName" in selectedTicket ? (
                // Normal ticket edit form
                <>
                  <div className="space-y-2">
                    <Label htmlFor="editTicketName">Ticket Name</Label>
                    <Input
                      id="editTicketName"
                      value={editFormData.TicketName || ""}
                      onChange={(e) => setEditFormData((prev: any) => ({ ...prev, TicketName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editTicketType">Ticket Type</Label>
                    <Select
                      value={editFormData.TicketType?.toString() || ""}
                      onValueChange={(value) => setEditFormData((prev: any) => ({ ...prev, TicketType: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Single Day</SelectItem>
                        <SelectItem value="2">Multiple Day</SelectItem>
                        <SelectItem value="3">Season Pass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editTicketPrice">Price (₹)</Label>
                      <Input
                        id="editTicketPrice"
                        type="number"
                        value={editFormData.TicketPrice || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, TicketPrice: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editMaxQuantity">Max Quantity</Label>
                      <Input
                        id="editMaxQuantity"
                        type="number"
                        value={editFormData.TicketQuantity || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, TicketQuantity: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </>
              ) : (
                // Bulk ticket edit form
                <>
                  <div className="space-y-2">
                    <Label htmlFor="editBulkTicketName">Bulk Ticket Name</Label>
                    <Input
                      id="editBulkTicketName"
                      value={editFormData.BulkTicketName || ""}
                      onChange={(e) => setEditFormData((prev: any) => ({ ...prev, BulkTicketName: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editBulkTicketPrice">Price (₹)</Label>
                      <Input
                        id="editBulkTicketPrice"
                        type="number"
                        value={editFormData.BulkTicketPrice || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, BulkTicketPrice: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editBulkMinQuantity">Min Quantity</Label>
                      <Input
                        id="editBulkMinQuantity"
                        type="number"
                        value={editFormData.MinBulkTicketPerTransaction || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, MinBulkTicketPerTransaction: parseInt(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editBulkMaxQuantity">Max Quantity</Label>
                      <Input
                        id="editBulkMaxQuantity"
                        type="number"
                        value={editFormData.MaxBulkTicketPerTransaction || ""}
                        onChange={(e) => setEditFormData((prev: any) => ({ ...prev, MaxBulkTicketPerTransaction: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditTicket}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
