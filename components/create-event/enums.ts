// Event Format Enum
export const EventFormat = {
  EventTour: 1,
  StandardEvent: 0,
} as const

// Event Type Enum
export const EventType = {
  Booking: 1,
  Registration: 2,
  WhatsApp: 3,
} as const

// Event Status Enum
export const EventStatus = {
  
  Draft: 1,
  InReview: 2,
  Published: 3,
  ReviewRejected: 4,
  Completed: 5,
} as const

// Convenience Fee Unit Enum
export const ConvinienceFeeUnit = {
  Percentage: 1,
  Fixed: 2,
} as const

// Event Venue To Be Announced Enum
export const EventVenueTobeAnnounced = {
  No: 0,
  Yes: 1,
} as const

// Is Venue Available Enum
export const IsVenueAvailable = {
  No: 0,
  Yes: 1,
} as const

// Is Online Event Enum
export const IsOnlineEvent = {
  No: 0,
  Yes: 1,
} as const
