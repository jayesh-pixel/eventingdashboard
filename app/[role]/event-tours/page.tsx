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
import { MoreHorizontal, PlusCircle, Search, Edit, Trash2, Image as ImageIcon, Calendar, Loader2, Upload, X } from "lucide-react"
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
import { eventTourEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { formatDate } from "@/lib/utils"
import type { EventTour } from "@/lib/types"
import Image from "next/image"

interface EventToursPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface ApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalEventTours: number
    EventToursData?: EventTour[]
  }
}

const ITEMS_PER_PAGE = 10

export default function EventToursPage({ params }: EventToursPageProps) {
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
  const [eventTours, setEventTours] = React.useState<EventTour[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalEventTours, setTotalEventTours] = React.useState(0)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedTour, setSelectedTour] = React.useState<EventTour | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    tourName: "",
    tourDescription: "",
    imageFiles: [] as File[],
  })

  // API function to fetch event tours
  const fetchEventTours = React.useCallback(async (page: number = 1, limit: number = ITEMS_PER_PAGE) => {
    try {
      setLoading(true)

      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      console.log("Fetching event tours with pagination:")
      console.log("- Page:", page)
      console.log("- Limit:", limit)

      const response = await fetch(eventTourEndPoint.EVENT_TOURS_PAGINATED_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          page: page,
          limit: limit.toString(),
        }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      console.log("Event Tours API response:", data)

      if (data.error) {
        throw new Error(data.message || "Failed to fetch event tours")
      }

      // Set the data from API
      setEventTours(data.data.EventToursData || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalEventTours(data.data.totalEventTours || 0)
      setCurrentPage(data.data.currentPage || 1)

      console.log("State updated with:", {
        eventTours: data.data.EventToursData?.length || 0,
        totalPages: data.data.totalPages,
        totalEventTours: data.data.totalEventTours
      })

    } catch (error) {
      console.error("Event tours fetch failed:", error)
      
      toast({
        title: "Error",
        description: "Failed to fetch event tours. Please try again.",
        variant: "destructive",
      })

      // Reset state on error
      setEventTours([])
      setTotalPages(1)
      setTotalEventTours(0)
      setCurrentPage(1)
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  // Initial data fetch
  React.useEffect(() => {
    fetchEventTours(currentPage)
  }, [currentPage, fetchEventTours])

  // Filter tours based on search (now works on current page data)
  const filteredTours = React.useMemo(() => {
    if (!searchTerm) return eventTours
    return eventTours.filter(
      (tour) =>
        (tour.Name && tour.Name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tour.Description && tour.Description.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [eventTours, searchTerm])

  const currentTours = filteredTours

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleCreateTour = async () => {
    if (!formData.tourName.trim()) {
      toast({
        title: "Error",
        description: "Tour name is required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to create event tours.",
          variant: "destructive",
        })
        return
      }

      // Create FormData for multipart/form-data request
      const formDataToSend = new FormData()
      formDataToSend.append("Name", formData.tourName)
      if (formData.tourDescription) {
        formDataToSend.append("Description", formData.tourDescription)
      }
      
      // Add images if selected
      formData.imageFiles.forEach((file) => {
        formDataToSend.append("EventTourImages", file)
      })

      const response = await fetch(eventTourEndPoint.EVENT_TOUR_CREATION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formDataToSend,
      })

      const data = await response.json()

      if (data.error || !response.ok) {
        throw new Error(data.message || "Failed to create event tour")
      }

      toast({
        title: "Success",
        description: "Event tour created successfully!",
      })

      setIsCreateDialogOpen(false)
      resetForm()
      
      // Refresh the event tours list
      fetchEventTours(currentPage)

    } catch (error: any) {
      console.error("Event tour creation failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create event tour. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditTour = async () => {
    if (!selectedTour || !formData.tourName.trim()) {
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
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to update event tours.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(eventTourEndPoint.EVENT_TOUR_DATA_UPDATED, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          eventTour_id: selectedTour._id,
          Name: formData.tourName,
          Description: formData.tourDescription,
        }),
      })

      const data = await response.json()

      if (data.error || !response.ok) {
        throw new Error(data.message || "Failed to update event tour")
      }

      toast({
        title: "Success",
        description: "Event tour updated successfully",
      })

      setIsEditDialogOpen(false)
      setSelectedTour(null)
      resetForm()
      
      // Refresh the event tours list
      fetchEventTours(currentPage)

    } catch (error: any) {
      console.error("Event tour update failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update event tour. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTour = async (tourId: string) => {
    setLoading(true)
    try {
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to delete event tours.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(eventTourEndPoint.EVENT_TOUR_DELETE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          eventTour_id: tourId,
        }),
      })

      const data = await response.json()

      if (data.error || !response.ok) {
        throw new Error(data.message || "Failed to delete event tour")
      }

      toast({
        title: "Success",
        description: "Event tour deleted successfully",
      })

      // Refresh the event tours list
      fetchEventTours(currentPage)

    } catch (error: any) {
      console.error("Event tour deletion failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete event tour. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTourImage = async (tourId: string, imageId: string) => {
    setLoading(true)
    try {
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to delete images.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(eventTourEndPoint.EVENT_TOUR_IMAGE_REMOVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          eventTour_id: tourId,
          image_id: imageId,
        }),
      })

      const data = await response.json()

      if (data.error || !response.ok) {
        throw new Error(data.message || "Failed to delete image")
      }

      toast({
        title: "Success",
        description: "Image deleted successfully",
      })

      // Refresh the event tours list
      fetchEventTours(currentPage)

    } catch (error: any) {
      console.error("Image deletion failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadTourImage = async (tourId: string, imageFile: File) => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to upload images.",
          variant: "destructive",
        })
        return
      }

      console.log("Uploading image:", imageFile.name, "for tour:", tourId)

      const formDataToSend = new FormData()
      formDataToSend.append("eventTour_id", tourId)
      formDataToSend.append("EventTourImage", imageFile)

      console.log("FormData contents:", {
        eventTour_id: tourId,
        EventTourImage: imageFile.name
      })

      const response = await fetch(eventTourEndPoint.EVENT_TOUR_UPLOAD_IMAGE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formDataToSend,
      })

      console.log("Upload response status:", response.status)
      const data = await response.json()
      console.log("Upload response data:", data)

      if (data.error || !response.ok) {
        throw new Error(data.message || "Failed to upload image")
      }

      toast({
        title: "Success",
        description: `Image "${imageFile.name}" uploaded successfully!`,
      })

      // Refresh the event tours list to get updated images
      fetchEventTours(currentPage)

    } catch (error: any) {
      console.error("Image upload failed:", error)
      toast({
        title: "Error",
        description: error.message || `Failed to upload image "${imageFile.name}". Please try again.`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEnableDisableTour = async (tourId: string, enable: boolean) => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to modify event tours.",
          variant: "destructive",
        })
        return
      }

      const endpoint = enable ? eventTourEndPoint.EVENT_TOUR_ENABLE : eventTourEndPoint.EVENT_TOUR_DISABLE
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          eventTourId: tourId,
        }),
      })

      const data = await response.json()

      if (data.error || !response.ok) {
        throw new Error(data.message || `Failed to ${enable ? 'enable' : 'disable'} event tour`)
      }

      toast({
        title: "Success",
        description: `Event tour ${enable ? 'enabled' : 'disabled'} successfully!`,
      })

      // Refresh the event tours list
      fetchEventTours(currentPage)

    } catch (error: any) {
      console.error(`Event tour ${enable ? 'enable' : 'disable'} failed:`, error)
      toast({
        title: "Error",
        description: error.message || `Failed to ${enable ? 'enable' : 'disable'} event tour. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (tour: EventTour) => {
    setSelectedTour(tour)
    setFormData({
      tourName: tour.Name || "",
      tourDescription: tour.Description || "",
      imageFiles: [],
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      tourName: "",
      tourDescription: "",
      imageFiles: [],
    })
    setSelectedTour(null)
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, imageFiles: Array.from(e.target.files) })
    }
  }

  const validateImageFile = (file: File): Promise<{ isValid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      // Check file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        resolve({ isValid: false, error: 'Only PNG or JPG files are allowed' })
        return
      }

      // Check file size (500KB = 500 * 1024 bytes)
      const maxSize = 500 * 1024
      if (file.size > maxSize) {
        resolve({ isValid: false, error: 'File size must be less than 500KB' })
        return
      }

      // Check dimensions
      const img = new window.Image()
      img.onload = () => {
        const { width, height } = img
        if (width !== 640 || height !== 480) {
          resolve({ isValid: false, error: 'Image dimensions must be 640x480 pixels' })
        } else {
          resolve({ isValid: true })
        }
      }
      img.onerror = () => {
        resolve({ isValid: false, error: 'Invalid image file' })
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageFileChangeWithValidation = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    const validFiles: File[] = []

    for (const file of files) {
      const validation = await validateImageFile(file)
      if (validation.isValid) {
        validFiles.push(file)
      } else {
        toast({
          title: "Invalid Image",
          description: `${file.name}: ${validation.error}`,
          variant: "destructive",
        })
      }
    }

    setFormData({ ...formData, imageFiles: validFiles })

    // Clear the input if no valid files
    if (validFiles.length === 0) {
      e.target.value = ''
    }
  }

  const removeImageFile = (index: number) => {
    const newFiles = formData.imageFiles.filter((_, i) => i !== index)
    setFormData({ ...formData, imageFiles: newFiles })
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
        <h1 className="text-2xl font-semibold">Event Tours Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}
                          className="px-4 py-2 text-sm rounded-full md:px-6 md:py-2 md:text-base"
>
              <PlusCircle className="mr-2 h-4 w-4" /> Add             </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Event Tour</DialogTitle>
              <DialogDescription>Add a new event tour to the system.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tourName">Tour Name *</Label>
                <Input
                  id="tourName"
                  value={formData.tourName}
                  onChange={(e) => setFormData({ ...formData, tourName: e.target.value })}
                  placeholder="Enter tour name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tourDescription">Description</Label>
                <Textarea
                  id="tourDescription"
                  value={formData.tourDescription}
                  onChange={(e) => setFormData({ ...formData, tourDescription: e.target.value })}
                  placeholder="Enter tour description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageFiles">Images</Label>
                <Input
                  id="imageFiles"
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageFileChangeWithValidation}
                  className="bg-background/50 dark:bg-muted/10 border-border/40"
                />
                <p className="text-sm text-muted-foreground">
                  Only PNG or JPG files. 500 KB max size. Dimensions: 640x480 pixels.
                </p>
                {formData.imageFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Selected files:</p>
                    <div className="space-y-1">
                      {formData.imageFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeImageFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTour} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Tour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tours..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tours Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Event Tours</CardTitle>
          <CardDescription>Manage event tours and their details.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && currentTours.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading event tours...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Tour Name</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
      
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTours.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No event tours found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentTours.map((tour) => (
                    <TableRow key={tour._id}>
                      <TableCell>
                        {tour.Images && tour.Images.length > 0 ? (
                          <div className="relative w-12 h-12">
                            <Image
                              src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/${tour.Images[0].image_path}`}
                              alt={tour.Name || "Tour image"}
                              fill
                              className="object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.jpg';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{tour.Name || "Untitled Tour"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="max-w-xs truncate">
                          {tour.Description || "No description"}
                        </div>
                      </TableCell>
       
               
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditDialog(tour)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {tour.status === 1 ? (
                              <DropdownMenuItem 
                                onClick={() => handleEnableDisableTour(tour._id, false)}
                                className="text-orange-600"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Disable
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleEnableDisableTour(tour._id, true)}
                                className="text-green-600"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Enable
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteTour(tour._id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === pageNum}
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(pageNum)
                        }}
                      >
                        {pageNum}
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Event Tour</DialogTitle>
            <DialogDescription>Update the event tour information and manage images.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editTourName">Tour Name *</Label>
              <Input
                id="editTourName"
                value={formData.tourName}
                onChange={(e) => setFormData({ ...formData, tourName: e.target.value })}
                placeholder="Enter tour name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTourDescription">Description</Label>
              <Textarea
                id="editTourDescription"
                value={formData.tourDescription}
                onChange={(e) => setFormData({ ...formData, tourDescription: e.target.value })}
                placeholder="Enter tour description"
                rows={3}
              />
            </div>
            
            {/* Current Images */}
            {selectedTour && selectedTour.Images && selectedTour.Images.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedTour.Images.map((image) => (
                    <div key={image._id} className="relative group">
                      <div className="relative w-full h-24">
                        <Image
                          src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/${image.image_path}`}
                          alt="Tour image"
                          fill
                          className="object-cover rounded border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.jpg';
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteTourImage(selectedTour._id, image._id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Images */}
            <div className="space-y-2">
              <Label htmlFor="editImageFiles">Add New Images</Label>
              <Input
                id="editImageFiles"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleImageFileChangeWithValidation}
                className="bg-background/50 dark:bg-muted/10 border-border/40"
              />
              <p className="text-sm text-muted-foreground">
                Only PNG or JPG files. 500 KB max size. Dimensions: 640x480 pixels.
              </p>
              {formData.imageFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">New files to upload:</p>
                  <div className="space-y-1">
                    {formData.imageFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImageFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (selectedTour && formData.imageFiles.length > 0) {
                        for (const file of formData.imageFiles) {
                          await handleUploadTourImage(selectedTour._id, file)
                        }
                        // Clear the file list after successful uploads
                        setFormData({ ...formData, imageFiles: [] })
                        // Clear the file input
                        const fileInput = document.getElementById('editImageFiles') as HTMLInputElement
                        if (fileInput) fileInput.value = ''
                      }
                    }}
                    disabled={loading || formData.imageFiles.length === 0}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload Selected Images ({formData.imageFiles.length})
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTour} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Tour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
