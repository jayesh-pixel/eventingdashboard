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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, PlusCircle, Search, Edit, Trash2, MapPin, Users, Upload, Loader2 } from "lucide-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { venueEndPoint, getallcityDataEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { getNumericAdminRole } from "@/lib/api-constants"

interface VenuesPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface Venue {
  _id: string
  Name: string
  Description: string | null
  Address: string
  City: string
  State: string
  Country: string
  CountryIsoCode: string
  StateIsoCode: string
  CityIsoCode: string
  Map_Location: string
  Images: Array<{
    image_path: string
    _id: string
  }>
  status: number
  createdAt: string
  FilterationDateTime: string
  Priority: number
  __v?: number
}

interface ApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalVenue: number
    VenueData: Venue[]
  }
}

const ITEMS_PER_PAGE = 10

export default function VenuesPage({ params }: VenuesPageProps) {
  // Handle params which might be a Promise
  let resolvedParams: { role: UserRole }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role } = resolvedParams

  const { toast } = useToast()
  const { user } = useAuth()

  // State management
  const [venues, setVenues] = React.useState<Venue[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalVenues, setTotalVenues] = React.useState(0)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedVenue, setSelectedVenue] = React.useState<Venue | null>(null)
  const [apiError, setApiError] = React.useState<string | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    venueName: "",
    priority: 0,
    venueDescription: "",
    fullAddress: "",
    state: "Meghalaya",
    city: "",
    mapLocation: "",
  })

  // State/city data for dropdowns (AddAddress logic)
  interface State { id: number; name: string; iso2: string; }
  interface City { id: number; name: string; }
  const [stateData, setStateData] = React.useState<State[]>([]);
  const [cityData, setCityData] = React.useState<City[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(false);
  const API_KEY = "TUo5UThvYmNjckE0U294WmdzeFBtZmV4RzZlMUxhUHhTaG05TURVdQ==";

  // Fetch all states on dialog open
  React.useEffect(() => {
    if ((isCreateDialogOpen || isEditDialogOpen)) {
      const fetchStates = async () => {
        try {
          const resp = await fetch("https://api.countrystatecity.in/v1/countries/IN/states", {
            headers: { "X-CSCAPI-KEY": API_KEY }
          });
          if (!resp.ok) throw new Error("Failed to fetch states");
          const data = await resp.json();
          setStateData(data);
        } catch (err) {
          setStateData([]);
        }
      };
      fetchStates();
    }
  }, [isCreateDialogOpen, isEditDialogOpen]);

  // Fetch cities when state changes
  React.useEffect(() => {
    if (formData.state && (isCreateDialogOpen || isEditDialogOpen)) {
      setLoadingCities(true);
      const fetchCities = async () => {
        try {
          const selectedState = stateData.find(s => s.name === formData.state);
          if (!selectedState) { setCityData([]); setLoadingCities(false); return; }
          const resp = await fetch(`https://api.countrystatecity.in/v1/countries/IN/states/${selectedState.iso2}/cities`, {
            headers: { "X-CSCAPI-KEY": API_KEY }
          });
          if (!resp.ok) throw new Error("Failed to fetch cities");
          const data = await resp.json();
          setCityData(data);
        } catch (err) {
          setCityData([]);
        } finally {
          setLoadingCities(false);
        }
      };
      fetchCities();
    } else {
      setCityData([]);
    }
  }, [formData.state, isCreateDialogOpen, isEditDialogOpen, stateData]);

  // ...existing code...

  // API function to fetch venues
  const fetchVenues = React.useCallback(async (page: number = 1, limit: number = ITEMS_PER_PAGE) => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = getValidToken()
      if (!user || !authToken) {
        console.warn("No user or auth token available")
        return
      }

      const response = await fetch(venueEndPoint.VENUES_PAGINATED_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          AdminRole: getNumericAdminRole(user.AdminRole || role),
          user_id: user.user_id,
          page: page,
          limit: limit.toString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to fetch venues")
      }

      setVenues(data.data.VenueData || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalVenues(data.data.totalVenue || 0)
      setCurrentPage(data.data.currentPage || 1)

    } catch (error) {
      console.error("Venues fetch failed:", error)
      setApiError("Could not fetch venues from server")
      
      toast({
        title: "API Error",
        description: "Could not fetch venues from server.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, role])

  // Initial data fetch
  React.useEffect(() => {
    fetchVenues(currentPage)
  }, [currentPage, fetchVenues])

  // Filter venues based on search (client-side)
  const filteredVenues = React.useMemo(() => {
    if (!searchTerm) return venues
    return venues.filter(
      (venue) =>
        venue.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.City.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [venues, searchTerm])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchVenues(page)
  }

  const handleCreateVenue = async () => {
    if (!formData.venueName.trim() || !formData.venueDescription.trim() || !formData.fullAddress.trim() || !formData.mapLocation.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      const payload = {
        AdminRole: getNumericAdminRole(user.AdminRole || role),
        user_id: user.user_id,
        Name: formData.venueName,
        Description: formData.venueDescription,
        Address: formData.fullAddress,
        City: formData.city,
        State: formData.state,
        Country: "India",
        CountryIsoCode: "IN",
        StateIsoCode: "",
        CityIsoCode: "",
        Map_Location: formData.mapLocation,
        Priority: formData.priority,
      }

      const response = await fetch(venueEndPoint.VENUE_CREATION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.message || "Failed to create venue")
      }

      await fetchVenues(currentPage)
      setIsCreateDialogOpen(false)
      resetForm()

      toast({
        title: "Success",
        description: result.message || "Venue created successfully",
      })
    } catch (error) {
      console.error("Create venue error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create venue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditVenue = async () => {
    if (!selectedVenue || !formData.venueName.trim() || !formData.venueDescription.trim() || !formData.fullAddress.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      const payload = {
        AdminRole: getNumericAdminRole(user.AdminRole || role),
        user_id: user.user_id,
        venue_id: selectedVenue._id,
        Name: formData.venueName,
        Description: formData.venueDescription,
        Address: formData.fullAddress,
        City: formData.city,
        State: formData.state,
        Country: "India",
        CountryIsoCode: "IN",
        StateIsoCode: "",
        CityIsoCode: "",
        Map_Location: formData.mapLocation,
        Priority: formData.priority,
      }

      const response = await fetch(venueEndPoint.VENUE_DATA_UPDATED, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.message || "Failed to update venue")
      }

      await fetchVenues(currentPage)
      setIsEditDialogOpen(false)
      setSelectedVenue(null)
      resetForm()

      toast({
        title: "Success",
        description: result.message || "Venue updated successfully",
      })
    } catch (error) {
      console.error("Update venue error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update venue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVenue = async (venueId: string) => {
    setLoading(true)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      const payload = {
        AdminRole: getNumericAdminRole(user.AdminRole || role),
        user_id: user.user_id,
        venue_id: venueId,
      }

      const response = await fetch(venueEndPoint.VENUE_DELETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.message || "Failed to delete venue")
      }

      await fetchVenues(currentPage)

      toast({
        title: "Success",
        description: result.message || "Venue deleted successfully",
      })
    } catch (error) {
      console.error("Delete venue error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete venue",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (venue: Venue) => {
    setSelectedVenue(venue)
    setFormData({
      venueName: venue.Name,
      priority: venue.Priority,
      venueDescription: venue.Description || "",
      fullAddress: venue.Address,
      city: venue.City,
      state: venue.State,
      mapLocation: venue.Map_Location,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      venueName: "",
      priority: 0,
      venueDescription: "",
      fullAddress: "",
      state: "Meghalaya",
      city: "",
      mapLocation: "",
    })
    setSelectedVenue(null)
  }

  // Helper function to get status display
  const getStatusDisplay = (status: number): { text: string; variant: "default" | "secondary" } => {
    return status === 1 
      ? { text: "Active", variant: "default" } 
      : { text: "Inactive", variant: "secondary" }
  }

  if (role !== "superadmin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. This page is only available to Super Admins.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Venues Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Venue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Venue</DialogTitle>
              <DialogDescription>Add a new venue to the system.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venueName">Venue Name *</Label>
                  <Input
                    id="venueName"
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                    placeholder="Enter venue name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    placeholder="Enter priority"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="venueDescription">Venue Description *</Label>
                <Textarea
                  id="venueDescription"
                  value={formData.venueDescription}
                  onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
                  placeholder="Enter venue description"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullAddress">Full Address *</Label>
                <Textarea
                  id="fullAddress"
                  value={formData.fullAddress}
                  onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select value={formData.state} onValueChange={(value) => {
                    setFormData({ ...formData, state: value, city: "" })
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {stateData.map(state => (
                        <SelectItem key={state.id} value={state.name}>{state.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                    disabled={!formData.state || loadingCities || cityData.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCities ? "Loading..." : cityData.length === 0 ? "Select state first" : "Select city"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cityData.map(city => (
                        <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mapLocation">Map Location *</Label>
                <Textarea
                  id="mapLocation"
                  value={formData.mapLocation}
                  onChange={(e) => setFormData({ ...formData, mapLocation: e.target.value })}
                  placeholder="Enter map embed code or location URL"
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateVenue} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Venue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Venues Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Venues</CardTitle>
          <CardDescription>
            View and manage venues.
            {loading && " Loading..."}
            {!loading && ` (${totalVenues} total, page ${currentPage} of ${totalPages})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading venues...</span>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchTerm ? `No venues found matching "${searchTerm}"` : "No venues found"}
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVenues.map((venue) => {
                    const statusDisplay = getStatusDisplay(venue.status)
                    return (
                      <TableRow key={venue._id}>
                        <TableCell className="font-medium">{venue.Name}</TableCell>
                        <TableCell>{venue.City}</TableCell>
                        <TableCell>{venue.State}</TableCell>
                        <TableCell>{venue.Priority}</TableCell>
                        <TableCell>
                          <Badge variant={statusDisplay.variant}>
                            {statusDisplay.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(venue)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteVenue(venue._id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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
                    {[...Array(Math.min(totalPages, 10))].map((_, i) => {
                      const page = i + 1
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === page}
                            onClick={(e) => {
                              e.preventDefault()
                              handlePageChange(page)
                            }}
                          >
                            {page}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
            <DialogDescription>Update venue information.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editVenueName">Venue Name *</Label>
                <Input
                  id="editVenueName"
                  value={formData.venueName}
                  onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  placeholder="Enter venue name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPriority">Priority</Label>
                <Input
                  id="editPriority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="Enter priority"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editVenueDescription">Venue Description *</Label>
              <Textarea
                id="editVenueDescription"
                value={formData.venueDescription}
                onChange={(e) => setFormData({ ...formData, venueDescription: e.target.value })}
                placeholder="Enter venue description"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editFullAddress">Full Address *</Label>
              <Textarea
                id="editFullAddress"
                value={formData.fullAddress}
                onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                placeholder="Enter full address"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editState">State</Label>
                <Select value={formData.state} onValueChange={(value) => {
                  setFormData({ ...formData, state: value, city: "" })
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {stateData.map(state => (
                      <SelectItem key={state.id} value={state.name}>{state.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCity">City</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                  disabled={!formData.state || loadingCities || cityData.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCities ? "Loading..." : cityData.length === 0 ? "Select state first" : "Select city"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cityData.map(city => (
                      <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editMapLocation">Map Location *</Label>
              <Textarea
                id="editMapLocation"
                value={formData.mapLocation}
                onChange={(e) => setFormData({ ...formData, mapLocation: e.target.value })}
                placeholder="Enter map embed code or location URL"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVenue} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Venue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
