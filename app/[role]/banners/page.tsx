"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, RefreshCw, AlertCircle, Plus, Edit, Trash2, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { bannerEndpoint } from "@/lib/api-endpoints"
import { eventEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import type { Banner, BannersApiResponse } from "@/lib/types"
import { getNumericAdminRole } from "@/lib/api-constants"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import Image from "next/image"

interface BannersPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

const statusColors = {
  0: "bg-gray-100 text-gray-800",    // Inactive
  1: "bg-green-100 text-green-800",  // Active
}

const statusLabels = {
  0: "Inactive",
  1: "Active",
}

export default function BannersPage({ params }: BannersPageProps) {
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
  const [banners, setBanners] = React.useState<Banner[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = React.useState(false)
  const [selectedBanner, setSelectedBanner] = React.useState<Banner | null>(null)
  const [showViewDialog, setShowViewDialog] = React.useState(false)
  
  // CRUD dialogs
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [showEditDialog, setShowEditDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  // Image upload state
  const [selectedImages, setSelectedImages] = React.useState<File[]>([])
  const [uploadingImages, setUploadingImages] = React.useState(false)
  const [imageValidationErrors, setImageValidationErrors] = React.useState<string[]>([])
  
  // Events for dropdown
  const [events, setEvents] = React.useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = React.useState(false)
  
  // Form data
  const [formData, setFormData] = React.useState({
    eventId: "",
    desktopImage: null as File | null,
    mobileImage: null as File | null,
  })
  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch events for dropdown
  const fetchEvents = React.useCallback(async () => {
    setLoadingEvents(true)
    try {
      const token = getValidToken()
      if (!token) return

      if (!user) return

      // Prepare request payload as required by API
      const numericRole = getNumericAdminRole(user.AdminRole)
      const requestPayload = {
        AdminRole: numericRole,
        user_id: user.user_id,
        page: "1",
        limit: "100", // Get more events for selection
      }
      
      const response = await fetch(eventEndPoint.GET_ALL_EVENTS_DATA_BY_ADMIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      })

      if (response.ok) {
        const result = await response.json()
        if (!result.error && result.data) {
          setEvents(result.data)
        } else {
          setEvents([])
        }
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoadingEvents(false)
    }
  }, [user])

  // Fetch banners data
  const fetchBanners = React.useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    setApiError(null)
    
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("No valid authentication token found")
      }

      const response = await fetch(bannerEndpoint.GET_ALL_BANNERS, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: BannersApiResponse = await response.json()
      
      if (result.error) {
        throw new Error(result.message || "Failed to fetch banners")
      }

      setBanners(result.data)
    } catch (error) {
      console.error("Error fetching banners:", error)
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      setApiError(errorMessage)
      setShowErrorDialog(true)
      setBanners([])
    } finally {
      setLoading(false)
    }
  }, [user])
  // Initial load
  React.useEffect(() => {
    fetchBanners()
    fetchEvents()
  }, [fetchBanners, fetchEvents])

  // Filter banners based on search
  const filteredBanners = React.useMemo(() => {
    if (!debouncedSearchTerm) return banners
    return banners.filter((banner) => 
      banner.Event_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      banner._id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [banners, debouncedSearchTerm])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Image validation functions
  const validateImageFile = (file: File, imageType: 'desktop' | 'mobile'): Promise<string | null> => {
    return new Promise((resolve) => {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
      if (!allowedTypes.includes(file.type)) {
        resolve(`File "${file.name}" must be JPG, PNG, or SVG format`)
        return
      }

      // Check file size (2MB = 2 * 1024 * 1024 bytes)
      const maxSize = 2 * 1024 * 1024
      if (file.size > maxSize) {
        resolve(`File "${file.name}" must be smaller than 2 MB`)
        return
      }

      // Check dimensions
      const img = new window.Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        const { width, height } = img

        if (imageType === 'desktop') {
          if (width !== 2000 || height !== 500) {
            resolve(`Desktop image "${file.name}" must be exactly 2000x500 pixels (current: ${width}x${height})`)
          } else {
            resolve(null) // Valid
          }
        } else if (imageType === 'mobile') {
          if (width !== 1920 || height !== 1080) {
            resolve(`Mobile image "${file.name}" must be exactly 1920x1080 pixels (current: ${width}x${height})`)
          } else {
            resolve(null) // Valid
          }
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(`File "${file.name}" could not be loaded as an image`)
      }

      img.src = url
    })
  }

  const handleViewBanner = (banner: Banner) => {
    setSelectedBanner(banner)
    setShowViewDialog(true)
  }
  const getImageUrl = (imagePath: string) => {
    // If the path already includes the base URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath
    }
    // Otherwise, prepend the base URL
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''
    return `${baseUrl}/${imagePath}`  }

  // CRUD Functions
  const handleCreateBanner = async () => {
    if (!formData.eventId || formData.eventId === "loading" || formData.eventId === "no-events" || !formData.desktopImage || !formData.mobileImage) {
      toast({
        title: "Error",
        description: "Please fill all required fields and upload both images",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const formDataToSend = new FormData()
      formDataToSend.append("Event_id", formData.eventId)
      formDataToSend.append("DesktopbannerImage", formData.desktopImage)
      formDataToSend.append("MobilebannerImage", formData.mobileImage)

      const response = await fetch(bannerEndpoint.CREATE_BANNER, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      })

      const result = await response.json()

      if (response.ok && !result.error) {
        toast({
          title: "Success",
          description: "Banner created successfully",
        })
        setShowCreateDialog(false)
        resetForm()
        await fetchBanners()
      } else {
        throw new Error(result.message || "Failed to create banner")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create banner",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }
  const handleEditBanner = async () => {
    if (!selectedBanner || !formData.eventId || formData.eventId === "loading" || formData.eventId === "no-events") {
      toast({
        title: "Error",
        description: "Please select an event",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const formDataToSend = new FormData()
      formDataToSend.append("BannerSlider_id", selectedBanner._id)
      formDataToSend.append("Event_id", formData.eventId)
      
      if (formData.desktopImage) {
        formDataToSend.append("DesktopbannerImage", formData.desktopImage)
      }
      if (formData.mobileImage) {
        formDataToSend.append("MobilebannerImage", formData.mobileImage)
      }

      const response = await fetch(bannerEndpoint.UPDATE_BANNER, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      })

      const result = await response.json()

      if (response.ok && !result.error) {
        toast({
          title: "Success",
          description: "Banner updated successfully",
        })
        setShowEditDialog(false)
        resetForm()
        await fetchBanners()
      } else {
        throw new Error(result.message || "Failed to update banner")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update banner",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBanner = async () => {
    if (!selectedBanner) return

    setSubmitting(true)
    try {
      const token = getValidToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(bannerEndpoint.DELETE_BANNER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          BannerSlider_id: selectedBanner._id,
        }),
      })

      const result = await response.json()

      if (response.ok && !result.error) {
        toast({
          title: "Success",
          description: "Banner deleted successfully",
        })
        setShowDeleteDialog(false)
        resetForm()
        await fetchBanners()
      } else {
        throw new Error(result.message || "Failed to delete banner")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete banner",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openCreateDialog = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  const openEditDialog = (banner: Banner) => {
    setSelectedBanner(banner)
    setFormData({
      eventId: banner.Event_id,
      desktopImage: null,
      mobileImage: null,
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (banner: Banner) => {
    setSelectedBanner(banner)
    setShowDeleteDialog(true)
  }

  const resetForm = () => {
    setFormData({
      eventId: "",
      desktopImage: null,
      mobileImage: null,
    })
    setSelectedBanner(null)
    setImageValidationErrors([])
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Banners</h1>
          <p className="text-muted-foreground">Manage homepage banner slider images</p>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="outline" onClick={fetchBanners} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>      */}
               <Button onClick={openCreateDialog}
                             className="px-4 py-2 text-sm rounded-full md:px-6 md:py-2 md:text-base"
>
            <Plus className="mr-2 h-4 w-4" />
            Add 
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search banners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Banner Slider 
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredBanners.length} total)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Homepage banner slider management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading banners...</span>
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No banners found matching your search' : 'No banners found'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Desktop Image</TableHead>
                  <TableHead>Mobile Image</TableHead>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBanners.map((banner) => (
                  <TableRow key={banner._id}>
                    <TableCell>
                      <div className="relative w-20 h-12 rounded overflow-hidden">
                        <Image
                          src={getImageUrl(banner.DesktopbannerImage)}
                          alt="Desktop banner"
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg"
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative w-20 h-12 rounded overflow-hidden">
                        <Image
                          src={getImageUrl(banner.MobilebannerImage)}
                          alt="Mobile banner"
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg"
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {banner.Event_id}
                    </TableCell>
                    <TableCell>{formatDate(banner.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[banner.status as keyof typeof statusColors]}>
                        {statusLabels[banner.status as keyof typeof statusLabels] || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewBanner(banner)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditDialog(banner)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openDeleteDialog(banner)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Loading Banners
            </DialogTitle>
            <DialogDescription className="pt-2">
              {apiError}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowErrorDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowErrorDialog(false)
              fetchBanners()
            }}>
              Retry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Banner Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Banner Details</DialogTitle>
            <DialogDescription>
              View banner images and details
            </DialogDescription>
          </DialogHeader>
          {selectedBanner && (
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Desktop Banner</h4>
                  <div className="relative w-full h-48 rounded border overflow-hidden">
                    <Image
                      src={getImageUrl(selectedBanner.DesktopbannerImage)}
                      alt="Desktop banner"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Mobile Banner</h4>
                  <div className="relative w-full h-48 rounded border overflow-hidden">
                    <Image
                      src={getImageUrl(selectedBanner.MobilebannerImage)}
                      alt="Mobile banner"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Event ID:</strong> {selectedBanner.Event_id}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <Badge className={statusColors[selectedBanner.status as keyof typeof statusColors]}>
                    {statusLabels[selectedBanner.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <div>
                  <strong>Created:</strong> {formatDate(selectedBanner.createdAt)}
                </div>
                <div>
                  <strong>Last Updated:</strong> {formatDate(selectedBanner.FilterationDateTime)}
                </div>
              </div>
            </div>
          )}          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>      {/* Create Banner Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Banner</DialogTitle>
            <DialogDescription>
              Add a new banner to the homepage slider
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">            <div className="grid gap-2">              <Label htmlFor="eventId">Event *</Label>
              <Select 
                value={formData.eventId} 
                onValueChange={(value) => {
                  // Don't allow selection of dummy disabled values
                  if (value !== "loading" && value !== "no-events") {
                    setFormData(prev => ({ ...prev, eventId: value }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {loadingEvents ? (
                    <SelectItem value="loading" disabled>Loading events...</SelectItem>
                  ) : events.length === 0 ? (
                    <SelectItem value="no-events" disabled>No events available</SelectItem>
                  ) : (
                    events.map((event) => (
                      <SelectItem key={event._id} value={event._id}>
                        {event.EventName || `Event ${event._id}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desktopImage">Desktop Banner Image *</Label>
              <p className="text-xs text-muted-foreground">
                Required: JPG, PNG, or SVG • Max 2MB • Dimensions: 2000x500 pixels
              </p>
              <Input
                id="desktopImage"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                onChange={async (e) => {
                  const file = e.target.files?.[0] || null
                  if (file) {
                    setImageValidationErrors([])
                    const error = await validateImageFile(file, 'desktop')
                    if (error) {
                      setImageValidationErrors([error])
                      setFormData(prev => ({ ...prev, desktopImage: null }))
                    } else {
                      setFormData(prev => ({ ...prev, desktopImage: file }))
                    }
                  } else {
                    setFormData(prev => ({ ...prev, desktopImage: null }))
                  }
                }}
              />
              {formData.desktopImage && (
                <p className="text-sm text-green-600">
                  ✓ Selected: {formData.desktopImage.name}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobileImage">Mobile Banner Image *</Label>
              <p className="text-xs text-muted-foreground">
                Required: JPG, PNG, or SVG • Max 2MB • Dimensions: 1920x1080 pixels
              </p>
              <Input
                id="mobileImage"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                onChange={async (e) => {
                  const file = e.target.files?.[0] || null
                  if (file) {
                    setImageValidationErrors([])
                    const error = await validateImageFile(file, 'mobile')
                    if (error) {
                      setImageValidationErrors([error])
                      setFormData(prev => ({ ...prev, mobileImage: null }))
                    } else {
                      setFormData(prev => ({ ...prev, mobileImage: file }))
                    }
                  } else {
                    setFormData(prev => ({ ...prev, mobileImage: null }))
                  }
                }}
              />
              {formData.mobileImage && (
                <p className="text-sm text-green-600">
                  ✓ Selected: {formData.mobileImage.name}
                </p>
              )}
            </div>
            {imageValidationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {imageValidationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>            <Button 
              onClick={handleCreateBanner}
              disabled={submitting || !formData.eventId || formData.eventId === "loading" || formData.eventId === "no-events" || !formData.desktopImage || !formData.mobileImage}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Banner"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      {/* Edit Banner Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Banner</DialogTitle>
            <DialogDescription>
              Update banner details and images
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">            <div className="grid gap-2">              <Label htmlFor="editEventId">Event *</Label>
              <Select 
                value={formData.eventId} 
                onValueChange={(value) => {
                  // Don't allow selection of dummy disabled values
                  if (value !== "loading" && value !== "no-events") {
                    setFormData(prev => ({ ...prev, eventId: value }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {loadingEvents ? (
                    <SelectItem value="loading" disabled>Loading events...</SelectItem>
                  ) : events.length === 0 ? (
                    <SelectItem value="no-events" disabled>No events available</SelectItem>
                  ) : (
                    events.map((event) => (
                      <SelectItem key={event._id} value={event._id}>
                        {event.EventName || `Event ${event._id}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDesktopImage">Desktop Banner Image</Label>
              <Input
                id="editDesktopImage"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setFormData(prev => ({ ...prev, desktopImage: file }))
                }}
              />
              {formData.desktopImage ? (
                <p className="text-sm text-muted-foreground">
                  New file: {formData.desktopImage.name}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Leave empty to keep current image
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editMobileImage">Mobile Banner Image</Label>
              <Input
                id="editMobileImage"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setFormData(prev => ({ ...prev, mobileImage: file }))
                }}
              />
              {formData.mobileImage ? (
                <p className="text-sm text-muted-foreground">
                  New file: {formData.mobileImage.name}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Leave empty to keep current image
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>            <Button 
              onClick={handleEditBanner}
              disabled={submitting || !formData.eventId || formData.eventId === "loading" || formData.eventId === "no-events"}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Banner"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      {/* Delete Banner Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Banner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this banner? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBanner && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="relative w-16 h-10 rounded overflow-hidden">
                  <Image
                    src={getImageUrl(selectedBanner.DesktopbannerImage)}
                    alt="Banner preview"
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg"
                    }}
                  />
                </div>
                <div>
                  <p className="font-medium">Event ID: {selectedBanner.Event_id}</p>
                  <p className="text-sm text-muted-foreground">
                    Created: {formatDate(selectedBanner.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteBanner}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Banner"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
