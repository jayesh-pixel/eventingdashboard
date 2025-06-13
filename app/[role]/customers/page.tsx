"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/navigation"
import { useRouter } from "next/navigation" // For navigation

interface CustomersPageProps {
  params: { role: UserRole }
}

interface Customer {
  _id: string
  customerName: string
  email: string
  phone: string
  totalBookings: number
  lastBookingDate: string
  createdAt: string
}

const mockCustomers: Customer[] = [
  {
    _id: "cus001",
    customerName: "Alice Smith",
    email: "alice.smith@example.com",
    phone: "+1-555-0300",
    totalBookings: 5,
    lastBookingDate: "2025-05-15T00:00:00.000Z",
    createdAt: "2023-11-10T00:00:00.000Z",
  },
  {
    _id: "cus002",
    customerName: "Bob Johnson",
    email: "bob.johnson@example.com",
    phone: "+1-555-0301",
    totalBookings: 2,
    lastBookingDate: "2025-06-01T00:00:00.000Z",
    createdAt: "2024-01-20T00:00:00.000Z",
  },
  {
    _id: "cus003",
    customerName: "Carol Williams",
    email: "carol.williams@example.com",
    phone: "+1-555-0302",
    totalBookings: 8,
    lastBookingDate: "2025-04-22T00:00:00.000Z",
    createdAt: "2023-09-05T00:00:00.000Z",
  },
  {
    _id: "cus004",
    customerName: "David Brown",
    email: "david.brown@example.com",
    phone: "+1-555-0303",
    totalBookings: 1,
    lastBookingDate: "2025-03-10T00:00:00.000Z",
    createdAt: "2024-03-01T00:00:00.000Z",
  },
]

const ITEMS_PER_PAGE = 10

export default function CustomersPage({ params }: CustomersPageProps) {
  const { role } = params
  const { toast } = useToast()
  const router = useRouter()

  const [customers, setCustomers] = React.useState<Customer[]>(mockCustomers)
  const [loading, setLoading] = React.useState(false) // For future API calls
  const [currentPage, setCurrentPage] = React.useState(1)
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm) return customers
    return customers.filter(
      (cust) =>
        cust.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.email.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [customers, searchTerm])

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)
  const currentCustomers = filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => setCurrentPage(page)

  const handleViewBookings = (customerId: string, customerName: string) => {
    // Placeholder: In a real app, navigate to a dedicated customer bookings page
    // For now, we can log or show a toast.
    // router.push(`/${role}/customers/${customerId}/bookings`);
    toast({
      title: "View Bookings",
      description: `Navigating to bookings for ${customerName} (ID: ${customerId}). This page is not yet implemented.`,
    })
    console.log(`View bookings for customer ID: ${customerId}`)
  }

  if (role !== "superadmin") {
    return <div className="p-6 text-muted-foreground">Access Denied. Superadmin only.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Customers Management</h1>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Filter by Customer Name or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>View website-signed-up customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="text-center">Total Bookings</TableHead>
                <TableHead className="hidden lg:table-cell">Last Booking</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCustomers.map((cust) => (
                <TableRow key={cust._id}>
                  <TableCell className="font-medium">{cust.customerName}</TableCell>
                  <TableCell className="hidden md:table-cell">{cust.email}</TableCell>
                  <TableCell className="hidden lg:table-cell">{cust.phone}</TableCell>
                  <TableCell className="text-center">{cust.totalBookings}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {new Date(cust.lastBookingDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleViewBookings(cust._id, cust.customerName)}>
                      <Eye className="mr-2 h-4 w-4" /> View Bookings
                    </Button>
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
