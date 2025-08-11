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
import { MoreHorizontal, PlusCircle, Search, Edit, Trash2, Upload, Loader2 } from "lucide-react"
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
import { genreEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"

interface GenresPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface Genre {
  _id: string
  Name: string
  Description: string | null
  Images: Array<{
    image_path: string
    _id: string
  }>
  FilterationDateTime: string
  createdAt: string
  status: number
  __v?: number
}

interface ApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalGenres: number
    GenreData: Genre[]
  }
}

const mockGenres: Genre[] = [
  {
    _id: "gen001",
    Name: "Rock",
    Description: "Rock music events and concerts",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=Rock", _id: "img001" }],
    FilterationDateTime: "2025-01-03T08:30:00.000Z",
    createdAt: "03-01-2025 08:30:00",
    status: 1,
    __v: 0,
  },
  {
    _id: "gen002",
    Name: "Electronic Dance Music",
    Description: "Electronic dance music events and festivals",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=EDM", _id: "img002" }],
    FilterationDateTime: "2025-01-25T10:15:00.000Z",
    createdAt: "25-01-2025 10:15:00",
    status: 1,
    __v: 0,
  },
  {
    _id: "gen003",
    Name: "Jazz",
    Description: "Jazz music performances and festivals",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=Jazz", _id: "img003" }],
    FilterationDateTime: "2025-02-15T09:45:00.000Z",
    createdAt: "15-02-2025 09:45:00",
    status: 1,
    __v: 0,
  },
  {
    _id: "gen004",
    Name: "Classical",
    Description: "Classical music concerts and orchestral performances",
    Images: [],
    FilterationDateTime: "2025-03-05T12:00:00.000Z",
    createdAt: "05-03-2025 12:00:00",
    status: 0,
    __v: 0,
  },
  {
    _id: "gen005",
    Name: "Hip Hop",
    Description: "Hip hop concerts and rap battles",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=HipHop", _id: "img005" }],
    FilterationDateTime: "2025-03-20T14:30:00.000Z",
    createdAt: "20-03-2025 14:30:00",
    status: 1,
    __v: 0,
  },
]

const ITEMS_PER_PAGE = 10

export default function GenresPage({ params }: GenresPageProps) {
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
  const [genres, setGenres] = React.useState<Genre[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalGenres, setTotalGenres] = React.useState(0)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedGenre, setSelectedGenre] = React.useState<Genre | null>(null)
  const [useMockData, setUseMockData] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    genreName: "",
    genreDescription: "",
    genreImage: null as File | null,
  })

  // Edit form state
  const [editFormData, setEditFormData] = React.useState<{
    genreId: string
    genreName: string
    genreDescription: string
    genreImages: Array<{ image_path: string; _id: string }>
  }>({
    genreId: "",
    genreName: "",
    genreDescription: "",
    genreImages: []
  })

  // Image upload state
  const [selectedImages, setSelectedImages] = React.useState<File[]>([])
  const [uploadingImages, setUploadingImages] = React.useState(false)

  // API function to fetch genres
  const fetchGenres = React.useCallback(async (page: number = 1, limit: number = ITEMS_PER_PAGE) => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = getValidToken()
      if (!user || !authToken) {
        console.warn("No user or auth token available, using mock data")
        setGenres(mockGenres)
        setUseMockData(true)
        setTotalPages(1)
        setTotalGenres(mockGenres.length)
        return
      }

      console.log("Fetching genres with pagination:")
      console.log("- Page:", page)
      console.log("- Limit:", limit)

      const response = await fetch(genreEndPoint.GENRE_PAGINATED_URL, {
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
      console.log("Genres API response:", data)

      if (data.error) {
        throw new Error(data.message || "Failed to fetch genres")
      }

      // Set the data from API
      setGenres(data.data.GenreData || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalGenres(data.data.totalGenres || 0)
      setCurrentPage(data.data.currentPage || 1)
      setUseMockData(false)

      toast({
        title: "Success",
        description: data.message || "Genres fetched successfully",
      })
    } catch (error) {
      console.error("Genres fetch failed:", error)
      setApiError("Could not fetch genres from server")
      
      // Fall back to mock data
      setGenres(mockGenres)
      setUseMockData(true)
      setTotalPages(1)
      setTotalGenres(mockGenres.length)
      
      toast({
        title: "API Error",
        description: "Could not fetch genres from server. Using sample data instead.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  // Initial data fetch
  React.useEffect(() => {
    fetchGenres(currentPage)
  }, [currentPage, fetchGenres])

  // Helper function to get genre image
  const getGenreImage = (genre: Genre): string => {
    if (genre.Images && genre.Images.length > 0) {
      return genre.Images[0].image_path.startsWith('http') 
        ? genre.Images[0].image_path 
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/${genre.Images[0].image_path}`
    }
    return "/placeholder.svg"
  }

  // Helper function to get status display
  const getStatusDisplay = (status: number): { text: string; variant: "default" | "secondary" } => {
    return status === 1 
      ? { text: "Active", variant: "default" } 
      : { text: "Inactive", variant: "secondary" }
  }

  // Filter genres based on search (now works on current page data)
  const filteredGenres = React.useMemo(() => {
    if (!searchTerm) return genres
    return genres.filter((genre) => genre.Name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [genres, searchTerm])

  // For paginated API, we don't slice here since API handles pagination
  const currentGenres = filteredGenres

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleCreateGenre = async () => {
    if (!formData.genreName.trim()) {
      toast({
        title: "Error",
        description: "Genre name is required",
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
          description: "Please log in to create genres.",
          variant: "destructive",
        })
        return
      }

      // Create FormData for multipart/form-data request
      const formDataToSend = new FormData()
      formDataToSend.append("Name", formData.genreName)
      if (formData.genreDescription) {
        formDataToSend.append("Description", formData.genreDescription)
      }
      
      // Add all selected images to the payload
      if (selectedImages.length > 0) {
        selectedImages.forEach((image) => {
          formDataToSend.append("Images", image)
        })
      }
      
      // Add single image if selected (from the old input)
      if (formData.genreImage) {
        formDataToSend.append("Images", formData.genreImage)
      }

      const response = await fetch(genreEndPoint.GENRE_CREATION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formDataToSend,
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to create genre")
      }

      toast({
        title: "Success",
        description: "Genre created successfully!",
      })

      setIsCreateDialogOpen(false)
      setFormData({ genreName: "", genreDescription: "", genreImage: null })
      setSelectedImages([])
      
      // Refresh the genres list
      fetchGenres(currentPage)

    } catch (error: any) {
      console.error("Genre creation failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create genre. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }  }

  const handleEditGenre = async () => {
    if (!selectedGenre || !formData.genreName.trim()) {
      toast({
        title: "Error",
        description: "Genre name is required",
        variant: "destructive",
      })
      return
    }    setLoading(true)
    try {
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to update genres.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(genreEndPoint.GENRE_DATA_UPDATED, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          genre_id: selectedGenre._id,
          Name: formData.genreName,
          Description: formData.genreDescription,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to update genre")
      }

      toast({
        title: "Success",
        description: "Genre updated successfully!",
      })

      // Upload new images if any selected
      if (selectedImages.length > 0 && selectedGenre) {
        await uploadImages(selectedGenre._id)
      }

      setIsEditDialogOpen(false)
      setSelectedGenre(null)
      setFormData({ genreName: "", genreDescription: "", genreImage: null })
      setSelectedImages([])
      
      // Refresh the genres list
      fetchGenres(currentPage)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update genre",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  const handleDeleteGenre = async (genreId: string) => {
    setLoading(true)
    try {
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to delete genres.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(genreEndPoint.GENRE_DELETE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          genre_id: genreId,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to delete genre")
      }

      toast({
        title: "Success",
        description: "Genre deleted successfully!",
      })
      
      // Refresh the genres list
      fetchGenres(currentPage)

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete genre. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (genreId: string) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      const updatedGenres = genres.map((genre) =>
        genre._id === genreId
          ? {
              ...genre,
              status: genre.status === 1 ? 0 : 1,
              FilterationDateTime: new Date().toISOString(),
            }
          : genre,
      )

      setGenres(updatedGenres)

      toast({
        title: "Success",
        description: "Genre status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update genre status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (genre: Genre) => {
    setSelectedGenre(genre)
    setFormData({
      genreName: genre.Name,
      genreDescription: genre.Description || "",
      genreImage: null,
    })
    setEditFormData({
      genreId: genre._id,
      genreName: genre.Name,
      genreDescription: genre.Description || "",
      genreImages: genre.Images || []
    })
    setSelectedImages([])
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ genreName: "", genreDescription: "", genreImage: null })
    setSelectedImages([])
    setSelectedGenre(null)
  }

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedImages(files)
  }


  // Upload images function
  const uploadImages = async (genreId: string) => {
    if (selectedImages.length === 0) return

    setUploadingImages(true)
    try {
      const authToken = getValidToken()
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to upload images.",
          variant: "destructive",
        })
        return
      }

      for (const image of selectedImages) {
        const formData = new FormData()
        formData.append("genre_id", genreId)
        formData.append("GenreImage", image)

        const response = await fetch(genreEndPoint.GENRE_UPLOAD_IMAGE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        })

        const data = await response.json()
        if (data.error) {
          throw new Error(data.message || "Failed to upload image")
        }
      }

      toast({
        title: "Success",
        description: "Images uploaded successfully!",
      })

      // Clear selected images
      setSelectedImages([])

    } catch (error: any) {
      console.error("Image upload failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to upload images. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploadingImages(false)
    }
  }

  // Remove image function
  const removeImage = async (genreId: string, imageId: string) => {
    try {
      const authToken = getValidToken()
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to remove images.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(genreEndPoint.GENRE_IMAGE_REMOVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          genre_id: genreId,
          image_id: imageId,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to remove image")
      }

      toast({
        title: "Success",
        description: "Image removed successfully!",
      })

      // Update editFormData by removing the deleted image
      setEditFormData(prev => ({
        ...prev,
        genreImages: prev.genreImages.filter(img => img._id !== imageId)
      }))

      // Refresh the genres list
      fetchGenres(currentPage)

    } catch (error: any) {
      console.error("Image removal failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove image. Please try again.",
        variant: "destructive",
      })
    }
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
        <h1 className="text-2xl font-semibold">Genres Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}               className="px-4 py-2 text-sm rounded-full md:px-6 md:py-2 md:text-base"
>
              <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Genre</DialogTitle>
              <DialogDescription>Add a new music genre to the system.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="genreName">Genre Name *</Label>
                <Input
                  id="genreName"
                  value={formData.genreName}
                  onChange={(e) => setFormData({ ...formData, genreName: e.target.value })}
                  placeholder="Enter genre name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genreDescription">Description</Label>
                <Textarea
                  id="genreDescription"
                  value={formData.genreDescription}
                  onChange={(e) => setFormData({ ...formData, genreDescription: e.target.value })}
                  placeholder="Enter genre description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Add Images</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="cursor-pointer"
                />
                
                {selectedImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {selectedImages.length} image(s) selected
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedImages.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Selected image ${index + 1}`}
                            className="w-full h-20 object-cover rounded"
                          />
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
              <Button onClick={handleCreateGenre} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Genre
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
              placeholder="Search genres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Genres Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Genres</CardTitle>
          <CardDescription>Manage music genres in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Genre Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Created Date</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentGenres.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No genres found
                  </TableCell>
                </TableRow>
              ) : (
                currentGenres.map((genre) => (
                  <TableRow key={genre._id}>
                    <TableCell>
                      {getGenreImage(genre) !== "/placeholder.svg" ? (
                        <img
                          src={getGenreImage(genre)}
                          alt={genre.Name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{genre.Name}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">
                      {genre.Description || "No description"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusDisplay(genre.status).variant}>
                        {getStatusDisplay(genre.status).text}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(genre.createdAt).toLocaleDateString()}
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
                          <DropdownMenuItem onClick={() => openEditDialog(genre)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(genre._id)}>
                            {genre.status === 1 ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteGenre(genre._id)} className="text-red-600">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Genre</DialogTitle>
            <DialogDescription>Update the genre information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editGenreName">Genre Name *</Label>
              <Input
                id="editGenreName"
                value={formData.genreName}
                onChange={(e) => setFormData({ ...formData, genreName: e.target.value })}
                placeholder="Enter genre name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editGenreDescription">Description</Label>
              <Textarea
                id="editGenreDescription"
                value={formData.genreDescription}
                onChange={(e) => setFormData({ ...formData, genreDescription: e.target.value })}
                placeholder="Enter genre description"
                rows={3}
              />
            </div>
            
            {/* Current Images Section */}
            {editFormData.genreImages && editFormData.genreImages.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="grid grid-cols-3 gap-4">
                  {editFormData.genreImages.map((imageObj) => (
                    <div key={imageObj._id} className="relative group">
                      <img
                        src={`${process.env.NEXT_PUBLIC_BASE_URL}${imageObj.image_path}`}
                        alt={`Genre image`}
                        className="w-full h-20 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(editFormData.genreId, imageObj._id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* New Images Section */}
            <div className="space-y-2">
              <Label>Add New Images</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="cursor-pointer"
              />
              
              {selectedImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {selectedImages.length} new image(s) selected
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`New image ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
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
            <Button onClick={handleEditGenre} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Genre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}