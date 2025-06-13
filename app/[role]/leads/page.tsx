"use client"

import { Badge } from "@/components/ui/badge"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Mail, CalendarDays } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { UserRole } from "@/lib/navigation"

interface LeadsPageProps {
  params: { role: UserRole }
}

interface Lead {
  _id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  receivedAt: string
  status: "New" | "Contacted" | "Resolved"
}

const mockLeads: Lead[] = [
  {
    _id: "lead001",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1-555-0400",
    subject: "Inquiry about Summer Festival",
    message: "I would like to know more about the VIP packages for the Summer Festival. Please provide details.",
    receivedAt: "2025-07-01T10:30:00.000Z",
    status: "New",
  },
  {
    _id: "lead002",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    subject: "Sponsorship Opportunities",
    message: "Our company is interested in sponsoring the Tech Conference. Who can I speak to about this?",
    receivedAt: "2025-07-02T14:15:00.000Z",
    status: "Contacted",
  },
  {
    _id: "lead003",
    name: "Robert Brown",
    email: "robert.brown@example.com",
    phone: "+1-555-0402",
    subject: "Issue with Ticket Purchase",
    message: "I tried to purchase a ticket for the Art Expo but encountered an error. Can you assist?",
    receivedAt: "2025-07-03T09:00:00.000Z",
    status: "Resolved",
  },
  {
    _id: "lead004",
    name: "Emily White",
    email: "emily.white@example.com",
    subject: "Feedback on Website",
    message: "Just wanted to say your website is very user-friendly! Great job.",
    receivedAt: "2025-07-03T11:45:00.000Z",
    status: "New",
  },
]

const ITEMS_PER_PAGE = 10

export default function LeadsPage({ params }: LeadsPageProps) {
  const { role } = params

  const [leads, setLeads] = React.useState<Lead[]>(mockLeads)
  const [loading, setLoading] = React.useState(false) // For future API calls
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredLeads = React.useMemo(() => {
    if (!searchTerm) return leads
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.subject.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [leads, searchTerm])

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE)
  const currentLeads = filteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => setCurrentPage(page)

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Leads Management</h1>
      <CardDescription>View inquiries and messages received from the website Contact Us form.</CardDescription>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Filter by Name, Email, or Subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received At</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Subject</TableHead>
                <TableHead>Status</TableHead>
                {/* No actions for read-only leads as per spec, but could add "Mark as Contacted/Resolved" */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLeads.map((lead) => (
                <TableRow key={lead._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {new Date(lead.receivedAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground ml-6">
                      {new Date(lead.receivedAt).toLocaleTimeString()}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {lead.email}
                    </a>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell truncate max-w-xs">{lead.subject}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        lead.status === "New" ? "default" : lead.status === "Contacted" ? "outline" : "secondary"
                      }
                    >
                      {lead.status}
                    </Badge>
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
    </div>
  )
}
