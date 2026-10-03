"use client"

import { useState, useEffect, useRef } from "react"
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

const SEARCH_PAGE_SIZE = 100
const MAX_SEARCH_PAGES = 50

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const itemsPerPage = 10
  // Leads are fetched whole only while searching (see fetchLeads), and cached until the
  // search box is cleared so each keystroke does not re-download every page.
  const allLeadsCache = useRef<Lead[] | null>(null)

  const fetchLeadsPage = async (page: number, limit: number) => {
    const response = await apiClient.post<LeadsApiResponse>(leadsEndpoint.GET_ALL_PAGINATED, {
      page: page.toString(),
      limit: limit.toString(),
    })

    if (!response.success || !response.data) {
      // An empty collection/page comes back as 404 "Website Leads not found".
      if (/website leads not found/i.test(response.error || "")) {
        return { leads: [] as Lead[], totalPages: 0, currentPage: page, totalLeads: 0 }
      }
      throw new Error(response.error || "Failed to fetch leads")
    }

    const responseData = response.data as any
    if (responseData.error) {
      throw new Error(responseData.message || "Failed to fetch leads")
    }

    const leadsData: Lead[] = responseData.WebsideLeadsData || responseData.data?.WebsideLeadsData || []
    return {
      leads: leadsData,
      totalPages: Number(responseData.totalPages ?? responseData.data?.totalPages) || 1,
      currentPage: Number(responseData.currentPage ?? responseData.data?.currentPage) || page,
      totalLeads: Number(responseData.totalLeads ?? responseData.data?.totalLeads) || leadsData.length,
    }
  }

  const fetchAllLeads = async () => {
    const first = await fetchLeadsPage(1, SEARCH_PAGE_SIZE)
    let all = first.leads
    const pageCount = Math.min(first.totalPages, MAX_SEARCH_PAGES)
    if (pageCount > 1) {
      const rest = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) => fetchLeadsPage(index + 2, SEARCH_PAGE_SIZE))
      )
      rest.forEach((result) => {
        all = all.concat(result.leads)
      })
    }
    return all
  }

  const fetchLeads = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      if (!token) {
        throw new Error("Authentication required. Please log in.")
      }

      const term = search.trim().toLowerCase()

      if (term) {
        // getAllPaginated has no search parameter, and filtering only the current page
        // hid every match on other pages - so search over all leads and page here.
        if (!allLeadsCache.current) {
          allLeadsCache.current = await fetchAllLeads()
        }
        const matches = allLeadsCache.current.filter((lead: any) =>
          (lead.FullName || "").toLowerCase().includes(term) ||
          (lead.Email || "").toLowerCase().includes(term) ||
          (lead.CompanyName || "").toLowerCase().includes(term) ||
          (lead.City || "").toLowerCase().includes(term)
        )
        const pageCount = Math.max(1, Math.ceil(matches.length / itemsPerPage))
        const safePage = Math.min(Math.max(page, 1), pageCount)

        setLeads(matches.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage))
        setTotalPages(pageCount)
        setCurrentPage(safePage)
        setTotalLeads(matches.length)
        return
      }

      allLeadsCache.current = null
      const result = await fetchLeadsPage(page, itemsPerPage)
      setLeads(result.leads)
      setTotalPages(result.totalPages || 1)
      setCurrentPage(result.currentPage)
      setTotalLeads(result.totalLeads)
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
    const delay = setTimeout(() => fetchLeads(1, searchTerm), 400)
    return () => clearTimeout(delay)
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
            placeholder="Search by name, email, company or city"
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
                ({totalLeads} {searchTerm.trim() ? "matching" : "total"})
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