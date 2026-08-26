// API Constants - matching your backend structure exactly

export const EventVisibility = {
  Public: 1,
  Private: 2,
} as const

export const EventType = {
  Booking: 1,
  Registration: 2,
  WhatsApp: 3,
} as const

export const Status = {
  Active: 1,
  Inactive: 2,
} as const

export const isEventFeatured = {
  Yes: 1,
  No: 0,
} as const

export const isTourEvent = {
  Yes: 1,
  No: 0,
} as const

export const EventStatus = {
  Draft: 1,
  InReview: 2,
  Published: 3,
  ReviewRejected: 4,
  Completed: 5,
} as const

export const AdminRoles = {
  SuperAdmin: 1,
  Employee: 2,
  Organizer: 3,
  Promoter: 4,
} as const

export const ConvinienceFeeUnit = {
  Amount: 1,
  Percentage: 2,
} as const

export const EventFormat = {
  EventTour: 1,
  StandardEvent: 0,
} as const

export const EventVenueTobeAnnounced = {
  Yes: 1,
  No: 0,
} as const

export const IsVenueAvailable = {
  Yes: 1,
  No: 0,
} as const

export const IsOnlineEvent = {
  Yes: 1,
  No: 0,
} as const

export const TicketType = {
  SingleDay: 1,
  MultipleDay: 2,
  SeasonPass: 3,
  BulkTicket: 4,
} as const

export const TicketVisiblity = {
  All: 1,
  AllCustomers: 2,
  Promoters: 3,
  Self: 4,
} as const

export const EventEnableDisableStatus = {
  Enable: 1,
  Disable: 2,
} as const

export const TicketStatus = {
  Enable: 1,
  Disable: 0,
} as const

export const TicketAvailability = {
  Available: 1,
  SoldOut: 0,
} as const

export const CustomerType = {
  WebsiteRegistration: 1,
  AdminPanelRegistration: 2,
} as const

export const BulkTicketStatus = {
  Booked: 1,
  Cancelled: 2,
} as const

export const OrganizerOwnerType = {
  Club: 1,
  EventCompany: 2,
} as const

export const CheckInStatus = {
  False: 0,
  True: 1,
} as const

export const TicketBookingSource = {
  Promoter: 0,
  Website: 1,
} as const

export const ReportType = {
  SummaryBooking: 1,
  TransactionBooking: 2,
} as const

export const BookingStatus = {
  Booked: 1,
  Cancelled: 2,
  InProcess: 3,
  Failed: 4,
} as const

export const EventDateTimeIsExpired = {
  Yes: 1,
  No: 0,
} as const

export const ScannerUserType = {
  Event: 1,
  Organizer: 2,
} as const

export const PromocodeCanbeUsedIn = {
  AllEvents: 1,
  SpecificEvents: 2,
} as const

export const PromocodeUnit = {
  Amount: 1,
  Percentage: 2,
} as const

export const PromocodeOneTimePerCustomerFlag = {
  Yes: 1,
  No: 0,
} as const

export const PromocodeValid = {
  Public: 1,
  Private: 2,
} as const

export const PromocodeStatus = {
  InActive: 0,
  Active: 1,
  Expired: 2,
} as const

export const DownloadExcelReport = {
  Yes: 1,
  No: 0,
} as const

export const defaultAccessLevels = {
  Events: "Events",
  Artist: "Artist",
  Categories: "Categories",
  Cities: "Cities",
  Booking: "Booking",
  Registration: "Registration",
  Tickets: "Tickets",
  Users: "Users",
  Venue: "Venue",
  Genre: "Genre",
  Reports: "Reports",
  "Tags&Rules": "Tags&Rules",
  "FAQ's": "FAQ's",
} as const

export const BulkCancelStatus = {
  Active: 1,
  Inactive: 2,
} as const

export const SendDefaultPasswordMail = {
  Yes: 1,
  No: 2,
} as const

export const BookingTypeOption = [
  {
    id: 1,
    value: 1,
    text: "Summary Booking ",
  },
  {
    id: 2,
    value: 2,
    text: "Transaction Booking",
  },
] as const

// Helper functions for role mapping
export function getNumericAdminRole(stringRole: string): number {
  switch (stringRole.toLowerCase()) {
    case "superadmin":
      return AdminRoles.SuperAdmin
    case "employee":
      return AdminRoles.Employee
    case "organizer":
      return AdminRoles.Organizer
    case "promoter":
      return AdminRoles.Promoter
    default:
      return AdminRoles.SuperAdmin // Default fallback
  }
}

export function getStringAdminRole(numericRole: number): string {
  switch (numericRole) {
    case AdminRoles.SuperAdmin:
      return "superadmin"
    case AdminRoles.Employee:
      return "employee"
    case AdminRoles.Organizer:
      return "organizer"
    case AdminRoles.Promoter:
      return "promoter"
    default:
      return "superadmin"
  }
}

// Helper functions for event status mapping
export function getNumericEventStatus(stringStatus: string): number {
  switch (stringStatus) {
    case "Draft":
      return EventStatus.Draft
    case "To Be Reviewed":
    case "InReview":
      return EventStatus.InReview
    case "Published":
      return EventStatus.Published
    case "Rejected":
    case "ReviewRejected":
      return EventStatus.ReviewRejected
    case "Completed":
      return EventStatus.Completed
    default:
      return EventStatus.Draft
  }
}

export function getStringEventStatus(numericStatus: number): string {
  switch (numericStatus) {
    case EventStatus.Draft:
      return "Draft"
    case EventStatus.InReview:
      return "To Be Reviewed"
    case EventStatus.Published:
      return "Published"
    case EventStatus.ReviewRejected:
      return "Rejected"
    case EventStatus.Completed:
      return "Completed"
    default:
      return "Draft"
  }
}

// Type definitions
export type AdminRoleType = keyof typeof AdminRoles
export type EventStatusType = keyof typeof EventStatus
export type EventTypeType = keyof typeof EventType
export type EventVisibilityType = keyof typeof EventVisibility
