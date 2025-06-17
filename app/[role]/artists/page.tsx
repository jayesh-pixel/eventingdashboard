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
import { 
  MoreHorizontal, 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  ImagePlus,
  X,
  User,
  Mail,
  Phone,
  FileText
} from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { artistEndpoints } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"

interface ArtistsPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface Artist {
  _id: string
  Name: string
  Email?: string
  PhoneNo?: string
  Description?: string
  Images?: ArtistImage[]
  createdAt: string
  status?: number
}

interface ArtistImage {
  _id: string
  image_path: string
  createdAt: string
}

interface ApiResponse {
  error: boolean
  message: string
  data: Artist[] | Artist
}

const ITEMS_PER_PAGE = 10
const MAX_FILE_SIZE = 500 * 1024 // 500KB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const REQUIRED_DIMENSIONS = { width: 640, height: 480 }

export default function ArtistsPage({ params }: ArtistsPageProps) {
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
  const [artists, setArtists] = React.useState<Artist[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("")

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [deleteArtistId, setDeleteArtistId] = React.useState<string | null>(null)
  const [selectedArtist, setSelectedArtist] = React.useState<Artist | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phoneNo: "",
    description: "",
  })
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  // Image upload state
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string>("")
  const [uploadingImage, setUploadingImage] = React.useState(false)

  // Validation function
  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = "Artist name is required"
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }
    
    if (formData.phoneNo && !/^\d{10,}$/.test(formData.phoneNo.replace(/\D/g, ''))) {
      errors.phoneNo = "Please enter a valid phone number"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Image validation function
  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a JPEG or PNG image.",
          variant: "destructive",
        })
        resolve(false)
        return
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: "Image size should be less than 500KB.",
          variant: "destructive",
        })
        resolve(false)
        return
      }

      // Check dimensions
      const img = new Image()
      img.onload = () => {
        if (img.width !== REQUIRED_DIMENSIONS.width || img.height !== REQUIRED_DIMENSIONS.height) {
          toast({
            title: "Invalid Dimensions",
            description: `Image dimensions must be ${REQUIRED_DIMENSIONS.width}x${REQUIRED_DIMENSIONS.height}.`,
            variant: "destructive",
          })
          resolve(false)
        } else {
          resolve(true)
        }
      }
      img.onerror = () => {
        toast({
          title: "Invalid Image",
          description: "Unable to load the selected image.",
          variant: "destructive",
        })
        resolve(false)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  // API Functions
  const fetchArtists = React.useCallback(async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view artists.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(artistEndpoints.ALL_ARTIST_LIST, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      
      if (data.error) {
        throw new Error(data.message || "Failed to fetch artists")
      }

      const artistsArray = Array.isArray(data.data) ? data.data : [data.data]
      setArtists(artistsArray)
      setTotalPages(Math.ceil(artistsArray.length / ITEMS_PER_PAGE))

    } catch (error) {
      console.error("Failed to fetch artists:", error)
      toast({
        title: "Error",
        description: "Failed to fetch artists. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])
  const createArtist = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      const authToken = getValidToken()      // Create FormData for multipart/form-data request
      const formDataToSend = new FormData()
      formDataToSend.append("Name", formData.name)
      if (formData.email) formDataToSend.append("Email", formData.email)
      if (formData.phoneNo) formDataToSend.append("PhoneNo", formData.phoneNo)
      if (formData.description) formDataToSend.append("Description", formData.description)
      
      // Add priority if needed (you can adjust this based on requirements)
      formDataToSend.append("Priority", "1")

      // Add image if selected
      if (selectedImage) {
        const isValid = await validateImage(selectedImage)
        if (!isValid) {
          setLoading(false)
          return
        }
        formDataToSend.append("Images", selectedImage)
      }

      const response = await fetch(artistEndpoints.ARTIST_CREATE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formDataToSend,
      })

      const data: ApiResponse = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to create artist")
      }

      toast({
        title: "Success",
        description: "Artist created successfully!",
      })

      setIsCreateDialogOpen(false)
      resetForm()
      fetchArtists()

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create artist.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateArtist = async () => {
    if (!validateForm() || !selectedArtist) return

    try {
      setLoading(true)
      const authToken = getValidToken()

      const response = await fetch(artistEndpoints.ARTIST_DATA_UPDATED, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          artist_id: selectedArtist._id,
          Name: formData.name,
          Email: formData.email,
          PhoneNo: formData.phoneNo,
          Description: formData.description,
        }),
      })

      const data: ApiResponse = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to update artist")
      }

      toast({
        title: "Success",
        description: "Artist updated successfully!",
      })

      setIsEditDialogOpen(false)
      resetForm()
      fetchArtists()

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update artist.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const uploadArtistImage = async (artistId: string) => {
    if (!selectedImage) {
      toast({
        title: "Error",
        description: "Please select an image to upload.",
        variant: "destructive",
      })
      return
    }

    try {
      setUploadingImage(true)
      const authToken = getValidToken()

      // Validate image before upload
      const isValid = await validateImage(selectedImage)
      if (!isValid) {
        return
      }

      // Create FormData for multipart/form-data request
      const formDataToSend = new FormData()
      formDataToSend.append("artist_id", artistId)
      formDataToSend.append("ArtistImage", selectedImage)

      const response = await fetch(artistEndpoints.ARTIST_UPLOAD_IMAGE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formDataToSend,
      })

      const data: ApiResponse = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to upload image")
      }

      toast({
        title: "Success",
        description: "Artist image uploaded successfully!",
      })

      // Clear the selected image and preview
      setSelectedImage(null)
      setImagePreview("")
      
      // Refresh the artists list to get updated images
      fetchArtists()

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const deleteArtist = async (artistId: string) => {
    try {
      setLoading(true)
      const authToken = getValidToken()

      const response = await fetch(artistEndpoints.ARTIST_DELETE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          artist_id: artistId,
        }),
      })

      const data: ApiResponse = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to delete artist")
      }

      toast({
        title: "Success",
        description: "Artist deleted successfully!",
      })

      fetchArtists()

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete artist.",
        variant: "destructive",
      })    } finally {
      setLoading(false)
    }
  }

  const removeArtistImage = async (artistId: string, imageId: string) => {
    try {
      const authToken = getValidToken()

      const response = await fetch(artistEndpoints.ARTIST_IMAGE_REMOVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          artist_id: artistId,
          image_id: imageId,
        }),
      })

      const data: ApiResponse = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to remove image")
      }

      toast({
        title: "Success",
        description: "Artist image removed successfully!",
      })

      fetchArtists()

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove image.",
        variant: "destructive",
      })
    }
  }

  // Event handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phoneNo: "",
      description: "",
    })
    setFormErrors({})
    setSelectedImage(null)
    setImagePreview("")
    setSelectedArtist(null)
  }

  const openEditDialog = (artist: Artist) => {
    setSelectedArtist(artist)
    setFormData({
      name: artist.Name || "",
      email: artist.Email || "",
      phoneNo: artist.PhoneNo || "",
      description: artist.Description || "",
    })
    setIsEditDialogOpen(true)
  }

  // Search with debounce
  React.useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(delay)
  }, [searchTerm])

  // Computed values
  const filteredArtists = React.useMemo(() => {
    if (!debouncedSearchTerm) return artists
    
    return artists.filter((artist) =>
      artist.Name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      artist.Email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [artists, debouncedSearchTerm])

  const paginatedArtists = React.useMemo(() => {
    return filteredArtists.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    )
  }, [filteredArtists, currentPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Initial data fetch
  React.useEffect(() => {
    if (role === "superadmin") {
      fetchArtists()
    }
  }, [role, fetchArtists])

  // Role-based access control
  if (role !== "superadmin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. This page is only available to Super Admins.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Artists Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Artist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Artist</DialogTitle>
              <DialogDescription>Add a new artist to the system.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Artist Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter artist name"
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNo">Phone Number</Label>
                <Input
                  id="phoneNo"
                  value={formData.phoneNo}
                  onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                  placeholder="Enter phone number"
                />
                {formErrors.phoneNo && (
                  <p className="text-sm text-red-600">{formErrors.phoneNo}</p>
                )}
              </div>              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter artist description"
                  rows={3}
                />
              </div>
              
              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="artistImage">Artist Image</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="artistImage"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {imagePreview ? (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-20 w-20 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={(e) => {
                                e.preventDefault()
                                setSelectedImage(null)
                                setImagePreview("")
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <ImagePlus className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG (640x480, max 500KB)</p>
                          </>
                        )}
                      </div>
                      <input
                        id="artistImage"
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  {selectedImage && (
                    <p className="text-sm text-green-600">
                      Selected: {selectedImage.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createArtist} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Artist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search artists by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Artists List */}
      <Card>
        <CardHeader>
          <CardTitle>Artists ({filteredArtists.length})</CardTitle>
          <CardDescription>
            Manage your artists and their information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading artists...</span>
            </div>
          ) : filteredArtists.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No artists found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "No artists match your search." : "Get started by creating your first artist."}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artist</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedArtists.map((artist) => (
                    <TableRow key={artist._id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {/* Artist Image */}
                          <div className="flex-shrink-0">
                            {artist.Images && artist.Images.length > 0 ? (
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/${artist.Images[0].image_path}`}
                                alt={artist.Name}
                                className="h-10 w-10 rounded-full object-cover border"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder-user.jpg';
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          {/* Artist Name */}
                          <div>
                            <div className="font-medium text-gray-900">{artist.Name}</div>
                            {artist.status && (
                              <Badge variant={artist.status === 1 ? "default" : "secondary"} className="text-xs">
                                {artist.status === 1 ? "Active" : "Inactive"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {artist.Email && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Mail className="mr-1 h-3 w-3" />
                              {artist.Email}
                            </div>
                          )}
                          {artist.PhoneNo && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Phone className="mr-1 h-3 w-3" />
                              {artist.PhoneNo}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {artist.Description ? (
                            <div className="flex items-start">
                              <FileText className="mr-1 h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm text-muted-foreground line-clamp-2">
                                {artist.Description}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">No description</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {artist.Images && artist.Images.length > 0 ? (
                            <>
                              <div className="flex -space-x-2">
                                {artist.Images.slice(0, 3).map((image, index) => (
                                  <img
                                    key={image._id}
                                    src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/${image.image_path}`}
                                    alt={`${artist.Name} image ${index + 1}`}
                                    className="h-8 w-8 rounded-full object-cover border-2 border-white"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                ))}
                              </div>
                              {artist.Images.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{artist.Images.length - 3}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">No images</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(artist.createdAt).toLocaleDateString()}
                        </div>
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
                            <DropdownMenuItem onClick={() => openEditDialog(artist)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteArtistId(artist._id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNumber = i + 1;
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => handlePageChange(pageNumber)}
                              isActive={currentPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Artist</DialogTitle>
            <DialogDescription>Update the artist information and manage images.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Artist Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Artist Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Artist Name *</Label>
                  <Input
                    id="editName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter artist name"
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhoneNo">Phone Number</Label>
                  <Input
                    id="editPhoneNo"
                    value={formData.phoneNo}
                    onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                    placeholder="Enter phone number"
                  />
                  {formErrors.phoneNo && (
                    <p className="text-sm text-red-600">{formErrors.phoneNo}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDescription">Description</Label>
                  <Textarea
                    id="editDescription"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter artist description"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Image Management */}
            <div className="space-y-4">
              <h3 className="font-medium">Image Management</h3>
              
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Upload New Image</Label>
                <p className="text-sm text-muted-foreground">
                  Dimensions: 640x480, Max size: 500KB, Format: JPG/PNG
                </p>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <div className="flex flex-col items-center gap-2">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-32 h-24 object-cover rounded"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => {
                            setSelectedImage(null)
                            setImagePreview("")
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    )}
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleImageChange}
                      className="max-w-48"
                    />
                    {selectedImage && selectedArtist && (
                      <Button
                        size="sm"
                        onClick={() => uploadArtistImage(selectedArtist._id)}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Upload Image
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Images */}
              {selectedArtist?.Images && selectedArtist.Images.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Images</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {selectedArtist.Images.map((image) => (
                      <div key={image._id} className="relative group">
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/${image.image_path}`}
                          alt="Artist"
                          className="w-full h-20 object-cover rounded"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeArtistImage(selectedArtist._id, image._id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateArtist} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Artist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteArtistId} onOpenChange={() => setDeleteArtistId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the artist and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteArtistId) {
                  deleteArtist(deleteArtistId)
                }
                setDeleteArtistId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
