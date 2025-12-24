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
import { MoreHorizontal, PlusCircle, Search, Edit, Trash2, Upload, Loader2, X } from "lucide-react"
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
import { categorieEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { handleApiResponse, getApiErrorMessage } from "@/lib/utils"

interface CategoriesPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface Category {
  _id: string
  Name: string
  Description: string | null
  Images: Array<{
    image_path: string
    _id: string
  }>
  FilterationDateTime: string
  status: number
  Priority: number
  __v?: number
}

interface ApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalCategories: number
    CategoryData: Category[]
  }
}

const mockCategories: Category[] = [
  {
    _id: "cat001",
    Name: "Music",
    Description: "Music events including concerts, festivals, and performances",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=Music", _id: "img001" }],
    FilterationDateTime: "2025-01-05T08:30:00.000Z",
    status: 1,
    Priority: 1,
    __v: 0,
  },
  {
    _id: "cat002",
    Name: "Technology",
    Description: "Tech events including conferences, workshops, and hackathons",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=Tech", _id: "img002" }],
    FilterationDateTime: "2025-02-01T10:15:00.000Z",
    status: 1,
    Priority: 2,
    __v: 0,
  },
  {
    _id: "cat003",
    Name: "Art & Culture",
    Description: "Art exhibitions, cultural festivals, and creative workshops",
    Images: [{ image_path: "/placeholder.svg?height=100&width=100&text=Art", _id: "img003" }],
    FilterationDateTime: "2025-03-10T09:45:00.000Z",
    status: 1,
    Priority: 3,
    __v: 0,
  },
  {
    _id: "cat004",
    Name: "Sports",
    Description: "Sports events, tournaments, and fitness activities",
    Images: [],
    FilterationDateTime: "2025-04-15T12:00:00.000Z",

    status: 0,
    Priority: 4,
    __v: 0,
  },
]

const ITEMS_PER_PAGE = 10

export default function CategoriesPage({ params }: CategoriesPageProps) {
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
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalCategories, setTotalCategories] = React.useState(0)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null)
  const [useMockData, setUseMockData] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)
  // Form state
  const [formData, setFormData] = React.useState({
    categoryName: "",
    categoryDescription: "",
    categoryImage: null as File | null,
    categoryPriority: 1,
  })

  // Edit form state
  const [editFormData, setEditFormData] = React.useState<{
    categoryId: string
    categoryName: string
    categoryDescription: string
    categoryPriority: number
    categoryImages: Array<{ image_path: string; _id: string }>
  }>({
    categoryId: "",
    categoryName: "",
    categoryDescription: "",
    categoryPriority: 1,
    categoryImages: []
  })

  // Image upload state
  const [selectedImages, setSelectedImages] = React.useState<File[]>([])
  const [uploadingImages, setUploadingImages] = React.useState(false)
  // API function to fetch categories
  const fetchCategories = React.useCallback(async (page: number = 1, limit: number = ITEMS_PER_PAGE) => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = getValidToken()
      if (!authToken) {
        console.warn("No auth token available, using mock data")
        setCategories(mockCategories)
        setUseMockData(true)
        setTotalPages(1)
        setTotalCategories(mockCategories.length)
        setLoading(false)
        return
      }

      console.log("Fetching categories with pagination:")
      console.log("- Page:", page)
      console.log("- Limit:", limit)

      const response = await fetch(categorieEndPoint.CATEGORIES_PAGINATED_URL, {
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

      const data: ApiResponse = await handleApiResponse(response)
      console.log("Categories API response:", data)

      // Set the data from API
      const fetchedCategories = data.data.CategoryData || []
      console.log("📊 Fetched categories count:", fetchedCategories.length)
      
      // Log status of each category to verify what backend is returning
      fetchedCategories.forEach((cat: Category) => {
        console.log(`📋 Category: ${cat.Name} | Status: ${cat.status} | Disabled: ${cat.status === 0}`)
      })
      
      setCategories(fetchedCategories)
      setTotalPages(data.data.totalPages || 1)
      setTotalCategories(data.data.totalCategories || 0)
      setUseMockData(false)

      console.log("Categories fetched successfully:", data.message)
    } catch (error) {
      console.error("Categories fetch failed:", error)
      setApiError("Could not fetch categories from server")
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to fetch categories"),
        variant: "destructive",
      })
      
      // Fall back to mock data
      setCategories(mockCategories)
      setUseMockData(true)
      setTotalPages(1)
      setTotalCategories(mockCategories.length)
    } finally {
      setLoading(false)
    }
  }, [])
  // Initial data fetch
  React.useEffect(() => {
    fetchCategories(currentPage)
  }, [fetchCategories, currentPage])

  // Helper function to get category image
  const getCategoryImage = (category: Category): string => {
    if (category.Images && category.Images.length > 0) {
      return category.Images[0].image_path.startsWith('http') 
        ? category.Images[0].image_path 
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/${category.Images[0].image_path}`
    }
    return "/placeholder.svg"
  }

  // Helper function to get status display
  const getStatusDisplay = (status: number): { text: string; variant: "default" | "secondary" } => {
    return status === 1 
      ? { text: "Active", variant: "default" } 
      : { text: "Inactive", variant: "secondary" }
  }

  // Filter categories based on search (now works on current page data)
  const filteredCategories = React.useMemo(() => {
    if (!searchTerm) return categories
    return categories.filter((category) => category.Name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [categories, searchTerm])

  // For paginated API, we don't slice here since API handles pagination
  const currentCategories = filteredCategories
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate each file
    const validFiles: File[] = []
    const errors: string[] = []
    
    const validateImageDimensions = (file: File): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          // Check if dimensions are reasonable (not too small or too large)
          const minWidth = 100
          const minHeight = 100
          const maxWidth = 2048
          const maxHeight = 16384  // Allow up to ~16K height for the 8121 requirement
          
          if (img.naturalWidth < minWidth || img.naturalHeight < minHeight) {
            errors.push(`${file.name}: Image dimensions too small (minimum ${minWidth}x${minHeight})`)
            resolve(false)
          } else if (img.naturalWidth > maxWidth || img.naturalHeight > maxHeight) {
            errors.push(`${file.name}: Image dimensions too large (maximum ${maxWidth}x${maxHeight})`)
            resolve(false)
          } else {
            resolve(true)
          }
        }
        img.onerror = () => {
          errors.push(`${file.name}: Unable to read image dimensions`)
          resolve(false)
        }
        img.src = URL.createObjectURL(file)
      })
    }
    
    // Process files with validation
    const processFiles = async () => {
      for (const file of files) {
        // Check file type
        if (!file.type.match(/image\/(png|jpeg|jpg)/i)) {
          errors.push(`${file.name}: Only PNG and JPG files are allowed`)
          continue
        }
        
        // Check file size (500 KB = 500 * 1024 bytes)
        if (file.size > 500 * 1024) {
          errors.push(`${file.name}: File size must be less than 500 KB`)
          continue
        }
        
        // Check dimensions
        const isValidDimensions = await validateImageDimensions(file)
        if (isValidDimensions) {
          validFiles.push(file)
        }
      }
      
      // Show errors if any
      if (errors.length > 0) {
        toast({
          title: "File Validation Error",
          description: errors.join(". "),
          variant: "destructive",
        })
      }
      
      // Set valid files
      setSelectedImages(validFiles)
      
      // Show success message if files were validated
      if (validFiles.length > 0 && errors.length === 0) {
        toast({
          title: "Files Selected",
          description: `${validFiles.length} file(s) selected successfully`,
        })
      }
    }
    
    processFiles()
  }
  // Upload images function
  const uploadImages = async (categoryId: string) => {
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
        formData.append("category_id", categoryId)
        formData.append("Image", image)

        const response = await fetch(categorieEndPoint.CATEGORIES_UPLOAD_IMAGE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        })

        await handleApiResponse(response)
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
        description: getApiErrorMessage(error, "Failed to upload images. Please try again."),
        variant: "destructive",
      })
    } finally {
      setUploadingImages(false)
    }
  }

  // Remove image function
  const removeImage = async (categoryId: string, imageId: string) => {
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

      const response = await fetch(categorieEndPoint.CATEGORIES_IMAGE_REMOVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          category_id: categoryId,
          image_id: imageId,
        }),
      })

      const data = await handleApiResponse(response)

      toast({
        title: "Success",
        description: data.message || "Image removed successfully!",
      })

      // Update editFormData by removing the deleted image
      setEditFormData(prev => ({
        ...prev,
        categoryImages: prev.categoryImages.filter(img => img._id !== imageId)
      }))

      // Refresh the categories list
      fetchCategories(currentPage)

    } catch (error: any) {
      console.error("Image removal failed:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to remove image. Please try again."),
        variant: "destructive",
      })
    }
  }

  // Reset form data
  const resetForm = () => {
    setFormData({
      categoryName: "",
      categoryDescription: "",
      categoryImage: null,
      categoryPriority: 1,
    })
    setSelectedImages([])
  }

  const handleCreateCategory = async () => {
    if (!formData.categoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      })
      return
    }

    if (formData.categoryPriority < 0 || formData.categoryPriority > 10) {
      toast({
        title: "Error",
        description: "Priority must be between 0 and 10",
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
          description: "Please log in to create categories.",
          variant: "destructive",
        })
        return
      }

      // Create FormData for multipart/form-data request
      const formDataToSend = new FormData()
      formDataToSend.append("Name", formData.categoryName)
      if (formData.categoryDescription) {
        formDataToSend.append("Description", formData.categoryDescription)
      }
      formDataToSend.append("Priority", formData.categoryPriority.toString())
      
      // Add all selected images to the payload
      if (selectedImages.length > 0) {
        selectedImages.forEach((image) => {
          formDataToSend.append("CategoryImages", image)
        })
      }
      
      // Add single image if selected (from the old input)
      if (formData.categoryImage) {
        formDataToSend.append("CategoryImages", formData.categoryImage)
      }

      const response = await fetch(categorieEndPoint.CATEGORIE_CREATION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formDataToSend,
      })

      const data = await handleApiResponse(response)

      toast({
        title: "Success",
        description: data.message || "Category created successfully!",
      })

      setIsCreateDialogOpen(false)
      setFormData({ categoryName: "", categoryDescription: "", categoryImage: null, categoryPriority: 1 })
      setSelectedImages([])
      
      // Refresh the categories list
      fetchCategories(currentPage)

    } catch (error: any) {
      console.error("Category creation failed:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to create category. Please try again."),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  const handleEditCategory = async () => {
    if (!selectedCategory || !formData.categoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      })
      return
    }

    if (formData.categoryPriority < 0 || formData.categoryPriority > 10) {
      toast({
        title: "Error",
        description: "Priority must be between 0 and 10",
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
          description: "Please log in to update categories.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(categorieEndPoint.CATEGORIES_DATA_UPDATED, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },        body: JSON.stringify({
          category_id: selectedCategory._id,
          Name: formData.categoryName,
          Description: formData.categoryDescription,
          Priority: formData.categoryPriority,
        }),
      })

      const data = await handleApiResponse(response)

      toast({
        title: "Success",
        description: data.message || "Category updated successfully!",
      })

      // Upload new images if any selected
      if (selectedImages.length > 0 && selectedCategory) {
        await uploadImages(selectedCategory._id)
      }

      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      setFormData({ categoryName: "", categoryDescription: "", categoryImage: null, categoryPriority: 1 })
      setSelectedImages([])
      
      // Refresh the categories list
      fetchCategories(currentPage)
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update category"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  const handleDeleteCategory = async (categoryId: string) => {
    setLoading(true)
    try {
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in to delete categories.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(categorieEndPoint.CATEGORIES_DELETE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          category_id: categoryId,
        }),
      })

      const data = await handleApiResponse(response)

      toast({
        title: "Success",
        description: data.message || "Category deleted successfully!",
      })
      
      // Refresh the categories list
      fetchCategories(currentPage)

    } catch (error: any) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete category. Please try again."),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (categoryId: string) => {
    console.log("🔄 handleToggleStatus called with categoryId:", categoryId)
    
    try {
      const authToken = getValidToken()
      if (!authToken) {
        console.error("❌ No auth token available")
        toast({
          title: "Error",
          description: "Authentication required. Please log in again.",
          variant: "destructive",
        })
        return
      }

      // Find the category to get its current data
      const category = categories.find(cat => cat._id === categoryId)
      if (!category) {
        console.error("❌ Category not found:", categoryId)
        toast({
          title: "Error",
          description: "Category not found",
          variant: "destructive",
        })
        return
      }

      const newStatus = category.status === 1 ? 0 : 1
      console.log("📝 Current status:", category.status, "→ New status:", newStatus)

      const requestBody = {
        category_id: categoryId,
        Name: category.Name,
        Description: category.Description || "",
        Priority: category.Priority || 1,
        status: newStatus,
      }
      console.log("📤 Sending request to:", categorieEndPoint.CATEGORIES_DATA_UPDATED)
      console.log("📦 Request body:", requestBody)

      // Call the update API with the new status and all existing data
      const response = await fetch(categorieEndPoint.CATEGORIES_DATA_UPDATED, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📥 Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API Error:", response.status, errorText)
        throw new Error("Failed to update category status")
      }

      const data = await handleApiResponse(response)
      console.log("✅ API Response:", data)

      // Update local state to reflect the change
      const updatedCategories = categories.map((cat) =>
        cat._id === categoryId
          ? {
              ...cat,
              status: newStatus,
              FilterationDateTime: new Date().toISOString(),
            }
          : cat,
      )

      setCategories(updatedCategories)

      toast({
        title: "Success",
        description: data.message || `Category ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`,
      })

      console.log("🔄 Refreshing categories list...")
      // Refresh the categories list to ensure consistency
      fetchCategories(currentPage)
    } catch (error) {
      console.error("❌ Error toggling category status:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to update category status"),
        variant: "destructive",
      })
    }
  }
  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      categoryName: category.Name,
      categoryDescription: category.Description || "",
      categoryImage: null,
      categoryPriority: category.Priority || 1,
    })
    setEditFormData({
      categoryId: category._id,
      categoryName: category.Name,
      categoryDescription: category.Description || "",
      categoryPriority: category.Priority || 1,
      categoryImages: category.Images || []
    })
    setSelectedImages([])
    setIsEditDialogOpen(true)
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
        <h1 className="text-2xl font-semibold">Category Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="px-4 py-2 text-sm rounded-full md:px-6 md:py-2 md:text-base"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add 
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>Add a new event category to the system.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name *</Label>
                <Input
                  id="categoryName"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  placeholder="Enter category name"
                />
              </div>              <div className="space-y-2">
                <Label htmlFor="categoryDescription">Description</Label>
                <Textarea
                  id="categoryDescription"
                  value={formData.categoryDescription}
                  onChange={(e) => setFormData({ ...formData, categoryDescription: e.target.value })}
                  placeholder="Enter category description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryPriority">Priority (0-10) *</Label>
                <Input
                  id="categoryPriority"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.categoryPriority}
                  onChange={(e) => setFormData({ ...formData, categoryPriority: parseInt(e.target.value) || 1 })}
                  placeholder="Enter priority (0-10)"
                />
              </div>
           <div className="space-y-2">
                <Label>Add Images</Label>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Only PNG or JPG files. 500 KB max size. Dimensions: 100x100 to 2048x16384 pixels.
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageSelect}
                    className="cursor-pointer bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>
                
                {selectedImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {selectedImages.length} image(s) selected
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedImages([])}
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedImages.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Selected image ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setSelectedImages(prev => prev.filter((_, i) => i !== index))
                            }}
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
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Category
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
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>Manage event categories in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                currentCategories.map((category) => {
                  const isDisabled = category.status === 0
                  return (
                  <TableRow 
                    key={category._id}
                    className={isDisabled ? "bg-red-100 dark:bg-red-950/50 hover:bg-red-200 dark:hover:bg-red-950/70 border-l-[6px] border-l-red-600 dark:border-l-red-500" : ""}
                  >
                    <TableCell>
                      {getCategoryImage(category) !== "/placeholder.svg" ? (
                        <img
                          src={getCategoryImage(category)}
                          alt={category.Name}
                          className={`w-12 h-12 rounded-lg object-cover ${isDisabled ? 'opacity-60' : ''}`}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Upload className={`h-6 w-6 ${isDisabled ? 'text-red-500' : 'text-muted-foreground'}`} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={isDisabled ? "text-red-600 dark:text-red-400 line-through" : ""}>{category.Name}</span>
                        {isDisabled && (
                          <Badge variant="destructive" className="text-xs font-bold animate-pulse">DISABLED</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`max-w-xs truncate ${isDisabled ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {category.Description || "No description"}
                    </TableCell>
                    <TableCell className={isDisabled ? 'text-red-600 dark:text-red-400' : ''}>
                      {category.Priority || 0}
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
                          <DropdownMenuItem onClick={() => openEditDialog(category)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteCategory(category._id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  )
                })
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
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editCategoryName">Category Name *</Label>
              <Input
                id="editCategoryName"
                value={formData.categoryName}
                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                placeholder="Enter category name"
              />
            </div>            <div className="space-y-2">
              <Label htmlFor="editCategoryDescription">Description</Label>
              <Textarea
                id="editCategoryDescription"
                value={formData.categoryDescription}
                onChange={(e) => setFormData({ ...formData, categoryDescription: e.target.value })}
                placeholder="Enter category description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategoryPriority">Priority (0-10) *</Label>
              <Input
                id="editCategoryPriority"
                type="number"
                min="0"
                max="10"
                value={formData.categoryPriority}
                onChange={(e) => setFormData({ ...formData, categoryPriority: parseInt(e.target.value) || 1 })}
                placeholder="Enter priority (0-10)"
              />
            </div>
            
            {/* Current Images Section */}
            {editFormData.categoryImages && editFormData.categoryImages.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="grid grid-cols-3 gap-4">
                  {editFormData.categoryImages.map((imageObj) => (
                    <div key={imageObj._id} className="relative group">
                      <img
                        src={
                          imageObj.image_path.startsWith('http') 
                            ? imageObj.image_path 
                            : `${process.env.NEXT_PUBLIC_API_BASE_URL}/${imageObj.image_path}`
                        }
                        alt={`Category image`}
                        className="w-full h-20 object-cover rounded border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder.svg?height=80&width=80&text=No+Image'
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to remove this image?')) {
                            removeImage(editFormData.categoryId, imageObj._id)
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* New Images Section */}
            <div className="space-y-2">
              <Label>Add New Images</Label>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Only PNG or JPG files. 500 KB max size. Dimensions: 100x100 to 2048x16384 pixels.
                </p>
                <Input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageSelect}
                  className="cursor-pointer bg-background/50 dark:bg-muted/10 border-border/40 hover:border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>
              
              {selectedImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedImages.length} new image(s) selected
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedImages([])}
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`New image ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setSelectedImages(prev => prev.filter((_, i) => i !== index))
                          }}
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
            <Button onClick={handleEditCategory} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}