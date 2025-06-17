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
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import type { Banner, BannersApiResponse } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
          <Button>
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
                          onClick={() => console.log('Edit banner:', banner._id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => console.log('Delete banner:', banner._id)}
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
    </div>
  )
}
