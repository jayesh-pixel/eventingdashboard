import type { Event, Artist, Category, Genre, Venue, Booking } from "./types"

// Mock Events
export const mockEvents: Event[] = [
  {
    _id: "evt001",
    eventName: "Summer Music Festival",
    eventDescription: "A three-day music festival featuring top artists",
    eventStatus: "Published",
    eventType: "Multi-Day",
    organizerId: "org001",
    organizerName: "MusicFest Inc.",
    venueId: "ven001",
    venueName: "Central Park",
    city: "New York",
    eventStartDate: "2025-07-15T10:00:00.000Z",
    eventEndDate: "2025-07-17T22:00:00.000Z",
    createdAt: "2025-01-15T08:30:00.000Z",
    updatedAt: "2025-01-20T14:45:00.000Z",
  },
  {
    _id: "evt002",
    eventName: "Tech Conference 2025",
    eventDescription: "Annual technology conference with industry leaders",
    eventStatus: "Draft",
    eventType: "Single-Day",
    organizerId: "org002",
    organizerName: "TechMinds LLC",
    venueId: "ven002",
    venueName: "Convention Center",
    city: "San Francisco",
    eventStartDate: "2025-09-10T09:00:00.000Z",
    eventEndDate: "2025-09-10T18:00:00.000Z",
    createdAt: "2025-02-05T10:15:00.000Z",
    updatedAt: "2025-02-10T16:30:00.000Z",
  },
  {
    _id: "evt003",
    eventName: "Art Expo Downtown",
    eventDescription: "Exhibition featuring local and international artists",
    eventStatus: "To Be Reviewed",
    eventType: "Single-Day",
    organizerId: "org003",
    organizerName: "ArtWorld Org",
    venueId: "ven003",
    venueName: "City Gallery",
    city: "Los Angeles",
    eventStartDate: "2025-08-01T11:00:00.000Z",
    eventEndDate: "2025-08-01T20:00:00.000Z",
    createdAt: "2025-03-12T09:45:00.000Z",
    updatedAt: "2025-03-15T11:20:00.000Z",
  },
  {
    _id: "evt004",
    eventName: "Charity Gala Night",
    eventDescription: "Annual fundraising event for local charities",
    eventStatus: "Rejected",
    eventType: "Single-Day",
    organizerId: "org004",
    organizerName: "Hope Foundation",
    venueId: "ven004",
    venueName: "Grand Ballroom",
    city: "Chicago",
    eventStartDate: "2025-10-05T18:00:00.000Z",
    eventEndDate: "2025-10-05T23:00:00.000Z",
    createdAt: "2025-04-20T14:10:00.000Z",
    updatedAt: "2025-04-25T09:30:00.000Z",
  },
  {
    _id: "evt005",
    eventName: "Food & Wine Fair",
    eventDescription: "Culinary event featuring top chefs and wineries",
    eventStatus: "Published",
    eventType: "Multi-Day",
    organizerId: "org005",
    organizerName: "Gourmet Events",
    venueId: "ven005",
    venueName: "Exhibition Hall",
    city: "Miami",
    eventStartDate: "2025-11-20T12:00:00.000Z",
    eventEndDate: "2025-11-22T22:00:00.000Z",
    createdAt: "2025-05-15T11:25:00.000Z",
    updatedAt: "2025-05-20T16:40:00.000Z",
  },
]

// Mock Artists
export const mockArtists: Artist[] = [
  {
    _id: "art001",
    Name: "DJ Sparkle",
    Description: "Electronic music producer and DJ",
    createdAt: "2025-01-10T08:30:00.000Z",
    status: 1,
  },
  {
    _id: "art002",
    Name: "The Rockers",
    Description: "Classic rock band with over 20 years of experience",
    createdAt: "2025-02-05T10:15:00.000Z",
    status: 1,
  },  {
    _id: "art003",
    Name: "Smooth Jazz Trio",
    Description: "Award-winning jazz ensemble",
    createdAt: "2025-03-12T09:45:00.000Z",
    status: 1,
  },
]

// Mock Categories
export const mockCategories: Category[] = [
  {
    _id: "cat001",
    categoryName: "Music",
    categoryDescription: "Music events including concerts, festivals, and performances",
    categoryImage: "/placeholder.svg?height=200&width=200",
    createdAt: "2025-01-05T08:30:00.000Z",
    updatedAt: "2025-01-10T14:45:00.000Z",
  },
  {
    _id: "cat002",
    categoryName: "Technology",
    categoryDescription: "Tech events including conferences, workshops, and hackathons",
    categoryImage: "/placeholder.svg?height=200&width=200",
    createdAt: "2025-02-01T10:15:00.000Z",
    updatedAt: "2025-02-05T16:30:00.000Z",
  },
  {
    _id: "cat003",
    categoryName: "Art & Culture",
    categoryDescription: "Art exhibitions, cultural festivals, and creative workshops",
    categoryImage: "/placeholder.svg?height=200&width=200",
    createdAt: "2025-03-10T09:45:00.000Z",
    updatedAt: "2025-03-12T11:20:00.000Z",
  },
]

// Mock Genres
export const mockGenres: Genre[] = [
  {
    _id: "gen001",
    genreName: "Rock",
    genreDescription: "Rock music events and concerts",
    genreImage: "/placeholder.svg?height=200&width=200",
    createdAt: "2025-01-03T08:30:00.000Z",
    updatedAt: "2025-01-08T14:45:00.000Z",
  },
  {
    _id: "gen002",
    genreName: "EDM",
    genreDescription: "Electronic dance music events and festivals",
    genreImage: "/placeholder.svg?height=200&width=200",
    createdAt: "2025-01-25T10:15:00.000Z",
    updatedAt: "2025-01-30T16:30:00.000Z",
  },
  {
    _id: "gen003",
    genreName: "Jazz",
    genreDescription: "Jazz music performances and festivals",
    genreImage: "/placeholder.svg?height=200&width=200",
    createdAt: "2025-02-15T09:45:00.000Z",
    updatedAt: "2025-02-20T11:20:00.000Z",
  },
]

// Mock Venues
export const mockVenues: Venue[] = [
  {
    _id: "ven001",
    venueName: "Central Park",
    venueDescription: "Large outdoor venue in the heart of the city",
    venueAddress: "Central Park West",
    city: "New York",
    state: "NY",
    country: "USA",
    venueCapacity: 10000,
    venueImage: "/placeholder.svg?height=200&width=200",
    createdAt: "2025-01-02T08:30:00.000Z",
    updatedAt: "2025-01-07T14:45:00.000Z",
  },
  {
    _id: "ven002",
    venueName: "Convention Center",
    venueDescription: "Modern convention center with multiple halls",
    venueAddress: "123 Market Street",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    venueCapacity: 5000,
    venueImage: "/placeholder.svg?height=200&width=200",
    createdAt: "2025-01-20T10:15:00.000Z",
    updatedAt: "2025-01-25T16:30:00.000Z",
  },
  {
    _id: "ven003",
    venueName: "City Gallery",
    venueDescription: "Contemporary art gallery in downtown",
    venueAddress: "456 Arts Avenue",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    venueCapacity: 1000,
    venueImage: "/placeholder.svg?height=200&width=200",
    createdAt: "2025-02-10T09:45:00.000Z",
    updatedAt: "2025-02-15T11:20:00.000Z",
  },
]

// Mock Organizers
export const mockOrganizers = [
  {
    _id: "org001",
    organizerName: "MusicFest Inc.",
    email: "contact@musicfest.com",
    phone: "+1-555-0100",
    status: "Active" as const,
    totalEvents: 15,
    totalSales: 125000,
    convenienceFeeCharged: 12500,
    pendingAmount: 25000,
    createdAt: "2024-01-10T00:00:00.000Z",
  },
  {
    _id: "org002",
    organizerName: "TechMinds LLC",
    email: "info@techminds.com",
    phone: "+1-555-0101",
    status: "Active" as const,
    totalEvents: 8,
    totalSales: 85000,
    convenienceFeeCharged: 8500,
    pendingAmount: 15000,
    createdAt: "2024-02-15T00:00:00.000Z",
  },
  {
    _id: "org003",
    organizerName: "ArtWorld Org",
    email: "admin@artworld.org",
    phone: "+1-555-0102",
    status: "Inactive" as const,
    totalEvents: 5,
    totalSales: 30000,
    convenienceFeeCharged: 3000,
    pendingAmount: 5000,
    createdAt: "2024-03-20T00:00:00.000Z",
  },
  {
    _id: "org004",
    organizerName: "Event Masters Corp",
    email: "hello@eventmasters.com",
    phone: "+1-555-0103",
    status: "Active" as const,
    totalEvents: 22,
    totalSales: 185000,
    convenienceFeeCharged: 18500,
    pendingAmount: 35000,
    createdAt: "2024-01-05T00:00:00.000Z",
  },
  {
    _id: "org005",
    organizerName: "Creative Events Ltd",
    email: "team@creativeevents.com",
    phone: "+1-555-0104",
    status: "Disabled" as const,
    totalEvents: 3,
    totalSales: 15000,
    convenienceFeeCharged: 1500,
    pendingAmount: 2500,
    createdAt: "2024-04-01T00:00:00.000Z",
  },
]

// Mock Bookings
export const mockBookings: Booking[] = [
  {
    _id: "bkg001",
    eventId: "evt001",
    eventName: "Summer Music Festival",
    customerId: "cus001",
    customerName: "Alice Smith",
    customerEmail: "alice@example.com",
    bookingChannel: "Online",
    bookingStatus: "Confirmed",
    totalAmount: 150,
    bookingDate: "2025-06-01T10:30:00.000Z",
    createdAt: "2025-06-01T10:30:00.000Z",
    updatedAt: "2025-06-01T10:30:00.000Z",
  },
  {
    _id: "bkg002",
    eventId: "evt002",
    eventName: "Tech Conference 2025",
    customerId: "cus002",
    customerName: "Bob Johnson",
    customerEmail: "bob@example.com",
    promoterId: "prm001",
    promoterName: "PromoKing",
    bookingChannel: "Promoter",
    bookingStatus: "Pending",
    totalAmount: 299,
    bookingDate: "2025-06-05T14:45:00.000Z",
    createdAt: "2025-06-05T14:45:00.000Z",
    updatedAt: "2025-06-05T14:45:00.000Z",
  },
  {
    _id: "bkg003",
    eventId: "evt003",
    eventName: "Art Expo Downtown",
    customerId: "cus003",
    customerName: "Carol Williams",
    customerEmail: "carol@example.com",
    bookingChannel: "Bulk",
    bookingStatus: "Confirmed",
    totalAmount: 50,
    bookingDate: "2025-06-10T09:15:00.000Z",
    createdAt: "2025-06-10T09:15:00.000Z",
    updatedAt: "2025-06-10T09:15:00.000Z",
  },
]

// Mock Promoters
export const mockPromoters = [
  {
    _id: "prm001",
    promoterName: "PromoKing",
    email: "contact@promoking.com",
    phone: "+1-555-0200",
    status: "Active" as const,
    commissionRate: 15,
    totalSalesGenerated: 75000,
    createdAt: "2024-01-20T00:00:00.000Z",
  },
  {
    _id: "prm002",
    promoterName: "TicketBoost",
    email: "support@ticketboost.net",
    phone: "+1-555-0201",
    status: "Active" as const,
    commissionRate: 12,
    totalSalesGenerated: 52000,
    createdAt: "2024-02-25T00:00:00.000Z",
  },
  {
    _id: "prm003",
    promoterName: "EventHype",
    email: "info@eventhype.io",
    phone: "+1-555-0202",
    status: "Inactive" as const,
    commissionRate: 10,
    totalSalesGenerated: 21000,
    createdAt: "2024-03-10T00:00:00.000Z",
  },
  {
    _id: "prm004",
    promoterName: "EventMaster Pro",
    email: "admin@eventmaster.pro",
    phone: "+1-555-0203",
    status: "Active" as const,
    commissionRate: 18,
    totalSalesGenerated: 95000,
    createdAt: "2024-04-05T00:00:00.000Z",
  },
  {
    _id: "prm005",
    promoterName: "TicketGuru",
    email: "info@ticketguru.com",
    phone: "+1-555-0204",
    status: "Disabled" as const,
    commissionRate: 8,
    totalSalesGenerated: 15000,
    createdAt: "2024-05-15T00:00:00.000Z",
  },
]

// Mock data by endpoint
export const mockDataByEndpoint: Record<string, any> = {
  // Events endpoints
  "/events/getAll": mockEvents,
  "/events/getAllPaginated": {
    totalPages: 1,
    currentPage: 1,
    totalEvents: mockEvents.length,
    EventsData: mockEvents
  },
  "/events/getPublishEvents": mockEvents.filter((event) => event.eventStatus === "Published"),
  "/events/getDraftEvents": mockEvents.filter((event) => event.eventStatus === "Draft"),
  "/events/getReviewEvents": mockEvents.filter((event) => event.eventStatus === "To Be Reviewed"),
  "/events/getRejectedEvents": mockEvents.filter((event) => event.eventStatus === "Rejected"),

  // Artists endpoints
  "/artist/getall": mockArtists,

  // Categories endpoints
  "/category/getall": mockCategories,

  // Genres endpoints
  "/genre/getall": mockGenres,

  // Venues endpoints
  "/venue/getall": mockVenues,

  // Organizers endpoints
  "/organizer/getAll": mockOrganizers,
  "/organizer/getallpaginatedData": mockOrganizers,

  // Promoters endpoints
  "/promoter/getAll": mockPromoters,
  "/promoter/getallpaginatedData": mockPromoters,

  // Bookings endpoints
  "/eventticketsbooking/getPromoterLatestBookings": mockBookings,
  "/eventticketsbooking/getEventSummaryBookingsDataforSuperAdminOrganizer": mockBookings,
}

// Helper function to get mock data for an endpoint
export function getMockData(endpoint: string) {
  // Extract the path without query parameters
  const path = endpoint.split("?")[0]

  // Try to find an exact match
  if (mockDataByEndpoint[path]) {
    return mockDataByEndpoint[path]
  }

  // Try to find a partial match (endpoint ends with the key)
  for (const key in mockDataByEndpoint) {
    if (path.endsWith(key)) {
      return mockDataByEndpoint[key]
    }
  }

  // Default fallback
  return []
}
