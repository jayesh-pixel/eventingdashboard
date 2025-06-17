"use client"

import { useState, useEffect } from "react"
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
import { Plus, Search, AlertCircle, Loader2, UserCheck, UserX } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { scannerUserEndpoint } from "@/lib/api-endpoints"
import { eventEndPoint } from "@/lib/api-endpoints"
import { ScannerUser, ScannerUsersApiResponse, ScannerUserType, ScannerUserStatus } from "@/lib/types"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { useToast } from "@/hooks/use-toast"

const statusColors = {
  0: "bg-gray-100 text-gray-800",    // Inactive
  1: "bg-green-100 text-green-800",  // Active
  2: "bg-red-100 text-red-800"       // Disabled
} as const

const statusLabels = {
  0: "Inactive",
  1: "Active", 
  2: "Disabled"
} as const

const userTypeLabels = {
  1: "Event Scanner",
  2: "Organizer Scanner"
} as const

export default function ScannerUsersPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [scannerUsers, setScannerUsers] = useState<ScannerUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<ScannerUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ScannerUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Events for dropdown
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    userType: "1", // Default to Event Scanner
    selectedEvents: [] as string[],
    selectedOrganizers: [] as string[],
  })

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true)
      const authToken = getValidToken()
      
      if (!authToken) {
        console.warn("No auth token available")
        return
      }

      const response = await fetch(eventEndPoint.GET_ALL_EVENTS_DATA_BY_ADMIN, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (!data.error && data.data) {
          setEvents(data.data)
        }
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoadingEvents(false)
    }
  }

  const fetchScannerUsers = async () => {
    try {      setLoading(true)
      setError(null)
      
      const response = await apiClient.get<ScannerUsersApiResponse>(scannerUserEndpoint.GET_ALL)
      
      console.log('Scanner Users API Response:', response)

      if (response.success && response.data) {
        if (response.data.error) {
          throw new Error(response.data.message || 'Failed to fetch scanner users')
        }
        // Handle both possible response structures
        let users: ScannerUser[]
        if (Array.isArray(response.data)) {
          // Direct array format
          users = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Nested format
          users = response.data.data
        } else {
          throw new Error('Invalid response format')
        }
        
        console.log('Parsed users:', users)
        setScannerUsers(users)
        setFilteredUsers(users)
      } else {
        throw new Error(response.error || 'Failed to fetch scanner users')
      }
    } catch (err: any) {
      console.error('Error fetching scanner users:', err)
      setError(err.message || 'Failed to load scanner users')
      setScannerUsers([])
      setFilteredUsers([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    fetchScannerUsers()
    fetchEvents()
  }, [])
  useEffect(() => {
    if (!scannerUsers || !Array.isArray(scannerUsers)) {
      setFilteredUsers([])
      return
    }

    let filtered = scannerUsers.filter(user => 
      user.Username.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (statusFilter !== "all") {
      filtered = filtered.filter(user => user.status.toString() === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(user => user.UserType.toString() === typeFilter)
    }

    setFilteredUsers(filtered)
  }, [scannerUsers, searchTerm, statusFilter, typeFilter])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
  }

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAssignmentInfo = (user: ScannerUser) => {
    if (user.UserType === ScannerUserType.Event && user.Events.length > 0) {
      return {
        type: "Event",
        count: user.Events.length,
        display: `${user.Events.length} Event${user.Events.length > 1 ? 's' : ''}`
      }
    } else if (user.UserType === ScannerUserType.Organizer && user.Organizers.length > 0) {
      return {
        type: "Organizer", 
        count: user.Organizers.length,
        display: `${user.Organizers.length} Organizer${user.Organizers.length > 1 ? 's' : ''}`
      }
    }
    return {
      type: "None",
      count: 0,
      display: "Not Assigned"
    }  }

  // CRUD Functions
  const handleCreateUser = async () => {
    if (!formData.username.trim() || !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Username and Password are required",
        variant: "destructive",
      })
      return
    }

    if (formData.userType === "1" && formData.selectedEvents.length === 0) {
      toast({
        title: "Error", 
        description: "Event Scanner must have at least one event assigned",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const authToken = getValidToken()
      if (!authToken || !user) {
        throw new Error("Authentication required")
      }

      const payload = {
        Username: formData.username,
        Password: formData.password,
        UserType: formData.userType,
        Events: formData.userType === "1" ? formData.selectedEvents.map(eventId => ({ event_id: eventId })) : [],
        Organizers: formData.userType === "2" ? formData.selectedOrganizers.map(orgId => ({ organizer_id: orgId })) : [],
        CreatedBy: "1",
        createduser_id: user.user_id,
      }

      const response = await fetch(scannerUserEndpoint.REGISTER, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && !data.error) {
        toast({
          title: "Success",
          description: "Scanner user created successfully",
        })
        setIsCreateDialogOpen(false)
        resetForm()
        await fetchScannerUsers()
      } else {
        throw new Error(data.message || "Failed to create scanner user")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create scanner user",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    setSubmitting(true)
    try {
      const authToken = getValidToken()
      if (!authToken) {
        throw new Error("Authentication required")
      }

      const payload = {
        scanneruser_id: selectedUser._id,
        UserType: formData.userType,
        Events: formData.userType === "1" ? formData.selectedEvents.map(eventId => ({ event_id: eventId })) : [],
        Organizers: formData.userType === "2" ? formData.selectedOrganizers.map(orgId => ({ organizer_id: orgId })) : [],
      }

      const response = await fetch(scannerUserEndpoint.UPDATE_DETAILS, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && !data.error) {
        toast({
          title: "Success",
          description: "Scanner user updated successfully",
        })
        setIsEditDialogOpen(false)
        resetForm()
        await fetchScannerUsers()
      } else {
        throw new Error(data.message || "Failed to update scanner user")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update scanner user",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: number) => {
    setSubmitting(true)
    try {
      const authToken = getValidToken()
      if (!authToken) {
        throw new Error("Authentication required")
      }

      const endpoint = currentStatus === 1 ? scannerUserEndpoint.DISABLE : scannerUserEndpoint.ENABLE
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scanneruser_id: userId }),
      })

      const data = await response.json()

      if (response.ok && !data.error) {
        toast({
          title: "Success",
          description: `Scanner user ${currentStatus === 1 ? 'disabled' : 'enabled'} successfully`,
        })
        await fetchScannerUsers()
      } else {
        throw new Error(data.message || "Failed to update user status")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (user: ScannerUser) => {
    setSelectedUser(user)
    setFormData({
      username: user.Username,
      password: "", // Don't show existing password
      userType: user.UserType.toString(),
      selectedEvents: user.Events.map(e => e.event_id),
      selectedOrganizers: user.Organizers.map(o => o.organizer_id),
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      userType: "1",
      selectedEvents: [],
      selectedOrganizers: [],
    })
    setSelectedUser(null)
  }
  const handleCreateScannerUser = () => {
    resetForm()
    setIsCreateDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Scanner Users</h1>
          <p className="text-muted-foreground">Manage ticket scanning users and their assignments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Scanner User
            </Button>
          </DialogTrigger>          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Scanner User</DialogTitle>
              <DialogDescription>
                Create a new scanner user and assign them to events or organizers.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">User Name *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userType">User Type *</Label>
                <Select value={formData.userType} onValueChange={(value) => setFormData({ ...formData, userType: value, selectedEvents: [], selectedOrganizers: [] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Event Scanner</SelectItem>
                    <SelectItem value="2">Organizer Scanner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.userType === "1" && (
                <div className="space-y-2">
                  <Label>Event Names *</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                    {loadingEvents ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading events...
                      </div>
                    ) : events.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No events available</p>
                    ) : (
                      <div className="space-y-2">
                        {events.map((event) => (
                          <div key={event._id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`event-${event._id}`}
                              checked={formData.selectedEvents.includes(event._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    selectedEvents: [...formData.selectedEvents, event._id]
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedEvents: formData.selectedEvents.filter(id => id !== event._id)
                                  })
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor={`event-${event._id}`} className="text-sm font-normal">
                              {event.eventName || event.name || 'Unnamed Event'}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.selectedEvents.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {formData.selectedEvents.length} event(s) selected
                    </p>
                  )}
                </div>
              )}

              {formData.userType === "2" && (
                <div className="space-y-2">
                  <Label>Organizer Assignment</Label>
                  <div className="border rounded-md p-3">
                    <p className="text-sm text-muted-foreground">
                      Organizer assignment will be configured based on organizer selection.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  resetForm()
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser} 
                disabled={submitting || !formData.username.trim() || !formData.password.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Scanner User'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Scanner User</DialogTitle>
            <DialogDescription>
              Update scanner user assignments and details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editUsername">User Name</Label>
                <Input
                  id="editUsername"
                  value={formData.username}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Username cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPassword">New Password</Label>
                <Input
                  id="editPassword"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editUserType">User Type *</Label>
              <Select value={formData.userType} onValueChange={(value) => setFormData({ ...formData, userType: value, selectedEvents: [], selectedOrganizers: [] })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Event Scanner</SelectItem>
                  <SelectItem value="2">Organizer Scanner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.userType === "1" && (
              <div className="space-y-2">
                <Label>Event Names *</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                  {loadingEvents ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading events...
                    </div>
                  ) : events.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No events available</p>
                  ) : (
                    <div className="space-y-2">
                      {events.map((event) => (
                        <div key={event._id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-event-${event._id}`}
                            checked={formData.selectedEvents.includes(event._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  selectedEvents: [...formData.selectedEvents, event._id]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedEvents: formData.selectedEvents.filter(id => id !== event._id)
                                })
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`edit-event-${event._id}`} className="text-sm font-normal">
                            {event.eventName || event.name || 'Unnamed Event'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {formData.selectedEvents.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formData.selectedEvents.length} event(s) selected
                  </p>
                )}
              </div>
            )}

            {formData.userType === "2" && (
              <div className="space-y-2">
                <Label>Organizer Assignment</Label>
                <div className="border rounded-md p-3">
                  <p className="text-sm text-muted-foreground">
                    Organizer assignment will be configured based on organizer selection.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false)
                resetForm()
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditUser} 
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Scanner User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search scanner users..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="1">Active</SelectItem>
            <SelectItem value="0">Inactive</SelectItem>
            <SelectItem value="2">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={handleTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="User Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="1">Event Scanner</SelectItem>
            <SelectItem value="2">Organizer Scanner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>          <CardTitle>
            Scanner Users 
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredUsers?.length || 0} total)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Overview of all ticket scanning users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading scanner users...</span>
            </div>
          ) : (filteredUsers?.length || 0) === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No scanner users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>              <TableBody>
                {(filteredUsers || []).map((user) => {
                  const assignmentInfo = getAssignmentInfo(user)
                  return (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.Username}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {userTypeLabels[user.UserType as keyof typeof userTypeLabels] || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {assignmentInfo.count > 0 ? (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <UserX className="h-4 w-4 text-gray-400" />
                          )}
                          <span className={assignmentInfo.count === 0 ? "text-muted-foreground" : ""}>
                            {assignmentInfo.display}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[user.status as keyof typeof statusColors]}>
                          {statusLabels[user.status as keyof typeof statusLabels] || 'Unknown'}
                        </Badge>
                      </TableCell>                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            disabled={submitting}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant={user.status === 1 ? "destructive" : "default"}
                            size="sm" 
                            onClick={() => handleToggleUserStatus(user._id, user.status)}
                            disabled={submitting}
                          >
                            {user.status === 1 ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
