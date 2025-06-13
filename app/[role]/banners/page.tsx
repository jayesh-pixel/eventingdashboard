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
import { MoreHorizontal, PlusCircle, Edit, Trash2, Loader2 } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import Image from "next/image"

interface BannersPageProps {
  params: { role: UserRole }
}

interface Banner {
  _id: string
  title: string
  imageUrl: string
  linkUrl?: string
  status: "Active" | "Inactive"
  displayOrder: number
  createdAt: string
}

const mockBanners: Banner[] = [
  {
    _id: "bnr001",
    title: "Summer Festival Early Bird",
    imageUrl: "/placeholder.svg?height=100&width=300&text=Summer+Festival+Banner",
    linkUrl: "/events/summer-festival",
    status: "Active",
    displayOrder: 1,
    createdAt: "2025-04-01T00:00:00.000Z",
  },
  {
    _id: "bnr002",
    title: "Tech Conference Registration Open",
    imageUrl: "/placeholder.svg?height=100&width=300&text=Tech+Conference+Banner",
    linkUrl: "/events/tech-conference",
    status: "Active",
    displayOrder: 2,
    createdAt: "2025-04-15T00:00:00.000Z",
  },
  {
    _id: "bnr003",
    title: "New Year Gala - Coming Soon",
    imageUrl: "/placeholder.svg?height=100&width=300&text=New+Year+Gala",
    status: "Inactive",
    displayOrder: 3,
    createdAt: "2025-05-01T00:00:00.000Z",
  },
]

const ITEMS_PER_PAGE = 10

export default function BannersPage({ params }: BannersPageProps) {
  const { role } = params
  const { toast } = useToast()

  const [banners, setBanners] = React.useState<Banner[]>(mockBanners)
  const [loading, setLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingBanner, setEditingBanner] = React.useState<Banner | null>(null)

  const [formData, setFormData] = React.useState({
    title: "",
    imageUrl: "", // This will be a string URL for mock, or File for real upload
    linkUrl: "",
    displayOrder: "",
    status: true,
    imageFile: null as File | null,
  })

  const filteredBanners = React.useMemo(() => {
    if (!searchTerm) return banners
    return banners.filter((b) => b.title.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [banners, searchTerm])

  const totalPages = Math.ceil(filteredBanners.length / ITEMS_PER_PAGE)
  const currentBanners = filteredBanners.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => setCurrentPage(page)

  const resetForm = () => {
    setFormData({ title: "", imageUrl: "", linkUrl: "", displayOrder: "", status: true, imageFile: null })
    setEditingBanner(null)
  }

  const handleFormSubmit = async () => {
    if (!formData.title || (!formData.imageUrl && !formData.imageFile) || !formData.displayOrder) {
      toast({ title: "Error", description: "Title, Image, and Display Order are required.", variant: "destructive" })
      return
    }
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Simulate image upload if a file is present
    let finalImageUrl = formData.imageUrl
    if (formData.imageFile) {
      finalImageUrl = `/placeholder.svg?height=100&width=300&text=${encodeURIComponent(formData.title)}`
      // In a real app: await uploadImage(formData.imageFile);
    }

    if (editingBanner) {
      setBanners(
        banners.map((b) =>
          b._id === editingBanner._id
            ? {
                ...editingBanner,
                title: formData.title,
                imageUrl: finalImageUrl,
                linkUrl: formData.linkUrl,
                displayOrder: Number.parseInt(formData.displayOrder),
                status: formData.status ? "Active" : "Inactive",
              }
            : b,
        ),
      )
      toast({ title: "Success", description: "Banner updated." })
    } else {
      const newBanner: Banner = {
        _id: `bnr${Date.now()}`,
        title: formData.title,
        imageUrl: finalImageUrl,
        linkUrl: formData.linkUrl,
        displayOrder: Number.parseInt(formData.displayOrder),
        status: formData.status ? "Active" : "Inactive",
        createdAt: new Date().toISOString(),
      }
      setBanners([newBanner, ...banners].sort((a, b) => a.displayOrder - b.displayOrder))
      toast({ title: "Success", description: "Banner created." })
    }
    setLoading(false)
    setIsFormOpen(false)
    resetForm()
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl, // Keep existing URL if not changed
      linkUrl: banner.linkUrl || "",
      displayOrder: banner.displayOrder.toString(),
      status: banner.status === "Active",
      imageFile: null,
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (bannerId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setBanners(banners.filter((b) => b._id !== bannerId))
    toast({ title: "Success", description: "Banner deleted." })
    setLoading(false)
  }

  const handleToggleStatus = async (bannerId: string) => {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setBanners(
      banners.map((b) => (b._id === bannerId ? { ...b, status: b.status === "Active" ? "Inactive" : "Active" } : b)),
    )
    toast({ title: "Success", description: "Banner status updated." })
    setLoading(false)
  }

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Banners Management</h1>
        <Button
          onClick={() => {
            resetForm()
            setIsFormOpen(true)
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Banner
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Filter by Banner Title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Banners</CardTitle>
          <CardDescription>Manage website display banners.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Link URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentBanners.map((b) => (
                <TableRow key={b._id}>
                  <TableCell>{b.displayOrder}</TableCell>
                  <TableCell>
                    <Image
                      src={b.imageUrl || "/placeholder.svg"}
                      alt={b.title}
                      width={150}
                      height={50}
                      className="rounded object-cover"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell className="hidden md:table-cell truncate max-w-xs">
                    {b.linkUrl ? (
                      <a
                        href={b.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {b.linkUrl}
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.status === "Active" ? "default" : "secondary"}>{b.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" disabled={loading}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(b)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(b._id)}>
                          {b.status === "Active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(b._id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
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
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === i + 1}
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(i + 1)
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
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

      {/* Add/Edit Banner Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Edit Banner" : "Add New Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageFile">Image File *</Label>
              <Input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] || null })}
              />
              {editingBanner && formData.imageUrl && !formData.imageFile && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">Current image:</p>
                  <Image
                    src={formData.imageUrl || "/placeholder.svg"}
                    alt="Current Banner"
                    width={300}
                    height={100}
                    className="rounded border"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkUrl">Link URL (Optional)</Label>
              <Input
                id="linkUrl"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="e.g., /events/your-event-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order *</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={formData.status}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked })}
              />
              <Label htmlFor="status">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsFormOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingBanner ? "Save Changes" : "Create Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
