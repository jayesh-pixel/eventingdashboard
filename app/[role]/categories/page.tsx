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
import { categorieEndPoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"

interface CategoriesPageProps {
  params: { role: UserRole }
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
  createdAt: string
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
    createdAt: "05-01-2025 08:30:00",
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
    createdAt: "01-02-2025 10:15:00",
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
    createdAt: "10-03-2025 09:45:00",
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
    createdAt: "15-04-2025 12:00:00",
    status: 0,
    Priority: 4,
    __v: 0,
  },
]

const ITEMS_PER_PAGE = 10

export default function CategoriesPage({ params }: CategoriesPageProps) {
  const { role } = params
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
  // API function to fetch categories
  const fetchCategories = React.useCallback(async (page: number = 1, limit: number = ITEMS_PER_PAGE) => {
    try {
      setLoading(true)
      setApiError(null)

      const authToken = getValidToken()
      if (!user || !authToken) {
        console.warn("No user or auth token available, using mock data")
        setCategories(mockCategories)
        setUseMockData(true)
        setTotalPages(1)
        setTotalCategories(mockCategories.length)
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      console.log("Categories API response:", data)

      if (data.error) {
        throw new Error(data.message || "Failed to fetch categories")
      }

      // Set the data from API - DO NOT update currentPage here to avoid infinite loop
      setCategories(data.data.CategoryData || [])
      setTotalPages(data.data.totalPages || 1)
      setTotalCategories(data.data.totalCategories || 0)
      setUseMockData(false)

      toast({
        title: "Success",
        description: data.message || "Categories fetched successfully",
      })
    } catch (error) {
      console.error("Categories fetch failed:", error)
      setApiError("Could not fetch categories from server")
      
      // Fall back to mock data
      setCategories(mockCategories)
      setUseMockData(true)
      setTotalPages(1)
      setTotalCategories(mockCategories.length)
      
      toast({
        title: "API Error",
        description: "Could not fetch categories from server. Using sample data instead.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])
  // Initial data fetch
  React.useEffect(() => {
    fetchCategories(currentPage)
  }, [currentPage, fetchCategories])

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
  const handleEditClick = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      categoryName: category.Name,
      categoryDescription: category.Description || "",
      categoryImage: null,
      categoryPriority: category.Priority || 1,
    })
    setIsEditDialogOpen(true)
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
      
      // Add image if selected
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

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to create category")
      }      toast({
        title: "Success",
        description: "Category created successfully!",
      })

      setIsCreateDialogOpen(false)
      setFormData({ categoryName: "", categoryDescription: "", categoryImage: null, categoryPriority: 1 })
      
      // Refresh the categories list
      fetchCategories(currentPage)

    } catch (error: any) {
      console.error("Category creation failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create category. Please try again.",
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

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to update category")
      }      toast({
        title: "Success",
        description: "Category updated successfully!",
      })

      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      setFormData({ categoryName: "", categoryDescription: "", categoryImage: null, categoryPriority: 1 })
      
      // Refresh the categories list
      fetchCategories(currentPage)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
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

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message || "Failed to delete category")
      }

      toast({
        title: "Success",
        description: "Category deleted successfully!",
      })
      
      // Refresh the categories list
      fetchCategories(currentPage)

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (categoryId: string) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const updatedCategories = categories.map((category) =>
        category._id === categoryId
          ? {
              ...category,
              status: category.status === 1 ? 0 : 1,
              FilterationDateTime: new Date().toISOString(),
            }
          : category,
      )

      setCategories(updatedCategories)

      toast({
        title: "Success",
        description: "Category status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ categoryName: "", categoryDescription: "", categoryImage: null, categoryPriority: 1 })
    setSelectedCategory(null)
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
        <h1 className="text-2xl font-semibold">Categories Management</h1>
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
                <Label htmlFor="categoryImage">Category Image</Label>
                <Input
                  id="categoryImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, categoryImage: e.target.files?.[0] || null })}
                />
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
          <Table>            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
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
                currentCategories.map((category) => (
                  <TableRow key={category._id}>
                    <TableCell>
                      {getCategoryImage(category) !== "/placeholder.svg" ? (
                        <img
                          src={getCategoryImage(category)}
                          alt={category.Name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{category.Name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {category.Description || "No description"}
                    </TableCell>
                    <TableCell>
                      {category.Priority || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusDisplay(category.status).variant}>
                        {getStatusDisplay(category.status).text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(category.createdAt).toLocaleDateString()}
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
                          <DropdownMenuItem onClick={() => handleEditClick(category)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(category._id)}>
                            {category.status === 1 ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteCategory(category._id)} className="text-red-600">
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
            <div className="space-y-2">
              <Label htmlFor="editCategoryImage">Category Image</Label>
              <Input
                id="editCategoryImage"
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, categoryImage: e.target.files?.[0] || null })}
              />
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