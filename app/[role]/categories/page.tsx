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

interface CategoriesPageProps {
  params: { role: UserRole }
}

interface Category {
  _id: string
  categoryName: string
  categoryDescription: string
  categoryImage?: string
  status: "Active" | "Inactive"
  createdAt: string
  updatedAt: string
}

const mockCategories: Category[] = [
  {
    _id: "cat001",
    categoryName: "Music",
    categoryDescription: "Music events including concerts, festivals, and performances",
    categoryImage: "/placeholder.svg?height=100&width=100&text=Music",
    status: "Active",
    createdAt: "2025-01-05T08:30:00.000Z",
    updatedAt: "2025-01-10T14:45:00.000Z",
  },
  {
    _id: "cat002",
    categoryName: "Technology",
    categoryDescription: "Tech events including conferences, workshops, and hackathons",
    categoryImage: "/placeholder.svg?height=100&width=100&text=Tech",
    status: "Active",
    createdAt: "2025-02-01T10:15:00.000Z",
    updatedAt: "2025-02-05T16:30:00.000Z",
  },
  {
    _id: "cat003",
    categoryName: "Art & Culture",
    categoryDescription: "Art exhibitions, cultural festivals, and creative workshops",
    categoryImage: "/placeholder.svg?height=100&width=100&text=Art",
    status: "Active",
    createdAt: "2025-03-10T09:45:00.000Z",
    updatedAt: "2025-03-12T11:20:00.000Z",
  },
  {
    _id: "cat004",
    categoryName: "Sports",
    categoryDescription: "Sports events, tournaments, and fitness activities",
    categoryImage: "/placeholder.svg?height=100&width=100&text=Sports",
    status: "Inactive",
    createdAt: "2025-04-15T12:00:00.000Z",
    updatedAt: "2025-04-20T16:15:00.000Z",
  },
]

const ITEMS_PER_PAGE = 10

export default function CategoriesPage({ params }: CategoriesPageProps) {
  const { role } = params
  const { toast } = useToast()

  // State management
  const [categories, setCategories] = React.useState<Category[]>(mockCategories)
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    categoryName: "",
    categoryDescription: "",
    categoryImage: null as File | null,
  })

  // Filter categories based on search
  const filteredCategories = React.useMemo(() => {
    if (!searchTerm) return categories
    return categories.filter((category) => category.categoryName.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [categories, searchTerm])

  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE)
  const currentCategories = filteredCategories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

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

    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newCategory: Category = {
        _id: `cat${Date.now()}`,
        categoryName: formData.categoryName,
        categoryDescription: formData.categoryDescription,
        categoryImage: formData.categoryImage
          ? `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(formData.categoryName)}`
          : undefined,
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setCategories([newCategory, ...categories])
      setIsCreateDialogOpen(false)
      setFormData({ categoryName: "", categoryDescription: "", categoryImage: null })

      toast({
        title: "Success",
        description: "Category created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create category",
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

    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const updatedCategories = categories.map((category) =>
        category._id === selectedCategory._id
          ? {
              ...category,
              categoryName: formData.categoryName,
              categoryDescription: formData.categoryDescription,
              updatedAt: new Date().toISOString(),
            }
          : category,
      )

      setCategories(updatedCategories)
      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      setFormData({ categoryName: "", categoryDescription: "", categoryImage: null })

      toast({
        title: "Success",
        description: "Category updated successfully",
      })
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setCategories(categories.filter((category) => category._id !== categoryId))

      toast({
        title: "Success",
        description: "Category deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
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
              status: category.status === "Active" ? ("Inactive" as const) : ("Active" as const),
              updatedAt: new Date().toISOString(),
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
      categoryName: category.categoryName,
      categoryDescription: category.categoryDescription,
      categoryImage: null,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ categoryName: "", categoryDescription: "", categoryImage: null })
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
            <Button onClick={resetForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
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
              </div>
              <div className="space-y-2">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Created Date</TableHead>
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
                      {category.categoryImage ? (
                        <img
                          src={category.categoryImage || "/placeholder.svg"}
                          alt={category.categoryName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{category.categoryName}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">
                      {category.categoryDescription || "No description"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.status === "Active" ? "default" : "secondary"}>{category.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
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
                          <DropdownMenuItem onClick={() => openEditDialog(category)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(category._id)}>
                            {category.status === "Active" ? "Deactivate" : "Activate"}
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
            </div>
            <div className="space-y-2">
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
