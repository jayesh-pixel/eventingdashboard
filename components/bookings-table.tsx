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
  formatDateTime?: (date: Date | string | number) => string
  formatCurrency: (amount: number) => string
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline"
  onCancelBooking?: (booking: Booking) => void
  onResendTicket?: (booking: Booking) => void
}

export function BookingsTable({ 
  bookings, 
  role, 
  searchTerm, 
  statusFilter, 
  channelFilter,
  formatDate,
  formatDateTime,
  formatCurrency,
  getStatusBadgeVariant,
  onCancelBooking,
  onResendTicket
}: BookingsTableProps) {
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)

  const formatDateTimeSafe = React.useCallback(
    (date: Date | string | number) => {
      if (typeof formatDateTime === "function") return formatDateTime(date)

      if (!date) return "N/A"
      const parsed = new Date(date)
      if (Number.isNaN(parsed.getTime())) return "N/A"

      return parsed.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    },
    [formatDateTime]
  )

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  // Complete Table Component with All Columns
  const CompleteTable = () => (
    <div className="w-full overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full table-fixed text-sm text-left bg-white dark:bg-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <tr>
            <th scope="col" className="w-36 px-3 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase">
              Customer Name
            </th>
            <th scope="col" className="w-28 px-3 py-3 text-center text-xs font-medium text-gray-900 dark:text-white uppercase">
              Booking ID
            </th>
            <th scope="col" className="w-28 px-3 py-3 text-center text-xs font-medium text-gray-900 dark:text-white uppercase">
              Phone
            </th>
            <th scope="col" className="w-48 px-3 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase">
              Email
            </th>
            <th scope="col" className="w-36 px-3 py-3 text-center text-xs font-medium text-gray-900 dark:text-white uppercase">
              Booking Date & Time
            </th>
            <th scope="col" className="w-40 px-3 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase">
              Event Name
            </th>
            <th scope="col" className="w-28 px-3 py-3 text-center text-xs font-medium text-gray-900 dark:text-white uppercase">
              Ticket Date
            </th>
            <th scope="col" className="w-24 px-3 py-3 text-center text-xs font-medium text-gray-900 dark:text-white uppercase">
              Source
            </th>
            <th scope="col" className="w-24 px-3 py-3 text-center text-xs font-medium text-gray-900 dark:text-white uppercase">
              City
            </th>
            <th scope="col" className="w-36 px-3 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase">
              Venue
            </th>
            <th scope="col" className="w-20 px-3 py-3 text-center text-xs font-medium text-gray-900 dark:text-white uppercase">
              Quantity
            </th>
            <th scope="col" className="w-32 px-3 py-3 text-left text-xs font-medium text-gray-900 dark:text-white uppercase">
              Ticket Name
            </th>
            <th scope="col" className="w-24 px-3 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase">
              Price
            </th>
            <th scope="col" className="w-28 px-3 py-3 text-right text-xs font-medium text-gray-900 dark:text-white uppercase">
              Total Amount
            </th>
            <th scope="col" className="w-24 px-3 py-3 text-center text-xs font-medium text-gray-900 dark:text-white uppercase">
              Status
            </th>
            {role !== "organizer" && (
              <th scope="col" className="w-32 px-3 py-3 text-center text-xs font-medium text-gray-900 dark:text-white uppercase">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={role === "organizer" ? 15 : 16} className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="flex flex-col items-center space-y-3">
                  <div className="text-lg font-medium">
                    {searchTerm || statusFilter !== "all" || channelFilter !== "all"
                      ? "No bookings found matching your filters"
                      : "No bookings found"}
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            bookings.map((booking, index) => (
              <tr 
                key={booking._id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
              >
                {/* Customer Name */}
                <td className="w-36 px-3 py-3 text-left">
                  <div className="font-medium text-gray-900 dark:text-white truncate overflow-hidden text-ellipsis whitespace-nowrap" title={booking.CustomerName || booking.customerName || "N/A"}>
                    {booking.CustomerName || booking.customerName || "N/A"}
                  </div>
                </td>
                {/* Booking ID */}
                <td className="w-28 px-3 py-3 text-center">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap" title={booking.Booking_id || booking._id.slice(-8) || "N/A"}>
                    {booking.Booking_id || booking._id.slice(-8) || "N/A"}
                  </span>
                </td>
                {/* Phone Number */}
                <td className="w-28 px-3 py-3 text-center">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap" title={booking.PhoneNumber || booking.phoneNumber || "N/A"}>
                    {booking.PhoneNumber || booking.phoneNumber || "N/A"}
                  </span>
                </td>
                {/* Email */}
                <td className="w-48 px-3 py-3 text-left">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap" title={booking.Email || booking.customerEmail || "N/A"}>
                    {booking.Email || booking.customerEmail || "N/A"}
                  </span>
                </td>
                {/* Booking Date & Time */}
                <td className="w-36 px-3 py-3 text-center">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap">
                    {formatDateTimeSafe(booking.BookingDateTime || booking.bookingDate)}
                  </span>
                </td>
                {/* Event Name */}
                <td className="w-40 px-3 py-3 text-left">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap" title={booking.EventName || booking.eventName || "N/A"}>
                    {booking.EventName || booking.eventName || "N/A"}
                  </span>
                </td>
                {/* Ticket Date */}
                <td className="w-28 px-3 py-3 text-center">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap">
                    {(booking.TicketDate || booking.ticketDate) ? formatDate(booking.TicketDate || booking.ticketDate || "") : "N/A"}
                  </span>
                </td>
                {/* Source (Booking Channel) - Using BookingSource field from API */}
                <td className="w-24 px-3 py-3 text-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap">
                    {booking.bookingChannel || "Online"}
                  </span>
                </td>
                {/* City */}
                <td className="w-24 px-3 py-3 text-center">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap" title={booking.EventCityName || booking.city || "N/A"}>
                    {booking.EventCityName || booking.city || "N/A"}
                  </span>
                </td>
                {/* Venue */}
                <td className="w-36 px-3 py-3 text-left">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap" title={booking.EventVenueName || booking.venue || "N/A"}>
                    {booking.EventVenueName || booking.venue || "N/A"}
                  </span>
                </td>
                {/* Quantity */}
                <td className="w-20 px-3 py-3 text-center">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {booking.TicketQuantity || booking.quantity || "N/A"}
                  </span>
                </td>
                {/* Ticket Name */}
                <td className="w-32 px-3 py-3 text-left">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap" title={booking.TicketName || booking.ticketName || "N/A"}>
                    {booking.TicketName || booking.ticketName || "N/A"}
                  </span>
                </td>
                {/* Ticket Price */}
                <td className="w-24 px-3 py-3 text-right">
                  <span className="text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap">
                    {(booking.TicketPrice ?? booking.ticketPrice) ? formatCurrency(booking.TicketPrice ?? booking.ticketPrice ?? 0) : "N/A"}
                  </span>
                </td>
                {/* Total Amount */}
                <td className="w-28 px-3 py-3 text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap">
                    {formatCurrency(booking.TotalAmount || booking.totalAmount)}
                  </span>
                </td>
                {/* Status */}
                <td className="w-24 px-3 py-3 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    booking.bookingStatus === 'Confirmed' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : booking.bookingStatus === 'Pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {booking.bookingStatus || "N/A"}
                  </span>
                </td>
                {/* Actions - Hidden for Organizers */}
                {role !== "organizer" && (
                  <td className="w-32 px-3 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {booking.bookingStatus === "Booked" || booking.bookingStatus === "Confirmed" ? (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onCancelBooking?.(booking)}
                            className="text-xs px-2 py-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResendTicket?.(booking)}
                            className="text-xs px-2 py-1"
                          >
                            Resend
                          </Button>
                        </>
                      ) : booking.bookingStatus === "Cancelled" ? (
                        <span className="text-xs text-gray-500">-</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(booking)}
                          className="text-xs px-2 py-1"
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </td>
                )}
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
                </tr>                <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Booking Date & Time</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDateTimeSafe(selectedBooking.BookingDateTime || selectedBooking.bookingDate)}</td>
                </tr>                <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Event</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{selectedBooking.EventName || selectedBooking.eventName || "-"}</td>
                </tr>                <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Event Date</td>
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
                )}                <tr className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Status</td>
                  <td className="px-3 py-2">
                    <Badge variant={getStatusBadgeVariant(selectedBooking.bookingStatus)} className="text-xs">
                      {selectedBooking.bookingStatus}
                    </Badge>
                  </td>
                </tr>
                {(selectedBooking.Remark || selectedBooking.remark) && (
                  <tr className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">Remark</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs">
                        {selectedBooking.Remark || selectedBooking.remark}
                      </span>
                    </td>
                  </tr>
                )}
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
        <CompleteTable />
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
                </div>                <div>
                  <span className="text-gray-500 dark:text-gray-400">Date:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDateTimeSafe(booking.BookingDateTime || booking.bookingDate)}
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
