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
  Name: string
  Email?: string
  PhoneNo?: string
  Description?: string
  Images?: ArtistImage[]
  createdAt: string
  status?: number
}

export interface ArtistImage {
  _id: string
  image_path: string
  createdAt: string
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

// Customer Types
export interface Customer {
  _id: string
  CustomerName?: string
  Email?: string
  MobileNumber: number
  FilterationDateTime: string
  createdAt: string
  status: number
  RegistrationType: number
  Otp?: number
  OtpExpiryTime?: number
  __v: number
}

export interface CustomersApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalCustomers: number
    customerData: Customer[]
  }
}

// Booking interface remains the same
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

// Promocode Types
export interface Promocode {
  _id: string
  CanBeUsed: string
  PromoCodeName: string
  TermsCondition: string
  PromocodeType: number
  Value: number
  MinCheckoutAmount: number
  ExpiryDate: string
  OneTimeUseFlag: number
  PromocodeValidFor: number
  FilterationDateTime: string
  createdAt: string
  status: number
  Events: Array<{
    event_id: string
    _id: string
  }>
  CustomerIds: any[]
  __v: number
}

export interface PromocodesApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalPromocodes: number
    PromocodeData: Promocode[]
  }
}

// Promocode Type Constants
export const PromocodeType = {
  FixedAmount: 1,
  Percentage: 2,
} as const

// Promocode Status Constants
export const PromocodeStatus = {
  Inactive: 0,
  Active: 1,
  Disabled: 2,
} as const

// Customer Status Constants
export const CustomerStatus = {
  Active: 1,
  Inactive: 0,
} as const

// Registration Type Constants
export const RegistrationType = {
  Website: 1,
  Mobile: 2,
} as const

// Event Type Constants
export const EventType = {
  Booking: 1,
  Registration: 2,
  WhatsApp: 3,
} as const

// Banner Types
export interface Banner {
  _id: string
  DesktopbannerImage: string
  MobilebannerImage: string
  Event_id: string
  FilterationDateTime: string
  createdAt: string
  status: number
  __v: number
}

export interface BannersApiResponse {
  error: boolean
  message: string
  data: Banner[]
}

// Banner Status Constants
export const BannerStatus = {
  Inactive: 0,
  Active: 1,
} as const

// Scanner User Types
export interface ScannerUser {
  _id: string
  Username: string
  Password: string
  UserType: number
  Events: Array<{
    event_id: string
    _id: string
  }>
  Organizers: Array<{
    organizer_id: string
    _id: string
  }>
  FilterationDateTime: string
  createdAt: string
  CreatedBy: string
  createduser_id: string
  status: number
  __v: number
}

export interface ScannerUsersApiResponse {
  error: boolean
  message: string
  data: ScannerUser[]
}

// Scanner User Type Constants
export const ScannerUserType = {
  Event: 1,     // Event-specific scanner
  Organizer: 2, // Organizer-specific scanner
} as const

// Scanner User Status Constants
export const ScannerUserStatus = {
  Inactive: 0,
  Active: 1,
  Disabled: 2,
} as const

// Lead Types
export interface Lead {
  _id: string
  FullName: string
  Email: string
  Position: string
  City: string
  PhoneNumber: string
  CompanyName: string
  FilterationDateTime: string
  createdAt: string
  status: number
  __v: number
}

export interface LeadsApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalLeads: number
    WebsideLeadsData: Lead[]
  }
}

// Lead Status Constants
export const LeadStatus = {
  Inactive: 0,
  Active: 1,
  Contacted: 2,
} as const

export interface EventTour {
  _id: string
  Name: string
  Description?: string
  Images?: EventTourImage[]
  createdAt: string
  updatedAt?: string
  status?: number
  // Additional fields that might come from API response
  artistId?: string
  artistName?: string
  totalEvents?: number
  startDate?: string
  endDate?: string
  cities?: string[]
  tourName?: string // For backward compatibility
  tourDescription?: string // For backward compatibility
  FilterationDateTime?: string
  __v?: number
}

export interface EventTourImage {
  _id: string
  image_path: string
  createdAt: string
}
