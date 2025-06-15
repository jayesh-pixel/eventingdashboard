"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Eye } from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import type { Booking } from "@/lib/types"

interface BookingsTableProps {
  bookings: Booking[]
  role: UserRole
  searchTerm: string
  statusFilter: string
  channelFilter: string
  formatDate: (date: Date | string | number) => string
  formatCurrency: (amount: number) => string
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline"
}

export function BookingsTable({ 
  bookings, 
  role, 
  searchTerm, 
  statusFilter, 
  channelFilter,
  formatDate,
  formatCurrency,
  getStatusBadgeVariant
}: BookingsTableProps) {
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  // Condensed Table Component
  const CondensedTable = () => (
    <div className="w-full overflow-x-auto shadow-md sm:rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-3 py-3 min-w-[140px]">Customer Name</th>
            <th scope="col" className="px-2 py-3 min-w-[100px]">Booking ID</th>
            <th scope="col" className="px-2 py-3 min-w-[100px] hidden lg:table-cell">Phone No.</th>
            <th scope="col" className="px-2 py-3 min-w-[150px] hidden xl:table-cell">Email</th>
            <th scope="col" className="px-2 py-3 min-w-[120px]">Event</th>
            <th scope="col" className="px-2 py-3 min-w-[100px]">Booking Date & Time</th>
            <th scope="col" className="px-2 py-3 min-w-[60px] text-center">Quantity</th>            <th scope="col" className="px-2 py-3 min-w-[90px] hidden lg:table-cell">Ticket Price</th>
            <th scope="col" className="px-2 py-3 min-w-[120px]">Venue</th>
            <th scope="col" className="px-2 py-3 min-w-[100px] text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchTerm || statusFilter !== "all" || channelFilter !== "all"
                  ? "No bookings found matching your filters"
                  : "No bookings found"}
              </td>
            </tr>
          ) : (
            bookings.map((booking) => (
              <tr 
                key={booking._id}
                className={`${
                  booking.bookingStatus === "Cancelled" 
                    ? "bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900" 
                    : "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                } border-b dark:border-gray-700 transition-colors`}
              >                <td className="px-3 py-3 font-medium text-gray-900 dark:text-white max-w-[140px] truncate" title={booking.CustomerName || booking.customerName}>
                  {booking.CustomerName || booking.customerName}
                </td>                <td className="px-2 py-3 font-medium text-gray-900 dark:text-white">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                    {booking.Booking_id || booking._id.slice(-6)}
                  </span>
                </td><td className="px-2 py-3 text-gray-700 dark:text-gray-300 hidden lg:table-cell max-w-[100px] truncate">
                  {booking.PhoneNumber || booking.phoneNumber || "-"}
                </td>                <td className="px-2 py-3 text-gray-700 dark:text-gray-300 hidden xl:table-cell max-w-[150px] truncate" title={booking.Email || booking.customerEmail}>
                  {booking.Email || booking.customerEmail}
                </td>                <td className="px-2 py-3 text-gray-700 dark:text-gray-300 max-w-[120px] truncate" title={booking.EventName || booking.eventName}>
                  {booking.EventName || booking.eventName || "-"}
                </td><td className="px-2 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">
                  {formatDate(booking.BookingDateTime || booking.bookingDate)}
                </td>
                <td className="px-2 py-3 text-center">                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                    {booking.TicketQuantity || booking.quantity}
                  </span>
                </td>                <td className="px-2 py-3 font-medium text-gray-900 dark:text-gray-100 hidden lg:table-cell text-xs">
                  {(booking.TicketPrice ?? booking.ticketPrice) ? formatCurrency(booking.TicketPrice ?? booking.ticketPrice ?? 0) : "-"}
                </td>
                <td className="px-2 py-3 text-gray-700 dark:text-gray-300 max-w-[120px] truncate" title={booking.EventVenueName || booking.venue}>
                  {booking.EventVenueName || booking.venue || "-"}
                </td>
                <td className="px-2 py-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(booking)}
                    className="text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  // Detailed Modal Component with ALL columns
  const DetailedModal = () => (
    <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">        <DialogHeader>
          <DialogTitle>Booking Details - {selectedBooking?.CustomerName || selectedBooking?.customerName}</DialogTitle>
        </DialogHeader>
        {selectedBooking && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                <tr>
                  <th scope="col" className="px-3 py-3 min-w-[120px]">Field</th>
                  <th scope="col" className="px-3 py-3 min-w-[200px]">Value</th>
                </tr>
              </thead>
              <tbody>                <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Customer Name</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.CustomerName || selectedBooking.customerName}</td>
                </tr>                <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Booking ID</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                      {selectedBooking.Booking_id || selectedBooking._id}
                    </span>
                  </td>
                </tr><tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Phone No.</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.PhoneNumber || selectedBooking.phoneNumber || "-"}</td>
                </tr>                <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Email</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.Email || selectedBooking.customerEmail}</td>
                </tr><tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Booking Date & Time</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDate(selectedBooking.BookingDateTime || selectedBooking.bookingDate)}</td>
                </tr>                <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Event</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.EventName || selectedBooking.eventName || "-"}</td>
                </tr>                <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Ticket Date</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {(selectedBooking.TicketDate || selectedBooking.ticketDate) ? formatDate(selectedBooking.TicketDate || selectedBooking.ticketDate || "") : "-"}
                  </td>
                </tr><tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">City</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.EventCityName || selectedBooking.city || "-"}</td>
                </tr>                <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Venue</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.EventVenueName || selectedBooking.venue || "-"}</td>
                </tr>                <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Quantity</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                      {selectedBooking.TicketQuantity || selectedBooking.quantity}
                    </span>
                  </td>
                </tr>                <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Ticket Name</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.TicketName || selectedBooking.ticketName || "-"}</td>
                </tr>                <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Ticket Type</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.EventTicketType || selectedBooking.ticketType || "-"}</td>
                </tr>                <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Ticket Price</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">
                    {(selectedBooking.TicketPrice ?? selectedBooking.ticketPrice) ? formatCurrency(selectedBooking.TicketPrice ?? selectedBooking.ticketPrice ?? 0) : "-"}
                  </td>
                </tr>                <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Total Amount</td>
                  <td className="px-3 py-2 font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(selectedBooking.TotalAmount || selectedBooking.totalAmount)}
                  </td>
                </tr>
                {role !== "promoter" && selectedBooking.promoterName && (
                  <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Promoter</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.promoterName}</td>
                  </tr>
                )}
                <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Status</td>
                  <td className="px-3 py-2">
                    <Badge variant={getStatusBadgeVariant(selectedBooking.bookingStatus)} className="text-xs">
                      {selectedBooking.bookingStatus}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden md:block">
        <CondensedTable />
        <DetailedModal />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm || statusFilter !== "all" || channelFilter !== "all"
              ? "No bookings found matching your filters"
              : "No bookings found"}
          </div>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking._id}
              className={`p-4 rounded-lg border ${
                booking.bookingStatus === "Cancelled"
                  ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                  : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
              }`}
            >
              <div className="flex justify-between items-start mb-3">                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {booking.CustomerName || booking.customerName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {booking.Booking_id || booking._id.slice(-6)}
                  </p>
                </div>                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Venue: <span className="text-gray-900 dark:text-white font-medium">{booking.EventVenueName || booking.venue || "-"}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(booking)}
                    className="text-xs"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">                <div>
                  <span className="text-gray-500 dark:text-gray-400">Event:</span>
                  <p className="font-medium text-gray-900 dark:text-white truncate" title={booking.EventName || booking.eventName}>
                    {booking.EventName || booking.eventName || "-"}
                  </p>
                </div><div>
                  <span className="text-gray-500 dark:text-gray-400">Date:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(booking.BookingDateTime || booking.bookingDate)}
                  </p>
                </div>                <div>
                  <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {booking.TicketQuantity || booking.quantity}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total:</span>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(booking.TotalAmount || booking.totalAmount)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
