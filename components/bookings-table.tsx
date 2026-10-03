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
import { formatEventDateTime } from "@/lib/utils"

export type BookingColumnKey =
  | "name"
  | "bookingId"
  | "phone"
  | "email"
  | "bookingDateTime"
  | "eventName"
  | "ticketDate"
  | "source"
  | "city"
  | "venue"
  | "promoterName"
  | "quantity"
  | "checkIn"
  | "ticketName"
  | "ticketType"
  | "referenceId"
  | "ticketPrice"
  | "promocode"
  | "promoValue"
  | "convenienceFee"
  | "gst"
  | "totalAmount"
  | "scannedBy"
  | "remark"
  | "status"
  | "actions"

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
  /** Optional explicit ordered column set. When omitted, a role-based default is used. */
  columns?: BookingColumnKey[]
}

const isBookingCancelled = (b: Booking) => {
  const status = String(b.bookingStatus ?? (b as any).Status ?? "").trim().toLowerCase()
  return status === "cancelled" || status === "canceled" || status === "2"
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
  onResendTicket,
  columns
}: BookingsTableProps) {
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)

  const formatDateTimeSafe = React.useCallback(
    (date: Date | string | number) => {
      if (typeof formatDateTime === "function") return formatDateTime(date)

      // Booking timestamps come back as "DD-MM-YYYY HH:mm:ss" from several
      // endpoints, which new Date() rejects - callers that do not pass their own
      // formatter used to get "N/A" for every row.
      return formatEventDateTime(date)
    },
    [formatDateTime]
  )

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  // ---- Column registry -----------------------------------------------------
  const val = (b: Booking, keys: string[]): string => {
    for (const k of keys) {
      const v = (b as any)[k]
      if (v !== undefined && v !== null && v !== "") return String(v)
    }
    return ""
  }

  const trunc = (content: React.ReactNode, title?: string, align: "left" | "center" | "right" = "left") => (
    <span
      className={`text-sm text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap text-${align}`}
      title={title}
    >
      {content}
    </span>
  )

  type ColumnDef = {
    header: string
    thClass: string
    render: (b: Booking) => React.ReactNode
  }

  const COLUMN_DEFS: Record<BookingColumnKey, ColumnDef> = {
    name: {
      header: "Customer Name",
      thClass: "w-36 text-left",
      render: (b) => trunc(b.CustomerName || b.customerName || "N/A", b.CustomerName || b.customerName || "N/A"),
    },
    bookingId: {
      header: "Booking ID",
      thClass: "w-28 text-center",
      render: (b) => trunc(b.Booking_id || b._id.slice(-8) || "N/A", b.Booking_id || b._id, "center"),
    },
    phone: {
      header: "Phone No.",
      thClass: "w-28 text-center",
      render: (b) => trunc(b.PhoneNumber || b.phoneNumber || "N/A", undefined, "center"),
    },
    email: {
      header: "Email",
      thClass: "w-48 text-left",
      render: (b) => trunc(b.Email || b.customerEmail || "N/A", b.Email || b.customerEmail || "N/A"),
    },
    bookingDateTime: {
      header: "Booking Date & Time",
      thClass: "w-36 text-center",
      render: (b) => trunc(formatDateTimeSafe(b.BookingDateTime || b.bookingDate), undefined, "center"),
    },
    eventName: {
      header: "Event",
      thClass: "w-40 text-left",
      render: (b) => trunc(b.EventName || b.eventName || "N/A", b.EventName || b.eventName || "N/A"),
    },
    ticketDate: {
      header: "Ticket Date",
      thClass: "w-28 text-center",
      render: (b) => trunc((b.TicketDate || b.ticketDate) ? formatDate(b.TicketDate || b.ticketDate || "") : "N/A", undefined, "center"),
    },
    source: {
      header: "Sources",
      thClass: "w-24 text-center",
      render: (b) => trunc(b.bookingChannel || "Online", undefined, "center"),
    },
    city: {
      header: "City",
      thClass: "w-24 text-center",
      render: (b) => trunc(b.EventCityName || b.city || "N/A", b.EventCityName || b.city || "N/A", "center"),
    },
    venue: {
      header: "Venue",
      thClass: "w-36 text-left",
      render: (b) => trunc(b.EventVenueName || b.venue || "N/A", b.EventVenueName || b.venue || "N/A"),
    },
    promoterName: {
      header: "Promoter Name",
      thClass: "w-32 text-left",
      render: (b) => trunc(b.promoterName || b.PromoterName || "-", b.promoterName || b.PromoterName || "-"),
    },
    quantity: {
      header: "Quantity",
      thClass: "w-20 text-center",
      render: (b) => trunc(b.TicketQuantity || b.quantity || "N/A", undefined, "center"),
    },
    checkIn: {
      header: "Check In",
      thClass: "w-20 text-center",
      render: (b) => trunc(val(b, ["checkIn", "Check_In", "CheckIn", "Checkin"]) || "0", undefined, "center"),
    },
    ticketName: {
      header: "Ticket Name",
      thClass: "w-32 text-left",
      render: (b) => trunc(b.TicketName || b.ticketName || "N/A", b.TicketName || b.ticketName || "N/A"),
    },
    ticketType: {
      header: "Ticket Type",
      thClass: "w-28 text-left",
      render: (b) => trunc(b.EventTicketType || b.ticketType || "N/A", undefined),
    },
    referenceId: {
      header: "Reference ID",
      thClass: "w-32 text-left",
      render: (b) => trunc(val(b, ["referenceId", "Transaction_id", "ReferenceId", "Reference_id", "reference_id"]) || "-", undefined),
    },
    ticketPrice: {
      header: "Ticket Price",
      thClass: "w-24 text-right",
      render: (b) => trunc((b.TicketPrice ?? b.ticketPrice) ? formatCurrency(b.TicketPrice ?? b.ticketPrice ?? 0) : "N/A", undefined, "right"),
    },
    promocode: {
      header: "Promocode",
      thClass: "w-28 text-left",
      render: (b) => trunc(val(b, ["promocode", "PromocodeName", "Promocode", "CustomerPromocode", "PromoCodeName"]) || "-", undefined),
    },
    promoValue: {
      header: "Promo Value",
      thClass: "w-24 text-right",
      render: (b) => trunc(val(b, ["promoValue", "PromocodeValue", "PromoValue", "discount", "Discount"]) || "-", undefined, "right"),
    },
    convenienceFee: {
      header: "Convenience Fee",
      thClass: "w-28 text-right",
      render: (b) => trunc(val(b, ["convenienceFee", "ConvinienceFeeValue", "convenienceFeeValue", "ConvenienceFee"]) || "-", undefined, "right"),
    },
    gst: {
      header: "GST",
      thClass: "w-20 text-right",
      render: (b) => trunc(val(b, ["gst", "GST", "Gst"]) || "-", undefined, "right"),
    },
    totalAmount: {
      header: "Total Amount",
      thClass: "w-28 text-right",
      render: (b) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white block truncate overflow-hidden text-ellipsis whitespace-nowrap text-right">
          {formatCurrency(b.TotalAmount || b.totalAmount)}
        </span>
      ),
    },
    scannedBy: {
      header: "Scanned By",
      thClass: "w-32 text-left",
      render: (b) => trunc(val(b, ["scannedBy", "ScannedBy", "scanned_by", "ScannedByName"]) || "-", undefined),
    },
    remark: {
      header: "Remark",
      thClass: "w-32 text-left",
      render: (b) => trunc(b.Remark || b.remark || "-", b.Remark || b.remark || "-"),
    },
    status: {
      header: "Status",
      thClass: "w-24 text-center",
      render: (b) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          b.bookingStatus === 'Confirmed'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : b.bookingStatus === 'Pending'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {b.bookingStatus || "N/A"}
        </span>
      ),
    },
    actions: {
      header: "Actions",
      thClass: "w-32 text-center",
      render: (b) => (
        <div className="flex gap-1 justify-center">
          {b.bookingStatus === "Booked" || b.bookingStatus === "Confirmed" ? (
            <>
              {role === "superadmin" && (
                <Button variant="destructive" size="sm" onClick={() => onCancelBooking?.(b)} className="text-xs px-2 py-1">
                  Cancel
                </Button>
              )}
              {role === "superadmin" && (
                <Button variant="outline" size="sm" onClick={() => onResendTicket?.(b)} className="text-xs px-2 py-1">
                  Resend
                </Button>
              )}
              {role !== "superadmin" && (
                <Button variant="outline" size="sm" onClick={() => handleViewDetails(b)} className="text-xs px-2 py-1">
                  View
                </Button>
              )}
            </>
          ) : b.bookingStatus === "Cancelled" ? (
            <span className="text-xs text-gray-500">-</span>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleViewDetails(b)} className="text-xs px-2 py-1">
              View
            </Button>
          )}
        </div>
      ),
    },
  }

  // Role-based default column set (preserves the original layout when no `columns` prop is passed)
  const defaultColumns: BookingColumnKey[] = [
    "name",
    "bookingId",
    "phone",
    "email",
    "bookingDateTime",
    "eventName",
    "ticketDate",
    ...(role !== "promoter" ? (["source"] as BookingColumnKey[]) : []),
    "city",
    "venue",
    "quantity",
    "ticketName",
    "ticketPrice",
    "totalAmount",
    "status",
    ...((role === "superadmin" || role === "organizer") ? (["promoterName"] as BookingColumnKey[]) : []),
    ...(role === "superadmin" ? (["actions"] as BookingColumnKey[]) : []),
  ]

  const activeColumns: BookingColumnKey[] = columns && columns.length > 0 ? columns : defaultColumns

  // Complete Table Component with All Columns
  const CompleteTable = () => (
    <div className="w-full overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full table-fixed text-sm text-left bg-white dark:bg-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <tr>
            {activeColumns.map((key) => (
              <th
                key={key}
                scope="col"
                className={`${COLUMN_DEFS[key].thClass} px-3 py-3 text-xs font-medium text-gray-900 dark:text-white uppercase`}
              >
                {COLUMN_DEFS[key].header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={activeColumns.length} className="text-center py-12 text-gray-500 dark:text-gray-400">
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
            bookings.map((booking) => (
              <tr
                key={booking._id}
                className={`border-b border-gray-200 dark:border-gray-600 ${
                  isBookingCancelled(booking)
                    ? "bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {activeColumns.map((key) => (
                  <td key={key} className={`${COLUMN_DEFS[key].thClass} px-3 py-3`}>
                    {COLUMN_DEFS[key].render(booking)}
                  </td>
                ))}
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
                isBookingCancelled(booking)
                  ? "bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-800"
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
