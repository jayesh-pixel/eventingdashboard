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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, AlertCircle, Loader2, Mail, Phone, Building2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { leadsEndpoint } from "@/lib/api-endpoints"
import { Lead, LeadsApiResponse } from "@/lib/types"
import { apiClient } from "@/lib/api-client"

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const itemsPerPage = 10
  const fetchLeads = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if user is authenticated
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      if (!token) {
        throw new Error("Authentication required. Please log in.")
      }
      
      const requestBody: any = { 
        page: page.toString(), 
        limit: itemsPerPage.toString() 
      }
      // NOTE: Backend getAllPaginated does NOT support search — search is done client-side

      console.log('Making API request to:', leadsEndpoint.GET_ALL_PAGINATED)
      console.log('Request body:', requestBody)

      const response = await apiClient.post<LeadsApiResponse>(
        leadsEndpoint.GET_ALL_PAGINATED,
        requestBody
      )

      console.log('API Response (full):', response)
      console.log('API Response success:', response.success)
      console.log('API Response data:', response.data)

      if (response.success && response.data) {
        // Type assertion to handle the API client's data extraction
        const responseData = response.data as any
        
        // Check if the response has an error flag
        if (responseData.error) {
          throw new Error(responseData.message || 'Failed to fetch leads')
        }

        // Handle both possible structures
        const leadsData = responseData.WebsideLeadsData || responseData.data?.WebsideLeadsData || []
        const totalPages = responseData.totalPages || responseData.data?.totalPages || 1
        const currentPage = responseData.currentPage || responseData.data?.currentPage || 1
        const totalLeads = responseData.totalLeads || responseData.data?.totalLeads || leadsData.length
        
        console.log('Leads data:', leadsData)
        console.log('Response data structure:', responseData)
        console.log('Number of leads:', leadsData.length)

        // Backend doesn't support search — filter client-side
        let filteredLeads = leadsData
        if (search.trim()) {
          const term = search.trim().toLowerCase()
          filteredLeads = leadsData.filter((lead: any) =>
            (lead.FullName || "").toLowerCase().includes(term) ||
            (lead.Email || "").toLowerCase().includes(term) ||
            (lead.CompanyName || "").toLowerCase().includes(term) ||
            (lead.City || "").toLowerCase().includes(term)
          )
        }

        setLeads(filteredLeads)
        setTotalPages(totalPages)
        setCurrentPage(currentPage)
        setTotalLeads(search.trim() ? filteredLeads.length : totalLeads)
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
    fetchLeads(1, searchTerm)
  }, [searchTerm])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      fetchLeads(newPage, searchTerm)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
    try {
      // Handle both formats: "DD-MM-YYYY HH:mm:ss" and ISO format
      let date: Date
      
      if (dateString.includes('-') && dateString.includes(' ')) {
        // Handle "DD-MM-YYYY HH:mm:ss" format
        const [datePart, timePart] = dateString.split(' ')
        const [day, month, year] = datePart.split('-')
        date = new Date(`${month}/${day}/${year} ${timePart}`)
      } else {
        // Handle ISO format
        date = new Date(dateString)
      }
      
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
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
                    {/* <TableHead>Actions</TableHead> */}
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
                      {/* <TableCell>
                        <Badge className={statusColors[lead.status as keyof typeof statusColors]}>
                          {statusLabels[lead.status as keyof typeof statusLabels] || 'Unknown'}
                        </Badge>
                      </TableCell> */}
                      {/* <TableCell>
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
                      </TableCell> */}
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