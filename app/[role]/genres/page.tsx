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

interface GenresPageProps {
  params: { role: UserRole }
}

interface Genre {
  _id: string
  genreName: string
  genreDescription: string
  genreImage?: string
  status: "Active" | "Inactive"
  createdAt: string
  updatedAt: string
}

const mockGenres: Genre[] = [
  {
    _id: "gen001",
    genreName: "Rock",
    genreDescription: "Rock music events and concerts",
    genreImage: "/placeholder.svg?height=100&width=100&text=Rock",
    status: "Active",
    createdAt: "2025-01-03T08:30:00.000Z",
    updatedAt: "2025-01-08T14:45:00.000Z",
  },
  {
    _id: "gen002",
    genreName: "Electronic Dance Music",
    genreDescription: "Electronic dance music events and festivals",
    genreImage: "/placeholder.svg?height=100&width=100&text=EDM",
    status: "Active",
    createdAt: "2025-01-25T10:15:00.000Z",
    updatedAt: "2025-01-30T16:30:00.000Z",
  },
  {
    _id: "gen003",
    genreName: "Jazz",
    genreDescription: "Jazz music performances and festivals",
    genreImage: "/placeholder.svg?height=100&width=100&text=Jazz",
    status: "Active",
    createdAt: "2025-02-15T09:45:00.000Z",
    updatedAt: "2025-02-20T11:20:00.000Z",
  },
  {
    _id: "gen004",
    genreName: "Classical",
    genreDescription: "Classical music concerts and orchestral performances",
    genreImage: "/placeholder.svg?height=100&width=100&text=Classical",
    status: "Inactive",
    createdAt: "2025-03-05T12:00:00.000Z",
    updatedAt: "2025-03-10T16:15:00.000Z",
  },
  {
    _id: "gen005",
    genreName: "Hip Hop",
    genreDescription: "Hip hop concerts and rap battles",
    genreImage: "/placeholder.svg?height=100&width=100&text=HipHop",
    status: "Active",
    createdAt: "2025-03-20T14:30:00.000Z",
    updatedAt: "2025-03-25T18:45:00.000Z",
  },
]

const ITEMS_PER_PAGE = 10

export default function GenresPage({ params }: GenresPageProps) {
  const { role } = params
  const { toast } = useToast()

  // State management
  const [genres, setGenres] = React.useState<Genre[]>(mockGenres)
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedGenre, setSelectedGenre] = React.useState<Genre | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    genreName: "",
    genreDescription: "",
    genreImage: null as File | null,
  })

  // Filter genres based on search
  const filteredGenres = React.useMemo(() => {
    if (!searchTerm) return genres
    return genres.filter((genre) => genre.genreName.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [genres, searchTerm])

  const totalPages = Math.ceil(filteredGenres.length / ITEMS_PER_PAGE)
  const currentGenres = filteredGenres.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newGenre: Genre = {
        _id: `gen${Date.now()}`,
        genreName: formData.genreName,
        genreDescription: formData.genreDescription,
        genreImage: formData.genreImage
          ? `/placeholder.svg?height=100&width=100&text=${encodeURIComponent(formData.genreName)}`
          : undefined,
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setGenres([newGenre, ...genres])
      setIsCreateDialogOpen(false)
      setFormData({ genreName: "", genreDescription: "", genreImage: null })

      toast({
        title: "Success",
        description: "Genre created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create genre",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditGenre = async () => {
    if (!selectedGenre || !formData.genreName.trim()) {
      toast({
        title: "Error",
        description: "Genre name is required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const updatedGenres = genres.map((genre) =>
        genre._id === selectedGenre._id
          ? {
              ...genre,
              genreName: formData.genreName,
              genreDescription: formData.genreDescription,
              updatedAt: new Date().toISOString(),
            }
          : genre,
      )

      setGenres(updatedGenres)
      setIsEditDialogOpen(false)
      setSelectedGenre(null)
      setFormData({ genreName: "", genreDescription: "", genreImage: null })

      toast({
        title: "Success",
        description: "Genre updated successfully",
      })
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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setGenres(genres.filter((genre) => genre._id !== genreId))

      toast({
        title: "Success",
        description: "Genre deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete genre",
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
              status: genre.status === "Active" ? ("Inactive" as const) : ("Active" as const),
              updatedAt: new Date().toISOString(),
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
      genreName: genre.genreName,
      genreDescription: genre.genreDescription,
      genreImage: null,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ genreName: "", genreDescription: "", genreImage: null })
    setSelectedGenre(null)
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
            <Button onClick={resetForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Genre
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
                <Label htmlFor="genreImage">Genre Image</Label>
                <Input
                  id="genreImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, genreImage: e.target.files?.[0] || null })}
                />
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
                      {genre.genreImage ? (
                        <img
                          src={genre.genreImage || "/placeholder.svg"}
                          alt={genre.genreName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{genre.genreName}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">
                      {genre.genreDescription || "No description"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={genre.status === "Active" ? "default" : "secondary"}>{genre.status}</Badge>
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
                            {genre.status === "Active" ? "Deactivate" : "Activate"}
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
            <div className="space-y-2">
              <Label htmlFor="editGenreImage">Genre Image</Label>
              <Input
                id="editGenreImage"
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, genreImage: e.target.files?.[0] || null })}
              />
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
