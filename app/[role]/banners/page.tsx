"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, RefreshCw, AlertCircle, Plus, Edit, Trash2, Eye, MoreHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { bannerEndpoint } from "@/lib/api-endpoints"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import type { Banner, BannersApiResponse } from "@/lib/types"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)

  // Form state for create/edit
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
  }, [fetchBanners])

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
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://node.eventingclub.in'
    return `${baseUrl}/${imagePath}`
  }

  // CRUD Functions
  const handleCreateBanner = async () => {
    if (!formData.eventId || !formData.desktopImage || !formData.mobileImage) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select both images",
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

      const formDataPayload = new FormData()
      formDataPayload.append('Event_id', formData.eventId)
      formDataPayload.append('DesktopbannerImage', formData.desktopImage)
      formDataPayload.append('MobilebannerImage', formData.mobileImage)

      const response = await fetch(bannerEndpoint.CREATE_BANNER, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formDataPayload,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.message || 'Failed to create banner')
      }

      await fetchBanners()
      setIsCreateDialogOpen(false)
      resetForm()

      toast({
        title: "Success",
        description: data.message || "Banner created successfully",
      })
    } catch (error) {
      console.error('Create banner error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create banner",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditBanner = async () => {
    if (!selectedBanner || !formData.eventId) {
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

      const formDataPayload = new FormData()
      formDataPayload.append('BannerSlider_id', selectedBanner._id)
      formDataPayload.append('Event_id', formData.eventId)
      
      if (formData.desktopImage) {
        formDataPayload.append('DesktopbannerImage', formData.desktopImage)
      }
      if (formData.mobileImage) {
        formDataPayload.append('MobilebannerImage', formData.mobileImage)
      }

      const response = await fetch(bannerEndpoint.UPDATE_BANNER, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formDataPayload,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.message || 'Failed to update banner')
      }

      await fetchBanners()
      setIsEditDialogOpen(false)
      setSelectedBanner(null)
      resetForm()

      toast({
        title: "Success",
        description: data.message || "Banner updated successfully",
      })
    } catch (error) {
      console.error('Update banner error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update banner",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBanner = async () => {
    if (!selectedBanner) return

    setLoading(true)
    try {
      const authToken = getValidToken()
      if (!user || !authToken) {
        throw new Error("Authentication required")
      }

      const response = await fetch(bannerEndpoint.DELETE_BANNER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          BannerSlider_id: selectedBanner._id,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.message || 'Failed to delete banner')
      }

      await fetchBanners()
      setIsDeleteDialogOpen(false)
      setSelectedBanner(null)

      toast({
        title: "Success",
        description: data.message || "Banner deleted successfully",
      })
    } catch (error) {
      console.error('Delete banner error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete banner",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (banner: Banner) => {
    setSelectedBanner(banner)
    setFormData({
      eventId: banner.Event_id,
      desktopImage: null,
      mobileImage: null,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (banner: Banner) => {
    setSelectedBanner(banner)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      eventId: "",
      desktopImage: null,
      mobileImage: null,
    })
    setSelectedBanner(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Banners</h1>
          <p className="text-muted-foreground">Manage homepage banner slider images</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBanners} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Banner
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
                        </Button>
                        <Button 
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
          )}
          <div className="flex justify-end pt-4">
            <Button onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Banner Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? "Add New Banner" : "Edit Banner"}
            </DialogTitle>
            <DialogDescription>
              {isCreateDialogOpen ? "Fill in the details to add a new banner" : "Update the banner details"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="eventId">Event ID</Label>
              <Input
                id="eventId"
                placeholder="Enter event ID"
                value={formData.eventId}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label>Banner Images</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="desktopImage">Desktop Image</Label>
                  <Input
                    id="desktopImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setFormData({ ...formData, desktopImage: file })
                    }}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="mobileImage">Mobile Image</Label>
                  <Input
                    id="mobileImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setFormData({ ...formData, mobileImage: file })
                    }}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false)
                setIsEditDialogOpen(false)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button onClick={isCreateDialogOpen ? handleCreateBanner : handleEditBanner} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isCreateDialogOpen ? "Create Banner" : "Update Banner"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Banner Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Banner
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete this banner? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteBanner} variant="destructive" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : "Delete Banner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
