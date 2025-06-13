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
import { MoreHorizontal, PlusCircle, Edit, KeyRound, UserX, UserCheck, Loader2 } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"

interface ScannerUsersPageProps {
  params: { role: UserRole }
}

interface ScannerUser {
  _id: string
  username: string
  assignedTo: "Event" | "Organizer"
  assignedEntityName: string // Event Name or Organizer Name
  assignedEntityId: string
  status: "Active" | "Inactive"
  createdAt: string
  lastLogin?: string
}

const mockScannerUsers: ScannerUser[] = [
  {
    _id: "scan001",
    username: "scanner_john",
    assignedTo: "Event",
    assignedEntityName: "Summer Music Festival",
    assignedEntityId: "evt001",
    status: "Active",
    createdAt: "2025-06-01T00:00:00.000Z",
    lastLogin: "2025-07-15T10:00:00.000Z",
  },
  {
    _id: "scan002",
    username: "scanner_jane_org",
    assignedTo: "Organizer",
    assignedEntityName: "MusicFest Inc.",
    assignedEntityId: "org001",
    status: "Active",
    createdAt: "2025-05-20T00:00:00.000Z",
  },
  {
    _id: "scan003",
    username: "scanner_techconf",
    assignedTo: "Event",
    assignedEntityName: "Tech Conference 2025",
    assignedEntityId: "evt002",
    status: "Inactive",
    createdAt: "2025-08-01T00:00:00.000Z",
  },
]

// Re-using mock data from other modules for dropdowns
const mockEventsListForScanner = [
  { _id: "evt001", eventName: "Summer Music Festival" },
  { _id: "evt002", eventName: "Tech Conference 2025" },
  { _id: "evt003", eventName: "Art Expo Downtown" },
]
const mockOrganizersListForScanner = [
  { _id: "org001", organizerName: "MusicFest Inc." },
  { _id: "org002", organizerName: "TechMinds LLC" },
  { _id: "org003", organizerName: "ArtWorld Org" },
]

const ITEMS_PER_PAGE = 10

export default function ScannerUsersPage({ params }: ScannerUsersPageProps) {
  const { role } = params
  const { toast } = useToast()

  const [scannerUsers, setScannerUsers] = React.useState<ScannerUser[]>(mockScannerUsers)
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<ScannerUser | null>(null)

  const [formData, setFormData] = React.useState({
    username: "",
    password: "",
    assignedTo: "Event" as "Event" | "Organizer",
    assignedEntityId: "",
  })

  const filteredUsers = React.useMemo(() => {
    if (!searchTerm) return scannerUsers
    return scannerUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.assignedEntityName.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [scannerUsers, searchTerm])

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const currentUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => setCurrentPage(page)

  const resetForm = () => {
    setFormData({ username: "", password: "", assignedTo: "Event", assignedEntityId: "" })
    setEditingUser(null)
  }

  const handleFormSubmit = async () => {
    if (!formData.username || (!editingUser && !formData.password) || !formData.assignedEntityId) {
      toast({
        title: "Error",
        description: "Username, Password (for new user), and Assignment are required.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    let entityName = ""
    if (formData.assignedTo === "Event") {
      entityName =
        mockEventsListForScanner.find((e) => e._id === formData.assignedEntityId)?.eventName || "Unknown Event"
    } else {
      entityName =
        mockOrganizersListForScanner.find((o) => o._id === formData.assignedEntityId)?.organizerName ||
        "Unknown Organizer"
    }

    if (editingUser) {
      setScannerUsers(
        scannerUsers.map((user) =>
          user._id === editingUser._id
            ? {
                ...editingUser,
                username: formData.username,
                assignedTo: formData.assignedTo,
                assignedEntityId: formData.assignedEntityId,
                assignedEntityName: entityName,
              }
            : user,
        ),
      )
      toast({ title: "Success", description: "Scanner user updated." })
    } else {
      const newUser: ScannerUser = {
        _id: `scan${Date.now()}`,
        username: formData.username,
        assignedTo: formData.assignedTo,
        assignedEntityId: formData.assignedEntityId,
        assignedEntityName: entityName,
        status: "Active",
        createdAt: new Date().toISOString(),
      }
      setScannerUsers([newUser, ...scannerUsers])
      toast({ title: "Success", description: "Scanner user created." })
    }
    setLoading(false)
    setIsFormOpen(false)
    resetForm()
  }

  const handleEdit = (user: ScannerUser) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: "", // Password not shown for edit, only for reset
      assignedTo: user.assignedTo,
      assignedEntityId: user.assignedEntityId,
    })
    setIsFormOpen(true)
  }

  const handleToggleStatus = async (userId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setScannerUsers(
      scannerUsers.map((user) =>
        user._id === userId ? { ...user, status: user.status === "Active" ? "Inactive" : "Active" } : user,
      ),
    )
    toast({ title: "Success", description: "Scanner user status updated." })
    setLoading(false)
  }

  const handleResetPassword = async (userId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    toast({ title: "Success", description: `Password reset instructions sent for user ${userId}.` })
    setLoading(false)
  }

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Scanner Users Management</h1>
        <Button
          onClick={() => {
            resetForm()
            setIsFormOpen(true)
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Create Scanner User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Filter by Username or Assigned Entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Scanner Users</CardTitle>
          <CardDescription>Manage users for event scanning.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="hidden md:table-cell">Entity Name</TableHead>
                <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.assignedTo}</TableCell>
                  <TableCell className="hidden md:table-cell">{user.assignedEntityName}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "Active" ? "default" : "secondary"}>{user.status}</Badge>
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
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(user._id)}>
                          {user.status === "Active" ? (
                            <UserX className="mr-2 h-4 w-4" />
                          ) : (
                            <UserCheck className="mr-2 h-4 w-4" />
                          )}
                          {user.status === "Active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResetPassword(user._id)}>
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

      {/* Add/Edit Scanner User Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Scanner User" : "Create New Scanner User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To *</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value: "Event" | "Organizer") =>
                  setFormData({ ...formData, assignedTo: value, assignedEntityId: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Organizer">Organizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.assignedTo === "Event" && (
              <div className="space-y-2">
                <Label htmlFor="assignedEventId">Select Event *</Label>
                <Select
                  value={formData.assignedEntityId}
                  onValueChange={(value) => setFormData({ ...formData, assignedEntityId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEventsListForScanner.map((event) => (
                      <SelectItem key={event._id} value={event._id}>
                        {event.eventName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.assignedTo === "Organizer" && (
              <div className="space-y-2">
                <Label htmlFor="assignedOrganizerId">Select Organizer *</Label>
                <Select
                  value={formData.assignedEntityId}
                  onValueChange={(value) => setFormData({ ...formData, assignedEntityId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an organizer" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockOrganizersListForScanner.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.organizerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              {editingUser ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
