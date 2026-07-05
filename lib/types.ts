// Scanner User Types
export enum ScannerUserType {
  Event = 1,
  Organizer = 2,
}

export enum ScannerUserStatus {
  Inactive = 0,
  Active = 1,
  Disabled = 2,
}

export interface ScannerUser {
  _id: string;
  Username: string;
  UserType: ScannerUserType;
  status: ScannerUserStatus;
  Events?: { event_id: string }[];
  Organizers?: { organizer_id: string }[];
  [key: string]: any;
}

export interface ScannerUsersApiResponse {
  success: boolean;
  data: ScannerUser[] | { data: ScannerUser[]; [key: string]: any };
  error?: boolean;
  message?: string;
}
export interface Event {
  _id: string
  eventName: string
  EventName?: string // API might return this property name
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
  FullName: string
  Username: string
  Email: string
  Phone1: string
  Country?: string
  State?: string
  City?: string
  ProfileImage?: string
  Status: "Active" | "Inactive" | "Disabled"
  createdAt: string
  updatedAt?: string
  // Legacy field mappings for backward compatibility
  promoterName?: string
  promoterEmail?: string
  promoterPhone?: string
  promoterStatus?: "Active" | "Inactive"
}

// Customer Types (moved to line 121)

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
  // Additional location fields from API
  country?: string
  state?: string
  city?: string
}

export interface CustomersApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalCustomers: number
    customerData?: Customer[]  // Made optional for backward compatibility
    customersData?: Customer[] // Added to handle new API structure
  }
}

// Customer Bookings Interface
export interface CustomerBooking {
  Booking_id: string
  EventName: string
  TicketName: string
  TicketPrice: number
  TicketQuantity: number
  EventDate: string
  EventTime: string
  EventVenue: string
  VenueCity: string
  EventTicketType: string
  TotalAmount: number
}

export interface CustomerBookingsApiResponse {
  error: boolean
  message: string
  data: {
    totalPages: number
    currentPage: number
    totalBookings: number
    BookingsData: CustomerBooking[]
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
  organizerId?: string
  organizerName?: string
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
  FilterationBookingDateTime?: string
  EventName?: string
  TicketDate?: string
  EventCityName?: string
  EventVenueName?: string
  PromoterName?: string
  OrganizerName?: string
  OrganizerId?: string
  TicketQuantity?: number
  TicketName?: string
  EventTicketType?: string
  TicketPrice?: number
  TotalAmount?: number
  status?: number
  Remark?: string
  remark?: string
  // Extended columns (booking management / reports)
  checkIn?: number | string
  referenceId?: string
  promocode?: string
  promoValue?: number | string
  convenienceFee?: number | string
  gst?: number | string
  scannedBy?: string
  Check_In?: number | string
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

// Ticket Status Constants
export const TicketStatus = {
  Active: 1,
  Inactive: 0,
  Draft: 2,
  SoldOut: 3,
} as const

// Normal Ticket Interface
export interface NormalTicket {
  _id: string
  event_id: string
  EventDateTime_id: string
  TicketName: string
  TicketType: number
  TicketPrice: number
  TicketDescription?: string
  TicketQuantity: number
  SoldTickets?: number
  RemainingTickets?: number
  TicketStatus: number
  TicketVisibility: number
  TicketSaleStartDate: string
  TicketSaleEndDate: string
  MinTicketPerTransaction?: number
  MaxTicketPerTransaction?: number
  TicketTermsCondition?: string
  ConvenienceFeeApplicable?: number
  CreatedBy: string
  UpdatedBy?: string
  createdAt: string
  updatedAt: string
  __v?: number
}

// Bulk Ticket Interface
export interface BulkTicket {
  _id: string
  event_id: string
  EventDateTime_id: string
  BulkTicketName: string
  BulkTicketType: number
  BulkTicketPrice: number
  BulkTicketDescription?: string
  BulkTicketQuantity: number
  SoldBulkTickets?: number
  RemainingBulkTickets?: number
  BulkTicketStatus: number
  BulkTicketVisibility: number
  BulkTicketSaleStartDate: string
  BulkTicketSaleEndDate: string
  MinBulkTicketPerTransaction?: number
  MaxBulkTicketPerTransaction?: number
  BulkTicketTermsCondition?: string
  ConvenienceFeeApplicable?: number
  PromoterCommissionRate?: number
  PromoterCommissionType?: number
  CreatedBy: string
  UpdatedBy?: string
  createdAt: string
  updatedAt: string
  __v?: number
}

// Ticket API Response Types
export interface TicketsApiResponse {
  error: boolean
  message: string
  data: {
    totalPages?: number
    currentPage?: number
    totalTickets?: number
    tickets: NormalTicket[]
  }
}

export interface BulkTicketsApiResponse {
  error: boolean
  message: string
  data: {
    totalPages?: number
    currentPage?: number
    totalBulkTickets?: number
    bulkTickets: BulkTicket[]
  }
}

// Ticket Form Data
export interface TicketFormData {
  TicketName: string
  TicketType: number
  TicketPrice: number
  TicketDescription?: string
  TicketQuantity: number
  TicketSaleStartDate: string
  TicketSaleEndDate: string
  MinTicketPerTransaction?: number
  MaxTicketPerTransaction?: number
  TicketTermsCondition?: string
  ConvenienceFeeApplicable?: number
  TicketVisibility: number
}

export interface BulkTicketFormData {
  BulkTicketName: string
  BulkTicketType: number
  BulkTicketPrice: number
  BulkTicketDescription?: string
  BulkTicketQuantity: number
  BulkTicketSaleStartDate: string
  BulkTicketSaleEndDate: string
  MinBulkTicketPerTransaction?: number
  MaxBulkTicketPerTransaction?: number
  BulkTicketTermsCondition?: string
  ConvenienceFeeApplicable?: number
  BulkTicketVisibility: number
  PromoterCommissionRate?: number
  PromoterCommissionType?: number
}

// EventTour Interface
export interface EventTour {
  _id: string
  Name: string
  Description?: string
  Images: EventTourImage[]
  createdAt: string
  FilterationDateTime?: string
  ActiveEvent?: number
  status: number
  __v?: number
}

export interface EventTourImage {
  _id: string
  image_path: string
  createdAt: string
}

// Promocode Types
export enum PromocodeType {
  FixedAmount = 1,
  Percentage = 2
}

export enum PromocodeStatus {
  Inactive = 0,
  Active = 1,
  Disabled = 2
}

export interface Promocode {
  _id: string
  PromoCodeName: string
  TermsCondition?: string
  PromocodeType: PromocodeType
  Value: number
  MinCheckoutAmount: number
  ExpiryDate: string
  OneTimeUseFlag: number // 1 = Yes, 0 = No
  PromocodeValidFor?: string
  status: PromocodeStatus
  createdAt: string
  updatedAt?: string
  Events?: Array<{
    event_id: string
  }>
  CustomerIds?: Array<{
    customer_id: string
  }>
  CanBeUsed?: string
  [key: string]: any
}

export interface PromocodesApiResponse {
  success: boolean
  error: boolean
  message: string
  data: {
    PromocodeData: Promocode[]
    totalPages: number
    currentPage: number
    totalPromocodes: number
    hasNextPage?: boolean
    hasPreviousPage?: boolean
  }
}

export interface CreatePromocodeRequest {
  PromoCodeName: string
  TermsCondition?: string
  PromocodeType: string
  Value: number
  MinCheckoutAmount: number
  ExpiryDate: string
  OneTimeUseFlag: number // 0 = No, 1 = Yes
  PromocodeValidFor?: string
  Events?: Array<{ event_id: string }>
  CustomerIds?: Array<{ customer_id: string }>
  CanBeUsed?: string
}

// Banner Types
export interface Banner {
  _id: string
  Event_id: string
  DesktopbannerImage: string
  MobilebannerImage: string
  status: number
  createdAt: string
  FilterationDateTime: string
}

export interface BannersApiResponse {
  success: boolean
  data: Banner[]
  error?: boolean
  message?: string
}

// Lead Types
export interface Lead {
  _id: string
  FullName: string
  Email: string
  PhoneNumber?: string
  CompanyName: string
  Position: string
  City: string
  createdAt: string
  status?: number
}

export interface LeadsApiResponse {
  success: boolean
  data: Lead[] | { data: Lead[]; totalPages: number; currentPage: number; totalLeads: number; [key: string]: any }
  error?: boolean
  message?: string
}
