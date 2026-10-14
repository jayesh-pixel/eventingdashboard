"use client"

import { authFetch } from "@/lib/auth-fetch"
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
import { formatEventDate } from "@/lib/utils"
import { eventEndPoint } from "@/lib/api-endpoints"
import { organizerEndpoint } from "@/lib/api-endpoints"
import { ScannerUser, ScannerUsersApiResponse, ScannerUserType, ScannerUserStatus } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { useToast } from "@/hooks/use-toast"
import { handleApiResponse, getApiErrorMessage } from "@/lib/utils"
import { getNumericAdminRole } from "@/lib/api-constants"
import { getPasswordError, getUsernameError } from "@/lib/credential-limits"

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

// Scanner login schema: Password min(5).max(10); updatePassword itself has no validator,
// so the same rules (plus no edge spaces, which the backend trims) are checked here.

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
  
  // Organizers for dropdown
  const [organizers, setOrganizers] = useState<any[]>([])
  const [loadingOrganizers, setLoadingOrganizers] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    userType: "1", // Default to Event Scanner
    selectedEvents: [] as string[],
    selectedOrganizers: [] as string[],
  })

  // Search states for filtering
  const [eventSearchTerm, setEventSearchTerm] = useState("")
  const [organizerSearchTerm, setOrganizerSearchTerm] = useState("")
  const fetchEvents = async () => {
    try {
      setLoadingEvents(true)
      const authToken = getValidToken()
      
      if (!authToken || !user) {
        console.warn("No auth token or user data available")
        return
      }      const payload = {
        AdminRole: 1,
        user_id: user.user_id
      }

      const response = await authFetch(eventEndPoint.GET_ALL_PUBLISHED_EVENTS_DATA, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },        body: JSON.stringify(payload),
      })

      if (response.status === 404) {
        setEvents([])
        return
      }

      const data = await handleApiResponse(response)
      console.log('Events API Response:', data)
      if (data.data) {
        // getPublishEvents only filters on EventStatus, but the scanner-user API
        // additionally requires the event to be enabled and rejects the whole
        // request with "Some events do not exist or are not Published/Enabled."
        // Dropping disabled events here keeps the picker in step with what the
        // register/update endpoints will actually accept.
        setEvents(data.data.filter((event: any) => event.EventIsEnableOrDisable !== 2))
      } else {
        console.warn('Events API returned no data:', data)
        setEvents([])
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      setEvents([])
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to fetch events"),
        variant: "destructive",
      })
    } finally {
      setLoadingEvents(false)
    }
  }

  const fetchOrganizers = async () => {
    try {
      setLoadingOrganizers(true)
      const authToken = getValidToken()
      
      if (!authToken || !user) {
        console.warn("No auth token or user data available")
        return
      }

      const response = await authFetch(organizerEndpoint.GET_ALL_ORGANIZERS_DATA_URL, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      })

      // Backend answers 404 when there are no active organizers
      if (response.status === 404) {
        setOrganizers([])
        return
      }

      const data = await handleApiResponse(response)
      console.log('Organizers API Response:', data)
      if (data.data) {
        setOrganizers(data.data)
      } else {
        console.warn('Organizers API returned no data:', data)
        setOrganizers([])
      }
    } catch (error) {
      console.error("Error fetching organizers:", error)
      setOrganizers([])
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to fetch organizers"),
        variant: "destructive",
      })
    } finally {
      setLoadingOrganizers(false)
    }
  }

  const fetchScannerUsers = async () => {
    try {      setLoading(true)
      setError(null)
      
      // authFetch (not apiClient) so the 404 status is visible: the backend answers
      // 404 "Scanner Users not found" when there are none, which is an empty list
      const response = await authFetch(scannerUserEndpoint.GET_ALL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (response.status === 404) {
        setScannerUsers([])
        setFilteredUsers([])
        return
      }

      const data: ScannerUsersApiResponse = await handleApiResponse(response)
      console.log('Scanner Users API Response:', data)

      // Handle both possible response structures
      let users: ScannerUser[]
      if (Array.isArray(data)) {
        // Direct array format
        users = data
      } else if (Array.isArray(data?.data)) {
        // Nested format
        users = data.data
      } else {
        throw new Error('Invalid response format')
      }

      console.log('Parsed users:', users)
      setScannerUsers(users)
      setFilteredUsers(users)
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
    if (
      user.UserType === ScannerUserType.Event &&
      Array.isArray(user.Events) &&
      user.Events.length > 0
    ) {
      return {
        type: "Event",
        count: user.Events.length,
        display: `${user.Events.length} Event${user.Events.length > 1 ? 's' : ''}`
      }
    } else if (
      user.UserType === ScannerUserType.Organizer &&
      Array.isArray(user.Organizers) &&
      user.Organizers.length > 0
    ) {
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

  /**
   * Build the Events/Organizers half of a scanner-user payload.
   *
   * The API validates both keys with a "min 1 item" rule that fires whenever the
   * key is present, so posting `Events: []` for an Organizer Scanner came back as
   * `"Events" must contain at least 1 items` (and the mirror image for the other
   * type) even though the operator had made a valid selection. Omitting the key
   * that does not apply to the chosen UserType skips that rule entirely.
   */
  const buildAssignmentPayload = () => {
    if (formData.userType === "1") {
      return { Events: formData.selectedEvents.map(eventId => ({ event_id: eventId })) }
    }
    return { Organizers: formData.selectedOrganizers.map(orgId => ({ organizer_id: orgId })) }
  }

  // Flagged in red while typing; the backend trims the username before saving it
  const usernameError = getUsernameError(formData.username.trim())
  const passwordError = getPasswordError(formData.password)

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

    if (usernameError || passwordError) {
      toast({
        title: "Error",
        description: usernameError || passwordError,
        variant: "destructive",
      })
      return
    }    if (formData.userType === "1" && formData.selectedEvents.length === 0) {
      toast({
        title: "Error", 
        description: "Event Scanner must have at least one event assigned",
        variant: "destructive",
      })
      return
    }

    if (formData.userType === "2" && formData.selectedOrganizers.length === 0) {
      toast({
        title: "Error", 
        description: "Organizer Scanner must have at least one organizer assigned",
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
        Username: formData.username.trim(),
        Password: formData.password,
        UserType: Number(formData.userType),
        ...buildAssignmentPayload(),
        CreatedBy: getNumericAdminRole(user?.AdminRole || "superadmin"),
        createduser_id: user.user_id,
      }

      const response = await authFetch(scannerUserEndpoint.REGISTER, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await handleApiResponse(response)

      toast({
        title: "Success",
        description: "Scanner user created successfully",
      })
      setIsCreateDialogOpen(false)
      resetForm()
      await fetchScannerUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to create scanner user"),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    if ((formData.userType === "1" && loadingEvents) || (formData.userType === "2" && loadingOrganizers)) {
      toast({
        title: "Please wait",
        description: "Still loading the available assignments. Try again in a moment.",
      })
      return
    }

    // The backend rejects the whole update if any id is not a Published+Enabled event /
    // Active organizer. Previously assigned ids missing from the loaded lists can't be
    // seen or unticked, so drop them and let the user review before saving again.
    const isEventScanner = formData.userType === "1"
    const selectedIds = isEventScanner ? formData.selectedEvents : formData.selectedOrganizers
    const availableIds = new Set((isEventScanner ? events : organizers).map((item: any) => item._id))
    const staleCount = selectedIds.filter(id => !availableIds.has(id)).length
    if (staleCount > 0) {
      const remaining = selectedIds.filter(id => availableIds.has(id))
      setFormData(prev => isEventScanner
        ? { ...prev, selectedEvents: remaining }
        : { ...prev, selectedOrganizers: remaining })
      toast({
        title: "Assignments changed",
        description: isEventScanner
          ? `${staleCount} previously assigned event(s) are no longer published/enabled and were removed from the selection. Review and click Update again.`
          : `${staleCount} previously assigned organizer(s) are no longer active and were removed from the selection. Review and click Update again.`,
        variant: "destructive",
      })
      return
    }

    const newPassword = formData.password
    if (newPassword) {
      // Backend trims before hashing, so leading/trailing spaces would not match at login
      if (passwordError) {
        toast({
          title: "Error",
          description: passwordError,
          variant: "destructive",
        })
        return
      }
      // updatePassword only finds Active scanner users
      if (selectedUser.status !== 1) {
        toast({
          title: "Error",
          description: "Enable this scanner user before changing the password",
          variant: "destructive",
        })
        return
      }
    }

    if (formData.userType === "1" && formData.selectedEvents.length === 0) {
      toast({
        title: "Error",
        description: "Event Scanner must have at least one event assigned",
        variant: "destructive",
      })
      return
    }

    if (formData.userType === "2" && formData.selectedOrganizers.length === 0) {
      toast({
        title: "Error",
        description: "Organizer Scanner must have at least one organizer assigned",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const authToken = getValidToken()
      if (!authToken) {
        throw new Error("Authentication required")
      }

      const payload = {
        scanneruser_id: selectedUser._id,
        UserType: Number(formData.userType),
        ...buildAssignmentPayload(),
      }

      const response = await authFetch(scannerUserEndpoint.UPDATE_DETAILS, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await handleApiResponse(response)

      if (newPassword) {
        try {
          const passwordResponse = await authFetch(scannerUserEndpoint.UPDATE_PASSWORD, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              scanneruser_id: selectedUser._id,
              new_password: newPassword,
              CreatedBy: getNumericAdminRole(user?.AdminRole || "superadmin"),
              createduser_id: user?.user_id || "",
            }),
          })
          await handleApiResponse(passwordResponse)
        } catch (passwordError) {
          // Assignments were saved; keep the dialog open so the password can be retried
          toast({
            title: "Password not changed",
            description: `Assignments were updated, but the password change failed: ${getApiErrorMessage(passwordError, "Unknown error")}`,
            variant: "destructive",
          })
          await fetchScannerUsers()
          return
        }
      }

      toast({
        title: "Success",
        description: newPassword ? "Scanner user and password updated successfully" : "Scanner user updated successfully",
      })
      setIsEditDialogOpen(false)
      resetForm()
      await fetchScannerUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update scanner user"),
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
      
      const response = await authFetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scanneruser_id: userId }),
      })

      const data = await handleApiResponse(response)

      toast({
        title: "Success",
        description: `Scanner user ${currentStatus === 1 ? 'disabled' : 'enabled'} successfully`,
      })
      await fetchScannerUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update user status"),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }
  const openEditDialog = async (user: ScannerUser) => {
    setSelectedUser(user)
    
    const selectedOrganizerIds = Array.isArray(user.Organizers) ? user.Organizers.map(o => o.organizer_id) : []
    
    setFormData({
      username: user.Username,
      password: "", // Don't show existing password
      userType: user.UserType.toString(),
      selectedEvents: Array.isArray(user.Events) ? user.Events.map(e => e.event_id) : [],
      selectedOrganizers: selectedOrganizerIds,
    })
    
    // Fetch organizers if this is an organizer scanner and wait for them to load
    if (user.UserType === ScannerUserType.Organizer) {
      await fetchOrganizers()
    }
    
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
    setEventSearchTerm("")
    setOrganizerSearchTerm("")
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
            <Button                           className="px-4 py-2 text-sm rounded-full md:px-6 md:py-2 md:text-base"
>
              <Plus className="mr-2 h-4 w-4" />
              Create 
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
                    placeholder="Enter username (5-50 characters)"
                    className={usernameError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {usernameError && <p className="text-sm text-red-600">{usernameError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password (5-10 characters)"
                    className={passwordError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userType">User Type *</Label>
                <Select value={formData.userType} onValueChange={(value) => {
                  setFormData({ ...formData, userType: value, selectedEvents: [], selectedOrganizers: [] })
                  if (value === "2") {
                    fetchOrganizers()
                  }
                }}>
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
                  <div className="border rounded-md overflow-hidden">
                    {/* Search input for events */}
                    <div className="p-3 border-b bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search events..."
                          value={eventSearchTerm}
                          onChange={(e) => setEventSearchTerm(e.target.value)}
                          className="pl-10 bg-white"
                        />
                      </div>
                    </div>
                    
                    <div className="p-3 max-h-40 overflow-y-auto">
                      {loadingEvents ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading events...
                        </div>
                      ) : events.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground text-sm mb-2">No published events available</p>
                          <p className="text-xs text-muted-foreground">Please ensure events are published before creating scanner users</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {events
                            .filter((event) => {
                              const eventName = event.EventName || event.eventName || event.name || 'Unnamed Event'
                              const venueName = event.VenueName || ''
                              return eventName.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                                     venueName.toLowerCase().includes(eventSearchTerm.toLowerCase())
                            })
                            .map((event) => (
                            <div key={event._id} className="flex items-start space-x-3 p-2 rounded border hover:bg-gray-50">
                              <input
                                type="radio"
                                name="create-event-selection"
                                id={`event-${event._id}`}
                                checked={formData.selectedEvents[0] === event._id}
                                onChange={() => {
                                  setFormData({
                                    ...formData,
                                    selectedEvents: [event._id]
                                  })
                                }}
                                className="border-gray-300 mt-1"
                              />
                              <div className="flex-1">
                                <Label htmlFor={`event-${event._id}`} className="text-sm font-medium cursor-pointer">
                                  {event.EventName || event.eventName || event.name || 'Unnamed Event'}
                                </Label>
                                <div className="text-xs text-muted-foreground mt-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <span>📍 {event.VenueName || 'Venue TBA'}</span>
                                    <span>📅 {event.arrangedEventDateTime?.[0] ? formatEventDate(event.arrangedEventDateTime[0].EventStartDateTime) : 'Date TBA'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {events.filter((event) => {
                            const eventName = event.EventName || event.eventName || event.name || 'Unnamed Event'
                            const venueName = event.VenueName || ''
                            return eventName.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                                   venueName.toLowerCase().includes(eventSearchTerm.toLowerCase())
                          }).length === 0 && eventSearchTerm && (
                            <div className="text-center py-4">
                              <p className="text-muted-foreground text-sm">No events found matching "{eventSearchTerm}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
                  <Label>Organizer Assignment *</Label>
                  <div className="border rounded-md overflow-hidden">
                    {/* Search input for organizers */}
                    <div className="p-3 border-b bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search organizers..."
                          value={organizerSearchTerm}
                          onChange={(e) => setOrganizerSearchTerm(e.target.value)}
                          className="pl-10 bg-white"
                        />
                      </div>
                    </div>
                    
                    <div className="p-3 max-h-40 overflow-y-auto">
                      {loadingOrganizers ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading organizers...
                        </div>
                      ) : organizers.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground text-sm mb-2">No organizers available</p>
                          <p className="text-xs text-muted-foreground">Please ensure organizers are registered before creating organizer scanner users</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {organizers
                            .filter((organizer) => {
                              const organizerName = organizer.Username || organizer.FullName || organizer.CompanyName || 'Unnamed Organizer'
                              const email = organizer.Email || ''
                              const phone = organizer.Phone1 || ''
                              const company = organizer.CompanyName || ''
                              return organizerName.toLowerCase().includes(organizerSearchTerm.toLowerCase()) ||
                                     email.toLowerCase().includes(organizerSearchTerm.toLowerCase()) ||
                                     phone.includes(organizerSearchTerm) ||
                                     company.toLowerCase().includes(organizerSearchTerm.toLowerCase())
                            })
                            .sort((a, b) => {
                              const aSelected = formData.selectedOrganizers.includes(a._id)
                              const bSelected = formData.selectedOrganizers.includes(b._id)
                              if (aSelected && !bSelected) return -1
                              if (!aSelected && bSelected) return 1
                              return 0
                            })
                            .map((organizer) => {
                              const isSelected = formData.selectedOrganizers.includes(organizer._id)
                              return (
                            <div key={organizer._id} className={`flex items-start space-x-3 p-2 rounded border transition-colors ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'hover:bg-gray-50'}`}>
                              <input
                                type="checkbox"
                                id={`organizer-${organizer._id}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      selectedOrganizers: [...formData.selectedOrganizers, organizer._id]
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selectedOrganizers: formData.selectedOrganizers.filter(id => id !== organizer._id)
                                    })
                                  }
                                }}
                                className="rounded border-gray-300 mt-1"
                              />
                              <div className="flex-1">
                                <Label htmlFor={`organizer-${organizer._id}`} className={`text-sm font-medium cursor-pointer ${isSelected ? 'text-blue-700' : ''}`}>
                                  {organizer.Username || organizer.FullName || organizer.CompanyName || 'Unnamed Organizer'}
                                </Label>
                                <div className="text-xs text-muted-foreground mt-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <span>📧 {organizer.Email || 'No email'}</span>
                                    <span>📱 {organizer.Phone1 || 'No phone'}</span>
                                    <span>🏢 {organizer.CompanyName || 'No company'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )})}
                          {organizers.filter((organizer) => {
                            const organizerName = organizer.Username || organizer.FullName || organizer.CompanyName || 'Unnamed Organizer'
                            const email = organizer.Email || ''
                            const phone = organizer.Phone1 || ''
                            const company = organizer.CompanyName || ''
                            return organizerName.toLowerCase().includes(organizerSearchTerm.toLowerCase()) ||
                                   email.toLowerCase().includes(organizerSearchTerm.toLowerCase()) ||
                                   phone.includes(organizerSearchTerm) ||
                                   company.toLowerCase().includes(organizerSearchTerm.toLowerCase())
                          }).length === 0 && organizerSearchTerm && (
                            <div className="text-center py-4">
                              <p className="text-muted-foreground text-sm">No organizers found matching "{organizerSearchTerm}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {formData.selectedOrganizers.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {formData.selectedOrganizers.length} organizer(s) selected
                    </p>
                  )}
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
                  className={passwordError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editUserType">User Type *</Label>
              <Select value={formData.userType} onValueChange={(value) => {
                setFormData({ ...formData, userType: value, selectedEvents: [], selectedOrganizers: [] })
                if (value === "2") {
                  fetchOrganizers()
                }
              }}>
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
                <div className="border rounded-md overflow-hidden">
                  {/* Search input for events */}
                  <div className="p-3 border-b bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search events..."
                        value={eventSearchTerm}
                        onChange={(e) => setEventSearchTerm(e.target.value)}
                        className="pl-10 bg-white"
                      />
                    </div>
                  </div>
                  
                  <div className="p-3 max-h-40 overflow-y-auto">
                    {loadingEvents ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading events...
                      </div>
                    ) : events.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm mb-2">No published events available</p>
                        <p className="text-xs text-muted-foreground">Please ensure events are published before creating scanner users</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {events
                          .filter((event) => {
                            const eventName = event.EventName || event.eventName || event.name || 'Unnamed Event'
                            const venueName = event.VenueName || ''
                            return eventName.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                                   venueName.toLowerCase().includes(eventSearchTerm.toLowerCase())
                          })
                          .map((event) => (
                          <div key={event._id} className="flex items-start space-x-3 p-2 rounded border hover:bg-gray-50">
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
                              className="rounded border-gray-300 mt-1"
                            />
                            <div className="flex-1">
                              <Label htmlFor={`edit-event-${event._id}`} className="text-sm font-medium cursor-pointer">
                                {event.EventName || event.eventName || event.name || 'Unnamed Event'}
                              </Label>
                              <div className="text-xs text-muted-foreground mt-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                  <span>📍 {event.VenueName || 'Venue TBA'}</span>
                                  <span>📅 {event.arrangedEventDateTime?.[0] ? formatEventDate(event.arrangedEventDateTime[0].EventStartDateTime) : 'Date TBA'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {events.filter((event) => {
                          const eventName = event.EventName || event.eventName || event.name || 'Unnamed Event'
                          const venueName = event.VenueName || ''
                          return eventName.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                                 venueName.toLowerCase().includes(eventSearchTerm.toLowerCase())
                        }).length === 0 && eventSearchTerm && (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground text-sm">No events found matching "{eventSearchTerm}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                <Label>Organizer Assignment *</Label>
                <div className="border rounded-md overflow-hidden">
                  {/* Search input for organizers */}
                  <div className="p-3 border-b bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search organizers..."
                        value={organizerSearchTerm}
                        onChange={(e) => setOrganizerSearchTerm(e.target.value)}
                        className="pl-10 bg-white"
                      />
                    </div>
                  </div>
                  
                  <div className="p-3 max-h-40 overflow-y-auto">
                    {loadingOrganizers ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading organizers...
                      </div>
                    ) : organizers.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm mb-2">No organizers available</p>
                        <p className="text-xs text-muted-foreground">Please ensure organizers are registered before creating organizer scanner users</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {organizers
                          .filter((organizer) => {
                            const organizerName = organizer.Username || organizer.FullName || organizer.CompanyName || 'Unnamed Organizer'
                            const email = organizer.Email || ''
                            const phone = organizer.Phone1 || ''
                            const company = organizer.CompanyName || ''
                            return organizerName.toLowerCase().includes(organizerSearchTerm.toLowerCase()) ||
                                   email.toLowerCase().includes(organizerSearchTerm.toLowerCase()) ||
                                   phone.includes(organizerSearchTerm) ||
                                   company.toLowerCase().includes(organizerSearchTerm.toLowerCase())
                          })
                          .sort((a, b) => {
                            const aSelected = formData.selectedOrganizers.includes(a._id)
                            const bSelected = formData.selectedOrganizers.includes(b._id)
                            if (aSelected && !bSelected) return -1
                            if (!aSelected && bSelected) return 1
                            return 0
                          })
                          .map((organizer) => {
                            const isSelected = formData.selectedOrganizers.includes(organizer._id)
                            return (
                          <div key={organizer._id} className={`flex items-start space-x-3 p-2 rounded border transition-colors ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'hover:bg-gray-50'}`}>
                            <input
                              type="checkbox"
                              id={`edit-organizer-${organizer._id}`}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    selectedOrganizers: [...formData.selectedOrganizers, organizer._id]
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedOrganizers: formData.selectedOrganizers.filter(id => id !== organizer._id)
                                  })
                                }
                              }}
                              className="rounded border-gray-300 mt-1"
                            />
                            <div className="flex-1">
                              <Label htmlFor={`edit-organizer-${organizer._id}`} className={`text-sm font-medium cursor-pointer ${isSelected ? 'text-blue-700' : ''}`}>
                                {organizer.Username || organizer.FullName || organizer.CompanyName || 'Unnamed Organizer'}
                              </Label>
                              <div className="text-xs text-muted-foreground mt-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                  <span>📧 {organizer.Email || 'No email'}</span>
                                  <span>📱 {organizer.Phone1 || 'No phone'}</span>
                                  <span>🏢 {organizer.CompanyName || 'No company'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )})}
                        {organizers.filter((organizer) => {
                          const organizerName = organizer.Username || organizer.FullName || organizer.CompanyName || 'Unnamed Organizer'
                          const email = organizer.Email || ''
                          const phone = organizer.Phone1 || ''
                          const company = organizer.CompanyName || ''
                          return organizerName.toLowerCase().includes(organizerSearchTerm.toLowerCase()) ||
                                 email.toLowerCase().includes(organizerSearchTerm.toLowerCase()) ||
                                 phone.includes(organizerSearchTerm) ||
                                 company.toLowerCase().includes(organizerSearchTerm.toLowerCase())
                        }).length === 0 && organizerSearchTerm && (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground text-sm">No organizers found matching "{organizerSearchTerm}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {formData.selectedOrganizers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formData.selectedOrganizers.length} organizer(s) selected
                  </p>
                )}
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
            {/* Backend Status enum: Active = 1, Inactive = 2 (set by Disable) */}
            <SelectItem value="1">Active</SelectItem>
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
                
                            <TableCell>
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
