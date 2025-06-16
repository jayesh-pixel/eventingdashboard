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
import { ScannerUser, ScannerUsersApiResponse, ScannerUserType, ScannerUserStatus } from "@/lib/types"
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

export default function ScannerUsersPage() {
  const [scannerUsers, setScannerUsers] = useState<ScannerUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<ScannerUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const fetchScannerUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.get<ScannerUsersApiResponse>(scannerUserEndpoint.GET_ALL)

      if (response.success && response.data) {
        if (response.data.error) {
          throw new Error(response.data.message || 'Failed to fetch scanner users')
        }
        setScannerUsers(response.data.data)
        setFilteredUsers(response.data.data)
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
  }, [])

  useEffect(() => {
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
    }
  }

  const handleCreateScannerUser = () => {
    // TODO: Implement create scanner user functionality
    console.log('Create scanner user clicked')
    setIsCreateDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Scanner Users</h1>
          <p className="text-muted-foreground">Manage ticket scanning users and their assignments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Scanner User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Scanner User</DialogTitle>
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
        <CardHeader>
          <CardTitle>
            Scanner Users 
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredUsers.length} total)
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
          ) : filteredUsers.length === 0 ? (
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
                {filteredUsers.map((user) => {
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
                            onClick={() => console.log('Edit scanner user:', user._id)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => console.log('Delete scanner user:', user._id)}
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
    </div>
  )
}
