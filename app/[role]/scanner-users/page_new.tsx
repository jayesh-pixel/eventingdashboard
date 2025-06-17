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
import { scannerUserEndpoint, eventEndPoint, organizerEndpoint } from "@/lib/api-endpoints"
import { ScannerUser, ScannerUsersApiResponse, ScannerUserType, ScannerUserStatus, Event, Organizer } from "@/lib/types"
import { apiClient } from "@/lib/api-client"

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

interface AssignmentInfo {
  type: string;
  count: number;
  display: string;
}

export default function ScannerUsersPage() {
  const [scannerUsers, setScannerUsers] = useState<ScannerUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<ScannerUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ScannerUser | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  // Events and Organizers for assignment
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  const [availableOrganizers, setAvailableOrganizers] = useState<Organizer[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [organizersLoading, setOrganizersLoading] = useState(false)
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    Username: "",
    Password: "",
    UserType: ScannerUserType.Event as number,
    Events: [] as Array<{ event_id: string; _id: string }>,
    Organizers: [] as Array<{ organizer_id: string; _id: string }>
  })

  const fetchScannerUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.get<ScannerUsersApiResponse>(scannerUserEndpoint.GET_ALL)
      
      if (response.success && response.data) {
        if (response.data.error) {
          throw new Error(response.data.message || 'Failed to fetch scanner users')
        }
        
        let scannerUsersArray = response.data.data
        
        if (!scannerUsersArray && Array.isArray(response.data)) {
          scannerUsersArray = response.data
        }
        
        if (Array.isArray(scannerUsersArray)) {
          setScannerUsers(scannerUsersArray)
          setFilteredUsers(scannerUsersArray)
        } else {
          throw new Error('Invalid data format: Expected array of scanner users')
        }
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

  const fetchEvents = async () => {
    try {
      setEventsLoading(true)
      const response = await apiClient.post(eventEndPoint.GET_ALL_EVENTS_DATA_BY_ADMIN)
      
      if (response.success && response.data) {
        const data = response.data as any
        setAvailableEvents(Array.isArray(data) ? data : data.data || [])
      }
    } catch (err: any) {
      console.error('Error fetching events:', err)
      setAvailableEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  const fetchOrganizers = async () => {
    try {
      setOrganizersLoading(true)
      const response = await apiClient.get(organizerEndpoint.GET_ALL_ORGANIZERS_DATA_URL)
      
      if (response.success && response.data) {
        const data = response.data as any
        setAvailableOrganizers(Array.isArray(data) ? data : data.data || [])
      }
    } catch (err: any) {
      console.error('Error fetching organizers:', err)
      setAvailableOrganizers([])
    } finally {
      setOrganizersLoading(false)
    }
  }

  useEffect(() => {
    fetchScannerUsers()
    fetchEvents()
    fetchOrganizers()
  }, [])

  useEffect(() => {
    let filtered = [...(scannerUsers || [])]

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.Username?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(user => user.status?.toString() === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(user => user.UserType?.toString() === typeFilter)
    }

    setFilteredUsers(filtered)
  }, [scannerUsers, searchTerm, statusFilter, typeFilter])

  const formatDate = (dateString: string) => {
    try {
      let date: Date
      
      if (dateString.includes('-') && dateString.includes(' ')) {
        const [datePart, timePart] = dateString.split(' ')
        const [day, month, year] = datePart.split('-')
        date = new Date(`${month}/${day}/${year} ${timePart}`)
      } else {
        date = new Date(dateString)
      }
      
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
  }

  const getAssignmentInfo = (user: ScannerUser): AssignmentInfo => {
    if (user.UserType === ScannerUserType.Event && user.Events?.length > 0) {
      return {
        type: "Event",
        count: user.Events.length,
        display: `${user.Events.length} Event${user.Events.length > 1 ? 's' : ''}`
      }
    } else if (user.UserType === ScannerUserType.Organizer && user.Organizers?.length > 0) {
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
    }
  }

  const handleCreateScannerUser = async () => {
    if (!formData.Username.trim() || !formData.Password.trim()) {
      setError("Username and password are required")
      return
    }

    // Validate assignments based on user type
    if (formData.UserType === ScannerUserType.Event && formData.Events.length === 0) {
      setError("Event scanner must be assigned to at least one event")
      return
    }

    if (formData.UserType === ScannerUserType.Organizer && formData.Organizers.length === 0) {
      setError("Organizer scanner must be assigned to at least one organizer")
      return
    }

    try {
      setCreateLoading(true)
      setError(null)

      const response = await apiClient.post(scannerUserEndpoint.REGISTER, {
        Username: formData.Username.trim(),
        Password: formData.Password.trim(),
        UserType: formData.UserType.toString(),
        Events: formData.Events,
        Organizers: formData.Organizers,
        CreatedBy: "admin",
        createduser_id: "admin-id"
      })

      if (response.success) {
        setIsCreateDialogOpen(false)
        setFormData({
          Username: "",
          Password: "",
          UserType: ScannerUserType.Event as number,
          Events: [],
          Organizers: []
        })
        await fetchScannerUsers()
      } else {
        throw new Error(response.error || 'Failed to create scanner user')
      }
    } catch (err: any) {
      console.error('Error creating scanner user:', err)
      setError(err.message || 'Failed to create scanner user')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditScannerUser = async () => {
    if (!selectedUser) {
      setError("No user selected")
      return
    }

    // Validate assignments based on user type
    if (formData.UserType === ScannerUserType.Event && formData.Events.length === 0) {
      setError("Event scanner must be assigned to at least one event")
      return
    }

    if (formData.UserType === ScannerUserType.Organizer && formData.Organizers.length === 0) {
      setError("Organizer scanner must be assigned to at least one organizer")
      return
    }

    try {
      setUpdateLoading(true)
      setError(null)

      const response = await apiClient.post(scannerUserEndpoint.UPDATE_DETAILS, {
        scanneruser_id: selectedUser._id,
        UserType: formData.UserType.toString(),
        Events: formData.Events,
        Organizers: formData.Organizers
      })

      if (response.success) {
        setIsEditDialogOpen(false)
        setSelectedUser(null)
        await fetchScannerUsers()
      } else {
        throw new Error(response.error || 'Failed to update scanner user')
      }
    } catch (err: any) {
      console.error('Error updating scanner user:', err)
      setError(err.message || 'Failed to update scanner user')
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDeleteScannerUser = async () => {
    if (!selectedUser) return

    try {
      setDeleteLoading(true)
      setError(null)

      const response = await apiClient.post(scannerUserEndpoint.DISABLE, {
        scanneruser_id: selectedUser._id
      })

      if (response.success) {
        setIsDeleteDialogOpen(false)
        setSelectedUser(null)
        await fetchScannerUsers()
      } else {
        throw new Error(response.error || 'Failed to disable scanner user')
      }
    } catch (err: any) {
      console.error('Error disabling scanner user:', err)
      setError(err.message || 'Failed to disable scanner user')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleToggleStatus = async (user: ScannerUser) => {
    try {
      setError(null)
      
      const endpoint = user.status === ScannerUserStatus.Active 
        ? scannerUserEndpoint.DISABLE 
        : scannerUserEndpoint.ENABLE

      const response = await apiClient.post(endpoint, {
        scanneruser_id: user._id
      })

      if (response.success) {
        await fetchScannerUsers()
      } else {
        throw new Error(response.error || 'Failed to update user status')
      }
    } catch (err: any) {
      console.error('Error toggling user status:', err)
      setError(err.message || 'Failed to update user status')
    }
  }

  const openEditDialog = (user: ScannerUser) => {
    setSelectedUser(user)
    setFormData({
      Username: user.Username,
      Password: "",
      UserType: user.UserType,
      Events: user.Events || [],
      Organizers: user.Organizers || []
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (user: ScannerUser) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Scanner Users</h1>
          <p className="text-muted-foreground">Manage ticket scanning users and their assignments</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Scanner User
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search scanner users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
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
        <CardHeader>
          <CardTitle>
            Scanner Users 
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({(filteredUsers || []).length} total)
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
          ) : (filteredUsers || []).length === 0 ? (
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
              </TableHeader>
              <TableBody>
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
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant={user.status === ScannerUserStatus.Active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.status === ScannerUserStatus.Active ? "Disable" : "Enable"}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openDeleteDialog(user)}
                          >
                            Delete
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Scanner User</DialogTitle>
            <DialogDescription>
              Create a new user with access to scan tickets at events.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={formData.Username}
                onChange={(e) => setFormData(prev => ({ ...prev, Username: e.target.value }))}
                className="col-span-3"
                placeholder="Enter username"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.Password}
                onChange={(e) => setFormData(prev => ({ ...prev, Password: e.target.value }))}
                className="col-span-3"
                placeholder="Enter password"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userType" className="text-right">
                User Type
              </Label>
              <Select 
                value={formData.UserType.toString()} 
                onValueChange={(value) => {
                  const newType = parseInt(value)
                  setFormData(prev => ({ 
                    ...prev, 
                    UserType: newType,
                    Events: newType === ScannerUserType.Event ? prev.Events : [],
                    Organizers: newType === ScannerUserType.Organizer ? prev.Organizers : []
                  }))
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ScannerUserType.Event.toString()}>Event Scanner</SelectItem>
                  <SelectItem value={ScannerUserType.Organizer.toString()}>Organizer Scanner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Event Selection for Event Scanners */}
            {formData.UserType === ScannerUserType.Event && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Events *
                </Label>
                <div className="col-span-3 space-y-2">
                  {eventsLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading events...
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Select events this user can scan tickets for:
                      </div>
                      <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                        {availableEvents.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No events available</div>
                        ) : (
                          availableEvents.map((event) => (
                            <label key={event._id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.Events.some(e => e.event_id === event._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      Events: [...prev.Events, { event_id: event._id, _id: event._id }]
                                    }))
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      Events: prev.Events.filter(ev => ev.event_id !== event._id)
                                    }))
                                  }
                                }}
                              />
                              <span className="text-sm">{event.eventName || 'Unnamed Event'}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Selected: {formData.Events.length} event(s)
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Organizer Selection for Organizer Scanners */}
            {formData.UserType === ScannerUserType.Organizer && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Organizers *
                </Label>
                <div className="col-span-3 space-y-2">
                  {organizersLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading organizers...
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Select organizers this user can scan tickets for:
                      </div>
                      <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                        {availableOrganizers.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No organizers available</div>
                        ) : (
                          availableOrganizers.map((organizer) => (
                            <label key={organizer._id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.Organizers.some(o => o.organizer_id === organizer._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      Organizers: [...prev.Organizers, { organizer_id: organizer._id, _id: organizer._id }]
                                    }))
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      Organizers: prev.Organizers.filter(org => org.organizer_id !== organizer._id)
                                    }))
                                  }
                                }}
                              />
                              <span className="text-sm">{organizer.organizerName || 'Unnamed Organizer'}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Selected: {formData.Organizers.length} organizer(s)
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateScannerUser} disabled={createLoading}>
              {createLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Scanner User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Scanner User</DialogTitle>
            <DialogDescription>
              Update scanner user details and assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">
                Username
              </Label>
              <Input
                id="edit-username"
                value={formData.Username}
                disabled
                className="col-span-3 bg-gray-50"
                placeholder="Username cannot be changed"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-userType" className="text-right">
                User Type
              </Label>
              <Select 
                value={formData.UserType.toString()} 
                onValueChange={(value) => {
                  const newType = parseInt(value)
                  setFormData(prev => ({ 
                    ...prev, 
                    UserType: newType,
                    Events: newType === ScannerUserType.Event ? prev.Events : [],
                    Organizers: newType === ScannerUserType.Organizer ? prev.Organizers : []
                  }))
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ScannerUserType.Event.toString()}>Event Scanner</SelectItem>
                  <SelectItem value={ScannerUserType.Organizer.toString()}>Organizer Scanner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Event Selection for Event Scanners */}
            {formData.UserType === ScannerUserType.Event && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Events *
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Select events this user can scan tickets for:
                  </div>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {availableEvents.map((event) => (
                      <label key={event._id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.Events.some(e => e.event_id === event._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                Events: [...prev.Events, { event_id: event._id, _id: event._id }]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                Events: prev.Events.filter(ev => ev.event_id !== event._id)
                              }))
                            }
                          }}
                        />
                        <span className="text-sm">{event.eventName || 'Unnamed Event'}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Selected: {formData.Events.length} event(s)
                  </div>
                </div>
              </div>
            )}

            {/* Organizer Selection for Organizer Scanners */}
            {formData.UserType === ScannerUserType.Organizer && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Organizers *
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Select organizers this user can scan tickets for:
                  </div>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {availableOrganizers.map((organizer) => (
                      <label key={organizer._id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.Organizers.some(o => o.organizer_id === organizer._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                Organizers: [...prev.Organizers, { organizer_id: organizer._id, _id: organizer._id }]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                Organizers: prev.Organizers.filter(org => org.organizer_id !== organizer._id)
                              }))
                            }
                          }}
                        />
                        <span className="text-sm">{organizer.organizerName || 'Unnamed Organizer'}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Selected: {formData.Organizers.length} organizer(s)
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditScannerUser} disabled={updateLoading}>
              {updateLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Scanner User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Scanner User</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable this scanner user? This action will prevent them from scanning tickets.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Username: <span className="font-medium">{selectedUser.Username}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Type: <span className="font-medium">
                  {userTypeLabels[selectedUser.UserType as keyof typeof userTypeLabels]}
                </span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteScannerUser} disabled={deleteLoading}>
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
