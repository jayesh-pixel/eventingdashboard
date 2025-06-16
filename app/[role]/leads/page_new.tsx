"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, AlertCircle, Loader2, Mail, Phone, Building2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { leadsEndpoint } from "@/lib/api-endpoints"
import { Lead, LeadsApiResponse, LeadStatus } from "@/lib/types"
import { apiClient } from "@/lib/api-client"

const statusColors = {
  0: "bg-gray-100 text-gray-800",    // Inactive
  1: "bg-blue-100 text-blue-800",   // Active/New
  2: "bg-green-100 text-green-800"  // Contacted
} as const

const statusLabels = {
  0: "Inactive",
  1: "New", 
  2: "Contacted"
} as const

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const itemsPerPage = 10

  const fetchLeads = async (page: number = 1, search: string = "", status: string = "all") => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      })
      
      if (search.trim()) {
        params.append('search', search.trim())
      }
      
      if (status !== "all") {
        params.append('status', status)
      }

      const response = await apiClient.post<LeadsApiResponse>(
        leadsEndpoint.GET_ALL_PAGINATED,
        { page: page.toString(), limit: itemsPerPage.toString() }
      )

      console.log('Full API response:', response)
      console.log('Response data:', response.data)

      if (response.success && response.data) {
        if (response.data.error) {
          throw new Error(response.data.message || 'Failed to fetch leads')
        }

        const responseData = response.data.data
        setLeads(responseData.WebsideLeadsData)
        setTotalPages(responseData.totalPages)
        setCurrentPage(responseData.currentPage)
        setTotalLeads(responseData.totalLeads)
      } else {
        throw new Error(response.error || 'Failed to fetch leads')
      }
    } catch (err: any) {
      console.error('Error fetching leads:', err)
      setError(err.message || 'Failed to load leads')
      setLeads([])
      setTotalPages(1)
      setTotalLeads(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads(1, searchTerm, statusFilter)
  }, [searchTerm, statusFilter])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchLeads(newPage, searchTerm, statusFilter)
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Manage website inquiries and potential customers</p>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="1">New</SelectItem>
            <SelectItem value="2">Contacted</SelectItem>
            <SelectItem value="0">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Leads 
            {!loading && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({totalLeads} total)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Overview of all website inquiries and leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading leads...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No leads found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Received At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead._id}>
                      <TableCell className="font-medium">{lead.FullName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{lead.Email}</span>
                          </div>
                          {lead.PhoneNumber && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{lead.PhoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{lead.CompanyName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{lead.Position}</TableCell>
                      <TableCell>{lead.City}</TableCell>
                      <TableCell>{formatDate(lead.createdAt)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[lead.status as keyof typeof statusColors]}>
                          {statusLabels[lead.status as keyof typeof statusLabels] || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => console.log('View lead:', lead._id)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => console.log('Contact lead:', lead._id)}
                          >
                            Contact
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
