const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

// AUTH ENDPOINTS
export const authEndpoints = {
  LOGIN_API: BASE_URL + "/superadmin/login",
  SUPER_ADMIN_DATA: BASE_URL + "/superadmin/getAll",
  FORGOT_PASSWORD_API: BASE_URL + "/getpasswordresetlink",
}

export const dashboard = {
  ADMIN_PROFILE_API: BASE_URL + "/superadmin/getById",
  ADMIN_PROFILE_UPDATE_API: BASE_URL + "/superadmin/updateProfile",
}

// Artist Creation
export const artistEndpoints = {
  ARTIST_CREATE: BASE_URL + "/artist/register",
  ALL_ARTIST_LIST: BASE_URL + "/artist/getall",
  ARTIST_GET_BY_ID: BASE_URL + "/artist/getbyId",
  ARTIST_UPLOAD_IMAGE: BASE_URL + "/artist/upload/image",
  ARTIST_IMAGE_REMOVE: BASE_URL + "/artist/deleteArtist/image",
  ARTIST_DATA_UPDATED: BASE_URL + "/artist/update/data",
  ARTIST_SEARCH_BY_NAME: BASE_URL + "/artist/getArtistDataBySearchKeyword",
  ARTIST_DELETE: BASE_URL + "/artist/delete",
  ARTIST_PAGINATED: BASE_URL + "/artist/getallpaginatedData",
}

// Categories API
export const categorieEndPoint = {
  CATEGORIE_CREATION_URL: BASE_URL + "/category/create",
  CATEGORIES_DATA_URL: BASE_URL + "/category/getall",
  CATEGORIES_PAGINATED_URL: BASE_URL + "/category/getallpaginatedData",
  CATEGORIES_DATA_BY_ID_URL: BASE_URL + "/category/getbyId",
  CATEGORIES_UPLOAD_IMAGE: BASE_URL + "/category/upload/image",
  CATEGORIES_IMAGE_REMOVE: BASE_URL + "/category/deleteCategory/image",
  CATEGORIES_DATA_UPDATED: BASE_URL + "/category/update/data",
  CATEGORIE_SEARCH_BY_NAME: BASE_URL + "/category/getCategoryDataBySearchKeyword",
  CATEGORIES_DELETE: BASE_URL + "/category/delete",
}

// Genre API
export const genreEndPoint = {
  GENRE_CREATION_URL: BASE_URL + "/genre/create",
  GENRE_DATA_URL: BASE_URL + "/genre/getall",
  GENRE_PAGINATED_URL: BASE_URL + "/genre/getallpaginatedData",
  GENRE_DATA_BY_ID_URL: BASE_URL + "/genre/getById",
  GENRE_UPLOAD_IMAGE: BASE_URL + "/genre/upload/image",
  GENRE_IMAGE_REMOVE: BASE_URL + "/genre/deleteGenre/image",
  GENRE_DATA_UPDATED: BASE_URL + "/genre/update/data",
  GENRE_SEARCH_BY_NAME: BASE_URL + "/genre/getGenreDataBySearchKeyword",
  GENRE_DELETE: BASE_URL + "/genre/delete",
}

// Venue API service
export const venueEndPoint = {
  VENUE_CREATION_URL: BASE_URL + "/venue/create",
  ALL_VENUE_DATA_LIST: BASE_URL + "/venue/getall",
  VENUES_PAGINATED_URL: BASE_URL + "/venue/getallpaginatedData", // Fixed to match swagger
  VENUE_GET_DATA_BY_ID: BASE_URL + "/venue/getById",
  VENUE_UPLOAD_IMAGE: BASE_URL + "/venue/upload/image",
  VENUE_IMAGE_REMOVE: BASE_URL + "/venue/deleteVenue/image",
  VENUE_DATA_UPDATED: BASE_URL + "/venue/update/data",
  VENUE_DELETE_URL: BASE_URL + "/venue/delete",
  VENUE_SEARCH_BY_NAME: BASE_URL + "/venue/getVenueDataBySearchKeyword",
  VENUE_SEARCH_PAGINATED: BASE_URL + "/venue/getPaginatedSearch",
  // Real API URLs based on your working endpoint
  VENUE_GET_ALL_PAGINATED_REAL: "https://node.eventingclub.in/venue/getAllPaginatedData",
}

// Event Tour API
export const eventTourEndPoint = {
  EVENT_TOUR_CREATION_URL: BASE_URL + "/eventtour/create",
  ALL_EVENT_TOURS_DATA_URL: BASE_URL + "/eventtour/getall",
  EVENT_TOURS_PAGINATED_URL: BASE_URL + "/eventtour/getallpaginatedData",
  EVENT_TOUR_DATA_BY_ID_URL: BASE_URL + "/eventtour/getbyId",
  EVENT_TOUR_DATA_UPDATED: BASE_URL + "/eventtour/update/data",
  EVENT_TOUR_SEARCH_BY_NAME: BASE_URL + "/eventtour/getEventTourDataBySearchKeyword",
  EVENT_TOUR_DELETE: BASE_URL + "/eventtour/delete",
  EVENT_TOUR_UPLOAD_IMAGE: BASE_URL + "/eventtour/upload/image",
  EVENT_TOUR_IMAGE_REMOVE: BASE_URL + "/eventtour/deleteEventTour/image",
  EVENT_TOUR_ENABLE: BASE_URL + "/eventtour/enable",
  EVENT_TOUR_DISABLE: BASE_URL + "/eventtour/disable",
}

// Organizer API Endpoints
export const organizerEndpoint = {
  REGISTER_ORGANIZER_URL: BASE_URL + "/organizer/register",
  GET_ALL_ORGANIZERS_DATA_URL: BASE_URL + "/organizer/getAll",
  GET_ALL_ORGANIZERS_PAGINATED_DATA_URL: BASE_URL + "/organizer/getallpaginatedData",
  GET_ORGANIZERS_PAGINATED_SEARCH_URL: BASE_URL + "/organizer/getPaginatedSearch",
  GET_ORGANIZER_DATA_BY_ID_URL: BASE_URL + "/organizer/getById",
  UPDATE_ORGANIZER_PROFILE: BASE_URL + "/organizer/updateProfile",
  UPDATE_ORGANIZER_DATA_URL: BASE_URL + "/events/organizer/update",
  DELETE_ORGANIZER_DATA_URL: BASE_URL + "/organizer/delete",
  PROFILE_CHANGE_PASSWORD: BASE_URL + "/organizer/changepassword",
  SEARCH_ORGANIZER_BY_ORGANIZER_NAME: BASE_URL + "/organizer/getOrganizerDataBySearchKeyword",
  ORGANIZER_LOGIN_API_URL: BASE_URL + "/organizer/login",
  CREATE_EVENT_BY_ORGANIZER: BASE_URL + "/events/organizer/create",
  GET_ALL_EVENTS_DATA_BY_ORGANIZER: BASE_URL + "/events/getAll",
  GET_ALL_PUBLISHED_EVENTS_DATA_BY_ORGANIZER: BASE_URL + "/events/getPublishEvents",
  GET_ALL_DRAFT_EVENTS_DATA_BY_ORGANIZER: BASE_URL + "/events/getDraftEvents",
  GET_ALL_TBREVIVE_EVENTS_DATA_BY_ORGANIZER: BASE_URL + "/events/getReviewEvents",
  GET_ALL_SUPER_ADMIN_SELF_CREATED_EVENTS_BY_ORGANIZER: BASE_URL + "/events/getSuperAdminSelfCreatedEvents",
  GET_ALL_REJECTED_EVENTS_DATA_BY_ORGANIZER: BASE_URL + "/events/getRejectedEvents",
  ORGANIZER_FORGOT_PASSWORD_SEND_EMAIL: BASE_URL + "/organizer/getpasswordresetlink",
  ORGANIZER_FORGOT_PASSWORD_RESET_PASSWORD: BASE_URL + "/organizer/resetPassword/",
  FILTER_EVENT_BOOKING_DATA_BY_NAME_AND_DATE_IN_PROMOTER:
    BASE_URL + "/eventticketsbooking/getEventSummaryBookingsDatabyFilterforSuperAdminOrganizer",
  GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENT_AND_ORGANIZER_ID:
    BASE_URL + "/eventticketsbooking/getEventTransactionBookingsDataforSuperAdminOrganizer",
  GET_ALL_SUMMARY_BOOKING_DATA_BY_EVENT_AND_ORGANIZER_ID:
    BASE_URL + "/eventticketsbooking/getAllLatestBookingsForSuperAdminOrganizer",
  GET_ALL_LATEST_BOOKINGS_FOR_SUPERADMIN_ORGANIZER:
    BASE_URL + "/eventticketsbooking/getAllLatestBookingsForSuperAdminOrganizer",
  DOWNLOAD_EXECEL_REPORT_OF_TRANSACTION_BOOKING_FOR_ORGANIZER_ID:
    BASE_URL + "/eventticketsbooking/getEventTransactionExcelReportforSuperAdminOrganizer",  DOWNLOAD_EXECEL_REPORT_OF_SUMMARY_BOOKING_FOR_ORGANIZER_ID:
    BASE_URL + "/eventticketsbooking/getEventSummaryExcelReportbyFilterforSuperAdminOrganizer",
  ORGANIZER_SALES_DATA_URL: BASE_URL + "/organizer/salesData",
  ORGANIZER_TOTAL_SALES_DATA_URL: BASE_URL + "/organizer/totalSalesData",
  ENABLE_ORGANIZER_URL: BASE_URL + "/organizer/enable",
  DISABLE_ORGANIZER_URL: BASE_URL + "/organizer/disable",
}

// Promoter API Endpoint
export const promoterEndpoint = {
  REGISTER_PROMOTER_URL: BASE_URL + "/promoter/register",
  GET_ALL_PROMOTER_DATA_URL: BASE_URL + "/promoter/getAll",
  GET_ALL_PROMOTER_DATA_PAGINATED_URL: BASE_URL + "/promoter/getallpaginatedData",
  GET_PROMOTER_DATA_BY_ID_URL: BASE_URL + "/promoter/getById",
  UPDATE_PROMOTER_DATA_URL: BASE_URL + "/promoter/updateProfile",
  ENABLE_PROMOTER_URL: BASE_URL + "/promoter/enable",
  DISABLE_PROMOTER_URL: BASE_URL + "/promoter/disable",
  SEARCH_PROMOTER_BY_PROMOTER_NAME: BASE_URL + "/promoter/getPromoterDataBySearchKeyword",
  SEARCH_PROMOTER_PAGINATED: BASE_URL + "/promoter/getPaginatedSearch",
  EVENT_REPORT_BY_DATE_AND_SEARCH: BASE_URL + "/events/getEventsByNameandDateTime",
}



export const promoterEndPointPannel = {
  LOGIN_PROMOTER_URL: BASE_URL + "/promoter/login",
  GET_ALL_EVENTS_DATA_BY_PROMOTER: BASE_URL + "/events/getAllEventsForPromotersDashboard",
  GET_EVENTS_BY_NAME_AND_DATETIME: BASE_URL + "/events/getEventsByNameandDateTime",
    GET_EVENTS_BY_NAME_AND_DATETIME_REPORTS: BASE_URL + "/events/getEventsByNameandDateTime",

  GET_ALL_EVENT_DATE_BY_EVENT_ID: BASE_URL + "/events/getbyId",
  GET_PROMOTER_TICKET_DATA_BY_EVENT_DATE: BASE_URL + "/eventstickets/getPromoterTicketsbyEventDate",
  BOOKING_TICKET_BY_PROMOTER: BASE_URL + "/eventticketsbooking/BookEventTicketsByPromoter",
  PROMOTER_FORGOT_PASSWORD_SEND_EMAIL: BASE_URL + "/promoter/getpasswordresetlink",
  PROMOTER_FORGOT_PASSWORD_RESET_PASSWORD: BASE_URL + "/promoter/resetPassword/",
  PROMOTER_CHANGE_PASSWORD_IN_PROFILE: BASE_URL + "/promoter/changepassword",
  GET_PROMOTER_PROFILE_DATA_BY_ID: BASE_URL + "/promoter/getById",
  UPDATE_PROMOTER_DATA_PROFILE_DATA: BASE_URL + "/promoter/updateProfile",
  GET_PROMOTER_LATEST_BOOKINGS: BASE_URL + "/eventticketsbooking/getPromoterLatestBookings",
  GET_ALL_PROMOTER_EVENT_BOOKING_DATA_BY_EVENT_ID:
    BASE_URL + "/eventticketsbooking/getEventSummaryBookingsDataByPromoterId",
  FILTER_EVENT_BOOKING_DATA_BY_NAME_AND_DATE_IN_PROMOTER:
    BASE_URL + "/eventticketsbooking/getEventSummaryBookingsDatabyFilter",
  GET_ALL_TRANSACTION_BOOKING_DATA_BY_EVENY_AND_PROMOTER_ID:
    BASE_URL + "/eventticketsbooking/getEventTransactionBookingsDataByPromoterId",
  DOWNLOAD_EXECEL_REPORT_OF_SUMMARY_BOOKING: BASE_URL + "/eventticketsbooking/getEventSummaryExcelReportbyFilter",
  DOWNLOAD_EXECEL_REPORT_OF_TRANSACTION_BOOKING:
    BASE_URL + "/eventticketsbooking/getEventTransactionExcelReportByPromoterId",
}
// Event API Endpoints
export const eventEndPoint = {
  CREATE_EVENT_BY_ADMIN: BASE_URL + "/events/superAdmin/create",
  GET_ALL_EVENTS_DATA_BY_ADMIN: BASE_URL + "/events/getAll",
  GET_ALL_EVENTS_PAGINATED: BASE_URL + "/events/getAllPaginated",
  GET_EVENTDATA_BY_ID: BASE_URL + "/events/getbyId",
  UPDATE_EVENT_CAROUSEL_IMAGE: BASE_URL + "/events/upload/carouselimg",
  DELETE_EVENT_CAROUSEL_IMAGE: BASE_URL + "/events/delete/carouselimg",
  UPDATE_EVENT_GALLERY_IMAGE: BASE_URL + "/events/upload/galleryimg",
  DELETE_EVENT_GALLERY_IMAGE: BASE_URL + "/events/delete/galleryimg",
  UPDATE_EVENT_DATE_AND_TIME: BASE_URL + "/events/update/DateTime",
  CREATE_NEW_EVENT_DATE_AND_TIME: BASE_URL + "/events/add/DateTime",
  EVENT_DELETE_DATE_AND_TIME: BASE_URL + "/events/delete/DateTime",
  EDIT_EVENT_FAQ_: BASE_URL + "/events/update/Faq",
  DELETE_EVENT_FAQ: BASE_URL + "/events/delete/Faq",
  CREATE_NEW_FAQ_FOR_EDIT_EVENT: BASE_URL + "/events/add/Faq",
  UPDATE_EVENT_DATA: BASE_URL + "/events/superAdmin/update",
  ADD_PROMOTER_IN_EVENT: BASE_URL + "/events/addpromoter",
  GET_ALL_PUBLISHED_EVENTS_DATA: BASE_URL + "/events/getPublishEvents",
  GET_ALL_DRAFT_EVENTS_DATA: BASE_URL + "/events/getDraftEvents",
  GET_ALL_TBREVIVE_EVENTS_DATA: BASE_URL + "/events/getReviewEvents",  GET_ALL_SUPER_ADMIN_SELF_CREATED_EVENTS: BASE_URL + "/events/getSuperAdminSelfCreatedEvents",
  GET_ALL_REJECTED_EVENTS_DATA: BASE_URL + "/events/getRejectedEvents",
  ENABLE_EVENT: BASE_URL + "/events/enableEvent",
  DISABLE_EVENT: BASE_URL + "/events/disableEvent",
}

// Ticket Management API Endpoints
export const ticketEndPoint = {
  // Normal Tickets
  CREATE_NORMAL_TICKET: BASE_URL + "/eventstickets/create",
  GET_ALL_TICKETS_BY_EVENT: BASE_URL + "/eventstickets/getTicketsByEventId",
  GET_ALL_EVENT_TICKETS: BASE_URL + "/eventstickets/getAllEventTickets",
  GET_TICKET_BY_ID: BASE_URL + "/eventstickets/getbyId",  UPDATE_TICKET: BASE_URL + "/eventstickets/update",
  DELETE_TICKET: BASE_URL + "/eventstickets/delete",
  ENABLE_TICKET: BASE_URL + "/eventstickets/enable",
  DISABLE_TICKET: BASE_URL + "/eventstickets/disable",
  UPDATE_AVAILABILITY_TO_SOLD_OUT: BASE_URL + "/eventstickets/updateAvailabilityToSoldOut",
  UPDATE_AVAILABILITY_TO_AVAILABLE: BASE_URL + "/eventstickets/updateAvailabilityToAvailable",
  GET_TICKETS_PAGINATED: BASE_URL + "/eventstickets/getallpaginatedData",
  
  // Bulk Tickets
  CREATE_BULK_TICKET: BASE_URL + "/eventbulktickets/createBulkTicketForEvent",
  GET_ALL_BULK_TICKETS_BY_EVENT: BASE_URL + "/eventbulktickets/getBulkTicketsOfEvent",
  GET_BULK_TICKET_BY_ID: BASE_URL + "/eventsbulktickets/getbyId",
  UPDATE_BULK_TICKET: BASE_URL + "/eventsbulktickets/update",
  DELETE_BULK_TICKET: BASE_URL + "/eventsbulktickets/delete",
  ENABLE_BULK_TICKET: BASE_URL + "/eventsbulktickets/enable",
  DISABLE_BULK_TICKET: BASE_URL + "/eventsbulktickets/disable",
  CANCEL_BULK_TICKET: BASE_URL + "/eventbulktickets/cancelBukTicket",
  DOWNLOAD_BULK_TICKET_REPORT: BASE_URL + "/eventbulktickets/downloadBulkTicketReport",
  GET_BULK_TICKETS_PAGINATED: BASE_URL + "/eventsbulktickets/getallpaginatedData",
  
  // Common ticket operations
  GET_PROMOTER_TICKET_DATA_BY_EVENT_DATE: BASE_URL + "/eventstickets/getPromoterTicketsbyEventDate",
  SEARCH_TICKETS: BASE_URL + "/eventstickets/searchTickets",
  SEARCH_BULK_TICKETS: BASE_URL + "/eventsbulktickets/searchBulkTickets",
}

// Customer API
export const websiteCustomer = {
  CREATE_CUSTOMER_WEBSITE: BASE_URL + "/websitecustomers/customerRegistrationBySuperAdmin",
  GET_ALL_CUSTOMER_DATA: BASE_URL + "/websitecustomers/getall",
  GET_ALL_PAGINATED_CUSTOMERS_DATA: BASE_URL + "/websitecustomers/getAllPaginatedCustomersData",
  CUSTOMER_SEARCH_PAGINATED: BASE_URL + "/websitecustomers/getCustomerDataBySearchKeywordPaginated",
  GET_CUSTOMER_BOOKINGS: BASE_URL + "/eventticketsbooking/getCustomerBookingsById",
}

// Promocode API
export const promocodeEndPoint = {
  GET_ALL_PAGINATED_PROMOCODES_DATA: BASE_URL + "/promocode/getallpaginatedData",
}

// Banner API
export const bannerEndpoint = {
  GET_ALL_BANNERS: BASE_URL + "/homepagebannerslider/getAll",
  CREATE_BANNER: BASE_URL + "/homepagebannerslider/create",
  GET_BY_ID: BASE_URL + "/homepagebannerslider/getById",
  UPDATE_BANNER: BASE_URL + "/homepagebannerslider/updatebyId",
  DELETE_BANNER: BASE_URL + "/homepagebannerslider/deleteById",
}

// City Data
export const getallcityDataEndPoint = {
  GET_ALL_EVENT_CITY_DATA: BASE_URL + "/events/getAllEventCities",
}

// Scanner Users Endpoints
export const scannerUserEndpoint = {
  GET_ALL: BASE_URL + "/scanneruser/getAll",
  REGISTER: BASE_URL + "/scanneruser/register",
  GET_BY_ID: BASE_URL + "/scanneruser/getById",
  UPDATE_DETAILS: BASE_URL + "/scanneruser/updateScannerUserDetailsbyId",
  ENABLE: BASE_URL + "/scanneruser/enable",
  DISABLE: BASE_URL + "/scanneruser/disable",
  UPDATE_PASSWORD: BASE_URL + "/scanneruser/updatePassword",
}

// Leads Endpoints
export const leadsEndpoint = {
  GET_ALL_PAGINATED: BASE_URL + "/webiste/leads/getAllPaginated",
  CREATE: BASE_URL + "/webiste/leads/create",
  UPDATE: BASE_URL + "/webiste/leads/update",
  DELETE: BASE_URL + "/webiste/leads/delete",
  GET_BY_ID: BASE_URL + "/webiste/leads/getById",
}

// Debug function to log all endpoints
export const debugEndpoints = () => {  console.log("All API Endpoints:", {
    authEndpoints,
    dashboard,
    artistEndpoints,
    categorieEndPoint,
    genreEndPoint,
    venueEndPoint,
    eventTourEndPoint,
    organizerEndpoint,
    promoterEndpoint,
    eventEndPoint,
    promoterEndPointPannel,
    websiteCustomer,
    promocodeEndPoint,
    bannerEndpoint,
    getallcityDataEndPoint,
    scannerUserEndpoint,
    leadsEndpoint,
  })
}