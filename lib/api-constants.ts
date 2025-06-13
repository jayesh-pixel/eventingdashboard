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

export const isEventFeatured = {
  true: 1,
  false: 0,
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
} as const

export const TicketStatus = {
  Enable: 1,
  Disable: 2,
} as const

export const TicketAvailability = {
  Available: 1,
  SoldOut: 2,
} as const

export const ticketEnabledDisabledStatus = {
  Enable: 1,
  Disable: 0,
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
