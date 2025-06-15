export interface Event {
  _id: string
  eventName: string
  eventDescription: string
  eventStatus: number | string // Can be numeric (from API) or string (for display)
  eventType: "Single-Day" | "Multi-Day"
  organizerId: string
  organizerName: string
  venueId: string
  venueName: string
  city: string
  eventStartDate: string
  eventEndDate: string
  createdAt: string
  updatedAt: string
  // Additional fields that might come from API
  eventVisibility?: number
  isEventFeatured?: number
  eventFormat?: number
  isOnlineEvent?: number
  venueToBeAnnounced?: number
}

export interface Artist {
  _id: string
  artistName: string
  artistDescription: string
  genre: string
  country: string
  artistImage?: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  _id: string
  categoryName: string
  categoryDescription: string
  categoryImage?: string
  createdAt: string
  updatedAt: string
}

export interface Genre {
  _id: string
  genreName: string
  genreDescription: string
  genreImage?: string
  createdAt: string
  updatedAt: string
}

export interface Venue {
  _id: string
  venueName: string
  venueDescription: string
  venueAddress: string
  city: string
  state: string
  country: string
  venueCapacity: number
  venueImage?: string
  createdAt: string
  updatedAt: string
}

export interface Organizer {
  _id: string
  organizerName: string
  organizerEmail: string
  organizerPhone: string
  organizerAddress: string
  city: string
  state: string
  country: string
  organizerStatus: "Active" | "Inactive"
  createdAt: string
  updatedAt: string
}

export interface Promoter {
  _id: string
  promoterName: string
  promoterEmail: string
  promoterPhone: string
  promoterAddress: string
  city: string
  state: string
  country: string
  promoterStatus: "Active" | "Inactive"
  createdAt: string
  updatedAt: string
}

export interface Customer {
  _id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  city: string
  state: string
  country: string
  createdAt: string
  updatedAt: string
}

export interface Booking {
  _id: string
  eventId: string
  eventName: string
  customerId: string
  customerName: string
  customerEmail: string
  phoneNumber?: string
  email?: string
  promoterId?: string
  promoterName?: string
  bookingChannel: "Online" | "Promoter" | "Bulk"
  bookingStatus: "Confirmed" | "Pending" | "Cancelled" | "Booked"
  totalAmount: number
  ticketPrice?: number
  bookingDate: string
  ticketDate?: string
  city?: string
  venue?: string
  quantity?: number
  ticketName?: string
  ticketType?: string
  createdAt: string
  updatedAt: string  // Additional fields from API response
  Booking_id?: string
  CustomerName?: string
  PhoneNumber?: string
  Email?: string
  BookingDateTime?: string
  EventName?: string
  TicketDate?: string
  EventCityName?: string
  EventVenueName?: string
  PromoterName?: string
  TicketQuantity?: number
  TicketName?: string
  EventTicketType?: string
  TicketPrice?: number
  TotalAmount?: number
  status?: number
  Remark?: string
  remark?: string
}

export interface DashboardStats {
  totalRevenue: number
  totalEvents: number
  totalOrganizers: number
  totalTicketsSold: number
  totalPromoters: number
  totalCustomers: number
}

// API User interface with numeric AdminRole
export interface ApiUser {
  AdminRole: number
  user_id: string
  Username?: string
  Email?: string
}

// Frontend User interface with string AdminRole for consistency
export interface User {
  AdminRole: string
  user_id: string
  Username?: string
  Email?: string
}

// Ticket Type Constants
export const TicketType = {
  SingleDay: 1,
  MultipleDay: 2,
  SeasonPass: 3,
  BulkTicket: 4,
} as const

// Event Type Constants
export const EventType = {
  Booking: 1,
  Registration: 2,
  WhatsApp: 3,
} as const
