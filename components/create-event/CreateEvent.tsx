"use client"

import * as React from "react"
import { Formik, Form, Field, FieldArray, FormikProps } from "formik"
import * as Yup from "yup"
import Select from "react-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Select as UISelect, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import type { UserRole } from "@/lib/navigation"
import { ReactQuillWrapper } from "./ReactQuillWrapper"
import { 
  createVenueOption, 
  createOrganizerOption, 
  createCategoryOption, 
  createArtistOption, 
  createGenreOption, 
  createEventTourOption,
  indianLanguages,
  yearsOptions 
} from "./modal-data"
import { 
  EventStatus, 
  ConvinienceFeeUnit 
} from "./enums"
import { 
  Upload, 
  X, 
  Info, 
  Trash2, 
  Edit, 
  Plus,
  ImagePlus,
  AlertCircle 
} from "lucide-react"

// Remove the old ReactQuill import as we're using the wrapper

interface CreateEventProps {
  eventSelectionFlag: number | null
  setEventCreationModal: (value: boolean) => void
  role: UserRole
}

interface SelectOption {
  value: string
  label: string
}

interface EventDateTime {
  EventStartDate: string
  EventStartTime: string
  EventEndDate: string
  EventEndTime: string
}

interface FAQ {
  Question: string
  Answer: string
}

interface EventFormValues {
  // Basic Info
  eventname: string
  eventDescription: string
  eventTermsandConditions: string
  eventVideoUrl: string
  
  // Configuration
  eventVisibility: string
  eventType: string
  bookingphonenumber: string
  whatsappnumber: string
  
  // Location
  locationType: string
  venue_id: string
  onlineEventUrl: string
  stateIsoCode: string
  stateName: string
  cityIsoCode: string
  cityName: string
  
  // Relationships
  organizers: SelectOption[]
  categories: SelectOption[]
  artists: SelectOption[]
  genres: SelectOption[]
  languages: SelectOption[]
  
  // Tour
  eventTour_id: string
  
  // Settings
  ageRestriction: string
  isFeatured: boolean
  feeunit: number
  feevalue: number
  
  // Events and FAQs
  events: EventDateTime[]
  faqs: FAQ[]
}

// Validation Schema
const eventValidationSchema = Yup.object().shape({
  eventname: Yup.string()
    .required("Event name is required")
    .min(3, "Event name must be at least 3 characters"),
  
  eventDescription: Yup.string()
    .required("Event description is required")
    .min(10, "Event description must be at least 10 characters"),
  
  eventTermsandConditions: Yup.string()
    .required("Terms and conditions are required")
    .min(10, "Terms and conditions must be at least 10 characters"),
  
  eventVisibility: Yup.string()
    .required("Event visibility is required"),
  
  eventType: Yup.string()
    .required("Event type is required"),
  
  locationType: Yup.string()
    .required("Location type is required"),
  
  venue_id: Yup.string()
    .when("locationType", {
      is: "venue",
      then: (schema) => schema.required("Venue selection is required"),
      otherwise: (schema) => schema.notRequired()
    }),
  
  onlineEventUrl: Yup.string()
    .when("locationType", {
      is: "online", 
      then: (schema) => schema.required("Online event URL is required").url("Must be a valid URL"),
      otherwise: (schema) => schema.notRequired()
    }),
  
  stateIsoCode: Yup.string()
    .when("locationType", {
      is: "tba",
      then: (schema) => schema.required("State is required for TBA events"),
      otherwise: (schema) => schema.notRequired()
    }),
  
  cityIsoCode: Yup.string()
    .when("locationType", {
      is: "tba",
      then: (schema) => schema.required("City is required for TBA events"),
      otherwise: (schema) => schema.notRequired()
    }),
  
  bookingphonenumber: Yup.string()
    .when("eventType", {
      is: "1",
      then: (schema) => schema.required("Booking phone number is required").matches(/^[0-9]{10}$/, "Phone number must be 10 digits"),
      otherwise: (schema) => schema.notRequired()
    }),
  
  whatsappnumber: Yup.string()
    .when("eventType", {
      is: "3",
      then: (schema) => schema.required("WhatsApp number is required").matches(/^[0-9]{10}$/, "Phone number must be 10 digits"),
      otherwise: (schema) => schema.notRequired()
    }),
  
  organizers: Yup.array()
    .min(1, "At least one organizer is required"),
  
  categories: Yup.array()
    .min(1, "At least one category is required"),
  
  artists: Yup.array()
    .min(1, "At least one artist is required"),
  
  genres: Yup.array()
    .min(1, "At least one genre is required"),
  
  languages: Yup.array()
    .min(1, "At least one language is required"),
  
  ageRestriction: Yup.string()
    .required("Age restriction is required"),
  
  feevalue: Yup.number()
    .required("Convenience fee value is required")
    .min(0, "Fee value cannot be negative"),
  
  events: Yup.array()
    .min(1, "At least one event date/time is required"),
  
  eventTour_id: Yup.string()
    .when([], {
      is: () => false, // We'll handle this conditionally in component
      then: (schema) => schema.required("Tour selection is required"),
      otherwise: (schema) => schema.notRequired()
    })
})

export default function CreateEvent({ 
  eventSelectionFlag, 
  setEventCreationModal,
  role 
}: CreateEventProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  // State for external data
  const [venues, setVenues] = React.useState<SelectOption[]>([])
  const [organizers, setOrganizers] = React.useState<SelectOption[]>([])
  const [categories, setCategories] = React.useState<SelectOption[]>([])
  const [artists, setArtists] = React.useState<SelectOption[]>([])
  const [genres, setGenres] = React.useState<SelectOption[]>([])
  const [eventTours, setEventTours] = React.useState<SelectOption[]>([])
  const [states, setStates] = React.useState<SelectOption[]>([])
  const [cities, setCities] = React.useState<SelectOption[]>([])

  // Loading states
  const [loadingVenues, setLoadingVenues] = React.useState(false)
  const [loadingOrganizers, setLoadingOrganizers] = React.useState(false)
  const [loadingCategories, setLoadingCategories] = React.useState(false)
  const [loadingArtists, setLoadingArtists] = React.useState(false)
  const [loadingGenres, setLoadingGenres] = React.useState(false)
  const [loadingEventTours, setLoadingEventTours] = React.useState(false)
  const [loadingStates, setLoadingStates] = React.useState(false)
  const [loadingCities, setLoadingCities] = React.useState(false)

  // Image state
  const [carouselImages, setCarouselImages] = React.useState<File[]>([])
  const [carouselImagePreviews, setCarouselImagePreviews] = React.useState<string[]>([])
  const [galleryImages, setGalleryImages] = React.useState<File[]>([])
  const [galleryImagePreviews, setGalleryImagePreviews] = React.useState<string[]>([])
  const [venueLayoutImage, setVenueLayoutImage] = React.useState<File | null>(null)
  const [venueLayoutPreview, setVenueLayoutPreview] = React.useState<string>("")
  // Modal states
  const [showCreateVenueModal, setShowCreateVenueModal] = React.useState(false)
  const [showCreateOrganizerModal, setShowCreateOrganizerModal] = React.useState(false)
  const [showCreateCategoryModal, setShowCreateCategoryModal] = React.useState(false)
  const [showCreateArtistModal, setShowCreateArtistModal] = React.useState(false)
  const [showCreateGenreModal, setShowCreateGenreModal] = React.useState(false)
  const [showCreateEventTourModal, setShowCreateEventTourModal] = React.useState(false)

  // Store setFieldValue reference for modal usage
  const [formikSetFieldValue, setFormikSetFieldValue] = React.useState<((field: string, value: any) => void) | null>(null)

  // Date/time handling state
  const [tempEventDate, setTempEventDate] = React.useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: ""
  })

  // FAQ handling state
  const [tempFAQ, setTempFAQ] = React.useState({
    Question: "",
    Answer: ""
  })

  // Today's date for validation
  const formattedDate = React.useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  // Initial form values
  const initialValues: EventFormValues = {
    eventname: "",
    eventDescription: "",
    eventTermsandConditions: "",
    eventVideoUrl: "",
    eventVisibility: "",
    eventType: "",
    bookingphonenumber: "",
    whatsappnumber: "",
    locationType: "",
    venue_id: "",
    onlineEventUrl: "",
    stateIsoCode: "",
    stateName: "",
    cityIsoCode: "",
    cityName: "",
    organizers: [],
    categories: [],
    artists: [],
    genres: [],
    languages: [],
    eventTour_id: "",
    ageRestriction: "",
    isFeatured: false,
    feeunit: ConvinienceFeeUnit.Percentage,
    feevalue: 0,
    events: [],
    faqs: []
  }
  // API utility function
  const getApiEndpoint = (endpoint: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    const prefix = role === "superadmin" ? "" : "/api/organizer"
    return `${baseUrl}${prefix}${endpoint}`
  }

  // Fetch all required data on component mount
  React.useEffect(() => {
    fetchVenues()
    fetchOrganizers()
    fetchCategories()
    fetchArtists()
    fetchGenres()
    fetchStates()
    if (eventSelectionFlag === 1) {
      fetchEventTours()
    }
  }, [eventSelectionFlag, role])
  // API fetch functions
  const fetchVenues = async () => {
    try {
      setLoadingVenues(true)
      const authToken = getValidToken()
      if (!authToken) return

      const response = await fetch(getApiEndpoint("/venue/getall"), {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Venues data:", data) // Debug log
        const venueOptions = data.data.map((venue: any) => ({
          value: venue._id || venue.id,
          label: venue.Name || "Unnamed Venue"
        }))
        console.log("Venue options:", venueOptions) // Debug log
        setVenues([...venueOptions, createVenueOption])
      } else {
        console.error("Failed to fetch venues:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error fetching venues:", error)
    } finally {
      setLoadingVenues(false)
    }
  }
  const fetchOrganizers = async () => {
    try {
      setLoadingOrganizers(true)
      const authToken = getValidToken()
      if (!authToken) return

      const response = await fetch(getApiEndpoint("/organizer/getAll"), {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Organizers data:", data) // Debug log
        const organizerOptions = data.data.map((organizer: any) => {
          const label =  organizer.Username || organizer.FullName || organizer.Name || "Unnamed Organizer"
          console.log(`Organizer: ${organizer._id}, CompanyName: ${organizer.CompanyName}, Username: ${organizer.Username}, FullName: ${organizer.FullName}, Selected Label: ${label}`)
          return {
            value: organizer._id || organizer.id,
            label: label
          }
        })
        console.log("Organizer options:", organizerOptions) // Debug log
        setOrganizers([...organizerOptions, createOrganizerOption])
      }
    } catch (error) {
      console.error("Error fetching organizers:", error)
    } finally {
      setLoadingOrganizers(false)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const authToken = getValidToken()
      if (!authToken) return

      const response = await fetch(getApiEndpoint("/category/getall"), {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        const categoryOptions = data.data.map((category: any) => ({
          value: category._id || category.id,
          label: category.Name || "Unnamed Category"
        }))
        setCategories([...categoryOptions, createCategoryOption])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchArtists = async () => {
    try {
      setLoadingArtists(true)
      const authToken = getValidToken()
      if (!authToken) return

      const response = await fetch(getApiEndpoint("/artist/getall"), {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        const artistOptions = data.data.map((artist: any) => ({
          value: artist._id || artist.id,
          label: artist.Name || "Unnamed Artist"
        }))
        setArtists([...artistOptions, createArtistOption])
      }
    } catch (error) {
      console.error("Error fetching artists:", error)
    } finally {
      setLoadingArtists(false)
    }
  }

  const fetchGenres = async () => {
    try {
      setLoadingGenres(true)
      const authToken = getValidToken()
      if (!authToken) return

      const response = await fetch(getApiEndpoint("/genre/getall"), {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        const genreOptions = data.data.map((genre: any) => ({
          value: genre._id || genre.id,
          label: genre.Name || "Unnamed Genre"
        }))
        setGenres([...genreOptions, createGenreOption])
      }
    } catch (error) {
      console.error("Error fetching genres:", error)
    } finally {
      setLoadingGenres(false)
    }
  }

  const fetchEventTours = async () => {
    try {
      setLoadingEventTours(true)
      const authToken = getValidToken()
      if (!authToken) return

      const response = await fetch(getApiEndpoint("/eventtour/getall"), {
        headers: { Authorization: `Bearer ${authToken}` }
      })

      if (response.ok) {
        const data = await response.json()
        const tourOptions = data.data.map((tour: any) => ({
          value: tour._id || tour.id,
          label: tour.Name || "Unnamed Tour"
        }))
        setEventTours([...tourOptions, createEventTourOption])
      }
    } catch (error) {
      console.error("Error fetching event tours:", error)
    } finally {
      setLoadingEventTours(false)
    }
  }

  const fetchStates = async () => {
    try {
      setLoadingStates(true)
      // This would typically be a static list or API call
      // For now, using common Indian states
      const indianStates = [
        { value: "MH", label: "Maharashtra" },
        { value: "KA", label: "Karnataka" },
        { value: "TN", label: "Tamil Nadu" },
        { value: "DL", label: "Delhi" },
        { value: "GJ", label: "Gujarat" },
        { value: "RJ", label: "Rajasthan" },
        { value: "UP", label: "Uttar Pradesh" },
        { value: "WB", label: "West Bengal" },
        { value: "AP", label: "Andhra Pradesh" },
        { value: "TS", label: "Telangana" }
      ]
      setStates(indianStates)
    } catch (error) {
      console.error("Error fetching states:", error)
    } finally {
      setLoadingStates(false)
    }
  }

  const fetchCities = async (stateIsoCode: string) => {
    try {
      setLoadingCities(true)
      // This would typically be an API call based on state
      // For now, using sample cities
      const sampleCities = {
        "MH": [
          { value: "MUM", label: "Mumbai" },
          { value: "PUN", label: "Pune" },
          { value: "NAG", label: "Nagpur" }
        ],
        "KA": [
          { value: "BLR", label: "Bangalore" },
          { value: "MYS", label: "Mysore" },
          { value: "MAN", label: "Mangalore" }
        ],
        "DL": [
          { value: "DEL", label: "New Delhi" },
          { value: "GUR", label: "Gurgaon" },
          { value: "NOI", label: "Noida" }
        ]
      }
      setCities(sampleCities[stateIsoCode as keyof typeof sampleCities] || [])
    } catch (error) {
      console.error("Error fetching cities:", error)
    } finally {
      setLoadingCities(false)
    }
  }
  // Image handling functions
  const validateImage = (file: File, requiredDimensions?: { width: number; height: number }) => {
    return new Promise<boolean>((resolve) => {
      const maxSize = 500 * 1024 // 500KB
      
      if (!/\.(jpe?g|png)$/i.test(file.name)) {
        toast({
          title: "Invalid File",
          description: "Please select a JPEG or PNG image.",
          variant: "destructive"
        })
        resolve(false)
        return
      }

      if (file.size >= maxSize) {
        toast({
          title: "File Too Large", 
          description: "Image size should be less than 500KB",
          variant: "destructive"
        })
        resolve(false)
        return
      }

      if (requiredDimensions) {
        const img = new Image()
        img.src = URL.createObjectURL(file)
        img.onload = () => {
          if (img.width !== requiredDimensions.width || img.height !== requiredDimensions.height) {
            toast({
              title: "Invalid Dimensions",
              description: `Image dimensions must be ${requiredDimensions.width}x${requiredDimensions.height}.`,
              variant: "destructive"
            })
            resolve(false)
          } else {
            resolve(true)
          }
        }
      } else {
        resolve(true)
      }
    })
  }

  const handleCarouselImageAdd = async (files: FileList | null) => {
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isValid = await validateImage(file, { width: 612, height: 408 })
      
      if (isValid) {
        setCarouselImages(prev => [...prev, file])
        
        const reader = new FileReader()
        reader.onloadend = () => {
          setCarouselImagePreviews(prev => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleGalleryImageAdd = async (files: FileList | null) => {
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const isValid = await validateImage(file)
      
      if (isValid) {
        setGalleryImages(prev => [...prev, file])
        
        const reader = new FileReader()
        reader.onloadend = () => {
          setGalleryImagePreviews(prev => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleVenueLayoutAdd = async (file: File) => {
    const isValid = await validateImage(file)
    
    if (isValid) {
      setVenueLayoutImage(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setVenueLayoutPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeCarouselImage = (index: number) => {
    setCarouselImages(prev => prev.filter((_, i) => i !== index))
    setCarouselImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index))
    setGalleryImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Date/Time handling
  const addEventDateTime = (values: EventFormValues, setFieldValue: any) => {
    if (!tempEventDate.startDate || !tempEventDate.startTime || !tempEventDate.endDate || !tempEventDate.endTime) {
      toast({
        title: "Missing Information",
        description: "All date and time fields are required",
        variant: "destructive"
      })
      return
    }

    const startDateTime = new Date(`${tempEventDate.startDate}T${tempEventDate.startTime}:00`)
    const endDateTime = new Date(`${tempEventDate.endDate}T${tempEventDate.endTime}:00`)
    const currentDateTime = new Date()

    if (startDateTime < currentDateTime) {
      toast({
        title: "Invalid Start Time",
        description: "Event start time cannot be in the past",
        variant: "destructive"
      })
      return
    }

    if (endDateTime < startDateTime) {
      toast({
        title: "Invalid End Time", 
        description: "End date and time cannot be earlier than start date and time",
        variant: "destructive"
      })
      return
    }

    const eventDuration = endDateTime.getTime() - startDateTime.getTime()
    const maxDuration = 24 * 60 * 60 * 1000 // 24 hours

    if (eventDuration > maxDuration) {
      toast({
        title: "Duration Too Long",
        description: "Event duration cannot exceed 24 hours",
        variant: "destructive"
      })
      return
    }

    const newEvent: EventDateTime = {
      EventStartDate: tempEventDate.startDate,
      EventStartTime: `${tempEventDate.startTime}:00`,
      EventEndDate: tempEventDate.endDate,
      EventEndTime: `${tempEventDate.endTime}:00`,
    }

    setFieldValue("events", [...values.events, newEvent])
    setTempEventDate({ startDate: "", startTime: "", endDate: "", endTime: "" })

    toast({
      title: "Success",
      description: "Date and time added successfully",
    })
  }

  const removeEventDateTime = (index: number, values: EventFormValues, setFieldValue: any) => {
    const updatedEvents = values.events.filter((_, i) => i !== index)
    setFieldValue("events", updatedEvents)
  }

  // FAQ handling
  const addFAQ = (values: EventFormValues, setFieldValue: any) => {
    if (!tempFAQ.Question.trim() || !tempFAQ.Answer.trim()) {
      toast({
        title: "Missing Information",
        description: "Both question and answer are required",
        variant: "destructive"
      })
      return
    }

    setFieldValue("faqs", [...values.faqs, { ...tempFAQ }])
    setTempFAQ({ Question: "", Answer: "" })

    toast({
      title: "Success",
      description: "FAQ added successfully",
    })
  }

  const removeFAQ = (index: number, values: EventFormValues, setFieldValue: any) => {
    const updatedFAQs = values.faqs.filter((_, i) => i !== index)
    setFieldValue("faqs", updatedFAQs)
  }
  // Handle select changes for relationships
  const handleSelectChange = (selectedOptions: any, fieldName: string, setFieldValue: any) => {
    // Check if user selected "Create New" option
    const createNewOption = selectedOptions?.find((option: any) => 
      option.value.startsWith("CREATE_NEW")
    )
    
    if (createNewOption) {      // Open appropriate modal based on the option
      switch (createNewOption.value) {
        case "CREATE_NEW_VENUE":
          setShowCreateVenueModal(true)
          break
        case "CREATE_NEW":
          setShowCreateOrganizerModal(true)
          break
        case "CREATE_NEW_CATEGORY":
          setShowCreateCategoryModal(true)
          break
        case "CREATE_NEW_ARTIST":
          setShowCreateArtistModal(true)
          break
        case "CREATE_NEW_GENRE":
          setShowCreateGenreModal(true)
          break
        case "CREATE_NEW_EVENT_TOUR":
          setShowCreateEventTourModal(true)
          break
      }
      // Remove the create option from selection
      const filteredOptions = selectedOptions?.filter((option: any) => 
        !option.value.startsWith("CREATE_NEW")
      )
      setFieldValue(fieldName, filteredOptions || [])
    } else {
      setFieldValue(fieldName, selectedOptions || [])
    }
  }

  // Form submission
  const handleSubmit = async (values: EventFormValues, eventStatus: number) => {
    try {
      // Additional validation for tour events
      if (eventSelectionFlag === 1 && !values.eventTour_id) {
        toast({
          title: "Validation Error",
          description: "Please select a tour for this event",
          variant: "destructive"
        })
        return
      }

      // Validate images
      if (carouselImages.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please upload at least one carousel image",
          variant: "destructive"
        })
        return
      }

      // Create FormData for submission
      const submitData = new FormData()
      
      // Add carousel images
      carouselImages.forEach((image) => {
        submitData.append("carouselImages", image)
      })

      // Add gallery images if any
      if (galleryImages.length > 0) {
        galleryImages.forEach((image) => {
          submitData.append("galleryImages", image)
        })
      }

      // Add venue layout image if applicable
      if (venueLayoutImage && values.locationType === "venue") {
        submitData.append("venueLayoutImage", venueLayoutImage)
      }

      // Add form data using the exact field names required by the API
      submitData.append("eventname", values.eventname)
      submitData.append("eventDescription", values.eventDescription)
      submitData.append("eventTermsandConditions", values.eventTermsandConditions)
      submitData.append("eventVisibility", values.eventVisibility)
      submitData.append("eventType", values.eventType)
      submitData.append("locationType", values.locationType)
      submitData.append("isFeatured", values.isFeatured ? "1" : "0")
      submitData.append("feeunit", values.feeunit.toString())
      submitData.append("feevalue", values.feevalue.toString())
      submitData.append("ageRestriction", values.ageRestriction)
      submitData.append("status", eventStatus === EventStatus.Draft ? "draft" : "published")

      // Add conditional fields
      if (values.eventVideoUrl) {
        submitData.append("eventVideoUrl", values.eventVideoUrl)
      }

      if (values.eventType === "1" && values.bookingphonenumber) {
        submitData.append("bookingphonenumber", values.bookingphonenumber)
      }

      if (values.eventType === "3" && values.whatsappnumber) {
        submitData.append("whatsappnumber", values.whatsappnumber)
      }

      // Add location-specific data
      if (values.locationType === "venue") {
        submitData.append("venue_id", values.venue_id)
      } else if (values.locationType === "online") {
        submitData.append("onlineEventUrl", values.onlineEventUrl)
      } else if (values.locationType === "tba") {
        submitData.append("stateIsoCode", values.stateIsoCode)
        submitData.append("stateName", values.stateName)
        submitData.append("cityIsoCode", values.cityIsoCode)
        submitData.append("cityName", values.cityName)
      }

      // Add relationship arrays
      submitData.append("organizers", JSON.stringify(values.organizers.map(o => o.value)))
      submitData.append("categories", JSON.stringify(values.categories.map(c => c.value)))
      submitData.append("artists", JSON.stringify(values.artists.map(a => a.value)))
      submitData.append("genres", JSON.stringify(values.genres.map(g => g.value)))
      submitData.append("languages", JSON.stringify(values.languages.map(l => l.value)))

      // Add tour ID if applicable
      if (eventSelectionFlag === 1 && values.eventTour_id) {
        submitData.append("eventTour_id", values.eventTour_id)
      }

      // Add events and FAQs
      submitData.append("events", JSON.stringify(values.events))
      submitData.append("faqs", JSON.stringify(values.faqs))

      // Add administrative fields
      if (user) {
        submitData.append("createdBy", user.AdminRole || role)
        submitData.append("createdUserId", user.user_id)
      }      // Submit to API
      const authToken = getValidToken()
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in again",
          variant: "destructive"
        })
        return
      }

      // Use the correct endpoint based on role
      const eventEndpoint = role === "superadmin" ? "/events/superAdmin/create" : "/events/organizer/create"
      const response = await fetch(getApiEndpoint(eventEndpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: submitData,
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: data.message || "Event created successfully",
        })
        setTimeout(() => {
          setEventCreationModal(false)
        }, 2000)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to create event",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive"
      })
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {eventSelectionFlag === 1 ? 'Create Tour Event' : 'Create Event'}
          </CardTitle>
          <p className="text-muted-foreground">
            Fill in the details below to create your {eventSelectionFlag === 1 ? 'tour ' : ''}event. 
            Fields marked with * are required.
          </p>
        </CardHeader>
      </Card>

      <Formik
        initialValues={initialValues}
        validationSchema={eventValidationSchema}
        onSubmit={() => {}} // We handle submission manually through buttons
      >
        {({ values, errors, touched, setFieldValue, setFieldTouched }: FormikProps<EventFormValues>) => {
          // Store setFieldValue reference for modal usage
          React.useEffect(() => {
            setFormikSetFieldValue(() => setFieldValue)
          }, [setFieldValue])

          return (
          <Form>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Carousel Images Upload Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Upload Carousel Images *</CardTitle>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      First image will be used for thumbnail. Maximum file size: 500KB. Dimensions: 612x408
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          multiple
                          onChange={(e) => handleCarouselImageAdd(e.target.files)}
                          className="hidden"
                          id="carousel-upload"
                        />
                        <label htmlFor="carousel-upload" className="cursor-pointer">
                          <div className="flex flex-col items-center space-y-2">
                            <ImagePlus className="h-12 w-12 text-gray-400" />
                            <p className="text-gray-500">Upload Carousel Images</p>
                          </div>
                        </label>
                      </div>
                      <div className="flex justify-center mt-4">
                        <p className="text-sm text-gray-600">
                          Only PNG or JPG files. 500 KB max size. 612x408 dimensions required.
                        </p>
                      </div>
                    </div>

                    {/* Display uploaded carousel images */}
                    {carouselImagePreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        {carouselImagePreviews.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={image}
                              alt={`Carousel ${index + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => removeCarouselImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            {index === 0 && (
                              <Badge className="absolute bottom-1 left-1 text-xs">
                                Thumbnail
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {carouselImages.length === 0 && (
                      <p className="text-sm text-red-600">At least one carousel image is required</p>
                    )}
                  </CardContent>
                </Card>

                {/* Organizers Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Organizers *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Select Organizers</Label>                      <Select
                        isMulti
                        options={organizers}
                        value={values.organizers}
                        onChange={(selected) => handleSelectChange(selected, "organizers", setFieldValue)}
                        placeholder="Select organizers..."
                        isLoading={loadingOrganizers}
                        className="basic-multi-select"
                        classNamePrefix="select"
                      />{touched.organizers && errors.organizers && (
                        <p className="text-sm text-red-600">{String(errors.organizers)}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Categories Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Categories *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Select Categories</Label>
                      <Select                        isMulti
                        options={categories}
                        value={values.categories}
                        onChange={(selected) => handleSelectChange(selected, "categories", setFieldValue)}
                        placeholder="Select categories..."
                        isLoading={loadingCategories}
                        className="basic-multi-select"
                        classNamePrefix="select"
                      />{touched.categories && errors.categories && (
                        <p className="text-sm text-red-600">{String(errors.categories)}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Artists Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Artists *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Select Artists</Label>
                      <Select                        isMulti
                        options={artists}
                        value={values.artists}
                        onChange={(selected) => handleSelectChange(selected, "artists", setFieldValue)}
                        placeholder="Select artists..."
                        isLoading={loadingArtists}
                        className="basic-multi-select"
                        classNamePrefix="select"
                      />                      {touched.artists && errors.artists && (
                        <p className="text-sm text-red-600">{String(errors.artists)}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Genres Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Genres *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Select Genres</Label>                      <Select
                        isMulti
                        options={genres}
                        value={values.genres}
                        onChange={(selected) => handleSelectChange(selected, "genres", setFieldValue)}
                        placeholder="Select genres..."
                        isLoading={loadingGenres}
                        className="basic-multi-select"
                        classNamePrefix="select"
                      />{touched.genres && errors.genres && (
                        <p className="text-sm text-red-600">{String(errors.genres)}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Languages Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Languages *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Select Languages</Label>
                      <Select
                        isMulti
                        options={indianLanguages}
                        value={values.languages}
                        onChange={(selected) => setFieldValue("languages", selected || [])}
                        placeholder="Select languages..."
                        className="basic-multi-select"
                        classNamePrefix="select"
                      />                      {touched.languages && errors.languages && (
                        <p className="text-sm text-red-600">{String(errors.languages)}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Event Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Event Visibility */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Event Visibility *</Label>
                      <div className="flex space-x-4">
                        <div className="flex items-center space-x-2">
                          <Field
                            type="radio"
                            name="eventVisibility"
                            value="1"
                            className="w-4 h-4"
                          />
                          <Label>Public (Online/Offline)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Field
                            type="radio"
                            name="eventVisibility"
                            value="2"
                            className="w-4 h-4"
                          />
                          <Label>Private (Offline Only)</Label>
                        </div>
                      </div>
                      {touched.eventVisibility && errors.eventVisibility && (
                        <p className="text-sm text-red-600">{errors.eventVisibility}</p>
                      )}
                    </div>

                    {/* Event Type */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Event Type *</Label>
                      <div className="flex space-x-4">
                        <div className="flex items-center space-x-2">
                          <Field
                            type="radio"
                            name="eventType"
                            value="1"
                            className="w-4 h-4"
                          />
                          <Label>Booking</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Field
                            type="radio"
                            name="eventType"
                            value="2"
                            className="w-4 h-4"
                          />
                          <Label>Registration</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Field
                            type="radio"
                            name="eventType"
                            value="3"
                            className="w-4 h-4"
                          />
                          <Label>WhatsApp</Label>
                        </div>
                      </div>
                      {touched.eventType && errors.eventType && (
                        <p className="text-sm text-red-600">{errors.eventType}</p>
                      )}

                      {/* Conditional phone number input */}
                      {values.eventType === "1" && (
                        <div className="space-y-2">
                          <Label>Booking Phone Number *</Label>
                          <Field
                            as={Input}
                            name="bookingphonenumber"
                            type="tel"
                            placeholder="Enter 10-digit phone number"
                          />
                          {touched.bookingphonenumber && errors.bookingphonenumber && (
                            <p className="text-sm text-red-600">{errors.bookingphonenumber}</p>
                          )}
                        </div>
                      )}

                      {values.eventType === "3" && (
                        <div className="space-y-2">
                          <Label>WhatsApp Number *</Label>
                          <Field
                            as={Input}
                            name="whatsappnumber"
                            type="tel"
                            placeholder="Enter 10-digit WhatsApp number"
                          />
                          {touched.whatsappnumber && errors.whatsappnumber && (
                            <p className="text-sm text-red-600">{errors.whatsappnumber}</p>
                          )}
                        </div>
                      )}
                    </div>                    {/* Location */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Location Type *</Label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={values.locationType === "venue" ? "default" : "outline"}
                          onClick={() => setFieldValue("locationType", "venue")}
                          className="flex-1"
                        >
                          Venue
                        </Button>
                        <Button
                          type="button"
                          variant={values.locationType === "online" ? "default" : "outline"}
                          onClick={() => setFieldValue("locationType", "online")}
                          className="flex-1"
                        >
                          Online Event
                        </Button>
                        <Button
                          type="button"
                          variant={values.locationType === "tba" ? "default" : "outline"}
                          onClick={() => setFieldValue("locationType", "tba")}
                          className="flex-1"
                        >
                          To Be Announced
                        </Button>
                      </div>
                      {touched.locationType && errors.locationType && (
                        <p className="text-sm text-red-600">{errors.locationType}</p>
                      )}

                      {/* Conditional location inputs */}
                      {values.locationType === "venue" && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Select Venue *</Label>
                            <Select
                              options={venues}
                              value={venues.find(v => v.value === values.venue_id)}                              onChange={(selected) => {
                                if (selected?.value === "CREATE_NEW_VENUE") {
                                  setShowCreateVenueModal(true)
                                } else {
                                  setFieldValue("venue_id", selected?.value || "")
                                }
                              }}
                              placeholder="Select venue..."
                              isLoading={loadingVenues}
                              className="basic-single"
                              classNamePrefix="select"
                            />
                            {touched.venue_id && errors.venue_id && (
                              <p className="text-sm text-red-600">{errors.venue_id}</p>
                            )}
                          </div>

                          {/* Venue Layout Upload */}
                          <div className="space-y-2">
                            <Label>Venue Layout (Optional)</Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/jpg"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleVenueLayoutAdd(file)
                                  }}
                                  className="hidden"
                                  id="venue-layout-upload"
                                />
                                <label htmlFor="venue-layout-upload" className="cursor-pointer">
                                  {venueLayoutPreview ? (
                                    <img
                                      src={venueLayoutPreview}
                                      alt="Venue Layout"
                                      className="w-full h-32 object-cover rounded"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center space-y-2">
                                      <ImagePlus className="h-8 w-8 text-gray-400" />
                                      <p className="text-gray-500">Upload Venue Layout</p>
                                    </div>
                                  )}
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {values.locationType === "online" && (
                        <div className="space-y-2">
                          <Label>Online Event URL *</Label>
                          <Field
                            as={Input}
                            name="onlineEventUrl"
                            type="url"
                            placeholder="Enter online event URL (e.g., Zoom, Meet, etc.)"
                          />
                          {touched.onlineEventUrl && errors.onlineEventUrl && (
                            <p className="text-sm text-red-600">{errors.onlineEventUrl}</p>
                          )}
                        </div>
                      )}

                      {values.locationType === "tba" && (
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground mb-2">
                            Venue details will be announced later. Please provide state and city information.
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>State *</Label>
                              <Select
                                options={states}
                                value={states.find(s => s.value === values.stateIsoCode)}
                                onChange={(selected) => {
                                  setFieldValue("stateIsoCode", selected?.value || "")
                                  setFieldValue("stateName", selected?.label || "")
                                  if (selected?.value) {
                                    fetchCities(selected.value)
                                  }
                                }}
                                placeholder="Select state..."
                                isLoading={loadingStates}
                                className="basic-single"
                                classNamePrefix="select"
                              />
                              {touched.stateIsoCode && errors.stateIsoCode && (
                                <p className="text-sm text-red-600">{errors.stateIsoCode}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>City *</Label>
                              <Select
                                options={cities}
                                value={cities.find(c => c.value === values.cityIsoCode)}
                                onChange={(selected) => {
                                  setFieldValue("cityIsoCode", selected?.value || "")
                                  setFieldValue("cityName", selected?.label || "")
                                }}
                                placeholder="Select city..."
                                isLoading={loadingCities}
                                isDisabled={!values.stateIsoCode}
                                className="basic-single"
                                classNamePrefix="select"
                              />
                              {touched.cityIsoCode && errors.cityIsoCode && (
                                <p className="text-sm text-red-600">{errors.cityIsoCode}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Age Restriction */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Age Restriction *</Label>
                      <Select
                        options={yearsOptions}
                        value={yearsOptions.find(option => option.value === values.ageRestriction)}
                        onChange={(selected) => setFieldValue("ageRestriction", selected?.value || "")}
                        placeholder="Select age group..."
                        className="basic-single"
                        classNamePrefix="select"
                      />
                      {touched.ageRestriction && errors.ageRestriction && (
                        <p className="text-sm text-red-600">{errors.ageRestriction}</p>
                      )}
                    </div>

                    {/* Convenience Fee */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Convenience Fee Unit *</Label>
                        <UISelect
                          value={values.feeunit.toString()}
                          onValueChange={(value) => setFieldValue("feeunit", parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ConvinienceFeeUnit.Percentage.toString()}>Percentage</SelectItem>
                            <SelectItem value={ConvinienceFeeUnit.Fixed.toString()}>Fixed Amount</SelectItem>
                          </SelectContent>
                        </UISelect>
                      </div>
                      <div className="space-y-2">
                        <Label>Convenience Fee Value *</Label>
                        <Field
                          as={Input}
                          name="feevalue"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter fee value"
                        />
                        {touched.feevalue && errors.feevalue && (
                          <p className="text-sm text-red-600">{errors.feevalue}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Event Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Event Name *</Label>
                      <Field
                        as={Input}
                        name="eventname"
                        placeholder="Enter event name"
                      />
                      {touched.eventname && errors.eventname && (
                        <p className="text-sm text-red-600">{errors.eventname}</p>
                      )}
                    </div>                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Event Description *</Label>
                      <ReactQuillWrapper
                        value={values.eventDescription}
                        onChange={(content) => setFieldValue("eventDescription", content)}
                        placeholder="Enter detailed event description..."
                        theme="snow"
                        style={{ height: "150px", marginBottom: "50px" }}
                      />
                      {touched.eventDescription && errors.eventDescription && (
                        <p className="text-sm text-red-600">{errors.eventDescription}</p>
                      )}
                    </div>                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Event Terms and Conditions *</Label>
                      <ReactQuillWrapper
                        value={values.eventTermsandConditions}
                        onChange={(content) => setFieldValue("eventTermsandConditions", content)}
                        placeholder="Enter terms and conditions..."
                        theme="snow"
                        style={{ height: "150px", marginBottom: "50px" }}
                      />
                      {touched.eventTermsandConditions && errors.eventTermsandConditions && (
                        <p className="text-sm text-red-600">{errors.eventTermsandConditions}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Event Video URL (Optional)</Label>
                      <Field
                        as={Input}
                        name="eventVideoUrl"
                        type="url"
                        placeholder="Enter YouTube or promotional video URL"
                      />
                      {touched.eventVideoUrl && errors.eventVideoUrl && (
                        <p className="text-sm text-red-600">{errors.eventVideoUrl}</p>
                      )}
                    </div>

                    {/* Featured Event Toggle */}
                    <div className="flex items-center space-x-2">
                      <Field
                        as={Switch}
                        name="isFeatured"
                        checked={values.isFeatured}
                        onCheckedChange={(checked: boolean) => setFieldValue("isFeatured", checked)}
                      />
                      <Label>Make as Featured Event</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Tour Selection - Only show for tour events */}
                {eventSelectionFlag === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Event Tour *</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Link this event to an existing tour/campaign series
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Available Tours</Label>
                        <Select
                          options={eventTours}
                          value={eventTours.find(tour => tour.value === values.eventTour_id)}
                          onChange={(selected) => {
                            if (selected?.value === "CREATE_NEW_EVENT_TOUR") {
                              setShowCreateEventTourModal(true)
                            } else {
                              setFieldValue("eventTour_id", selected?.value || "")
                            }
                          }}
                          placeholder="Select a tour..."
                          isLoading={loadingEventTours}
                          className="basic-single"
                          classNamePrefix="select"
                        />
                        {eventSelectionFlag === 1 && touched.eventTour_id && errors.eventTour_id && (
                          <p className="text-sm text-red-600">{errors.eventTour_id}</p>
                        )}
                        {values.eventTour_id && (
                          <div className="mt-2 p-3 bg-muted/30 rounded-md">
                            <p className="text-sm text-muted-foreground">
                              ✓ This event will be linked to the selected tour
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Date and Time Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Date & Time *</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add multiple dates for multi-day events. Each date can have different start/end times.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          min={formattedDate}
                          value={tempEventDate.startDate}
                          onChange={(e) => setTempEventDate(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={tempEventDate.startTime}
                          onChange={(e) => setTempEventDate(prev => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          min={tempEventDate.startDate || formattedDate}
                          value={tempEventDate.endDate}
                          onChange={(e) => setTempEventDate(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={tempEventDate.endTime}
                          onChange={(e) => setTempEventDate(prev => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => addEventDateTime(values, setFieldValue)}
                        variant="outline"
                      >
                        Add Date & Time
                      </Button>
                    </div>

                    {/* Display saved events */}
                    {values.events.length > 0 && (
                      <div className="space-y-2">
                        <Label>Scheduled Events:</Label>
                        {values.events.map((event: EventDateTime, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div className="text-sm">
                              <p><strong>Date:</strong> {new Date(event.EventStartDate).toLocaleDateString()} - {new Date(event.EventEndDate).toLocaleDateString()}</p>
                              <p><strong>Time:</strong> {event.EventStartTime} - {event.EventEndTime}</p>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeEventDateTime(index, values, setFieldValue)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}                    {touched.events && errors.events && (
                      <p className="text-sm text-red-600">{String(errors.events)}</p>
                    )}
                  </CardContent>
                </Card>

                {/* FAQ Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event FAQs</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add frequently asked questions and answers about your event
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Input
                          placeholder="Enter FAQ question"
                          value={tempFAQ.Question}
                          onChange={(e) => setTempFAQ(prev => ({ ...prev, Question: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Answer</Label>
                        <Textarea
                          placeholder="Enter FAQ answer"
                          value={tempFAQ.Answer}
                          onChange={(e) => setTempFAQ(prev => ({ ...prev, Answer: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={() => addFAQ(values, setFieldValue)}
                          variant="outline"
                        >
                          Add FAQ
                        </Button>
                      </div>
                    </div>

                    {/* Display saved FAQs */}
                    {values.faqs.length > 0 && (
                      <div className="space-y-2">
                        <Label>Added FAQs:</Label>
                        {values.faqs.map((faq: FAQ, index: number) => (
                          <div key={index} className="p-3 border rounded space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{faq.Question}</p>
                                <p className="text-sm text-muted-foreground mt-1">{faq.Answer}</p>
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeFAQ(index, values, setFieldValue)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Gallery Images Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Gallery Images</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Optional: Add additional images for the event gallery
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          multiple
                          onChange={(e) => handleGalleryImageAdd(e.target.files)}
                          className="hidden"
                          id="gallery-upload"
                        />
                        <label htmlFor="gallery-upload" className="cursor-pointer">
                          <div className="flex flex-col items-center space-y-2">
                            <ImagePlus className="h-8 w-8 text-gray-400" />
                            <p className="text-gray-500">Upload Gallery Images</p>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    {galleryImagePreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        {galleryImagePreviews.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={image}
                              alt={`Gallery ${index + 1}`}
                              className="w-full h-24 object-cover rounded"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => removeGalleryImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {galleryImages.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">
                          {galleryImages.length} gallery image(s) selected
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit(values, EventStatus.Draft)}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit(values, EventStatus.Published)}
              >
                Publish Event              </Button>
            </div>
          </Form>
          )
        }}
      </Formik>

      {/* Create Modals */}
      {showCreateVenueModal && (
        <Dialog open={showCreateVenueModal} onOpenChange={setShowCreateVenueModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Venue</DialogTitle>
            </DialogHeader>
            <Formik
              initialValues={{
                Name: "",
                Address: "",
                City: "",
                State: "",
                PinCode: "",
                Capacity: "",
                ContactNumber: "",
                Description: ""
              }}
              validationSchema={Yup.object({
                Name: Yup.string().required("Venue name is required"),
                Address: Yup.string().required("Address is required"),
                City: Yup.string().required("City is required"),
                State: Yup.string().required("State is required"),
                PinCode: Yup.string().required("Pin code is required"),
                Capacity: Yup.number().min(1, "Capacity must be at least 1").required("Capacity is required"),
                ContactNumber: Yup.string().matches(/^[0-9]{10}$/, "Must be 10 digits").required("Contact number is required")
              })}
              onSubmit={async (values, { setSubmitting, resetForm }) => {
                try {
                  const authToken = getValidToken()
                  if (!authToken) return

                  const response = await fetch(getApiEndpoint("/venue/create"), {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${authToken}`
                    },
                    body: JSON.stringify(values)
                  })

                  if (response.ok) {
                    const data = await response.json()
                    const newVenue = {
                      value: data.data._id || data.data.id,
                      label: data.data.Name || data.data.name
                    }
                      // Update venues list and select the new venue
                    setVenues(prev => [newVenue, ...prev.filter(v => v.value !== createVenueOption.value)])
                    if (formikSetFieldValue) {
                      formikSetFieldValue("venue_id", newVenue.value)
                    }
                    
                    toast({
                      title: "Success",
                      description: "Venue created successfully",
                    })
                    
                    setShowCreateVenueModal(false)
                    resetForm()
                  } else {
                    const errorData = await response.json()
                    toast({
                      title: "Error",
                      description: errorData.message || "Failed to create venue",
                      variant: "destructive"
                    })
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create venue",
                    variant: "destructive"
                  })
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {({ values, errors, touched, isSubmitting }) => (
                <Form className="space-y-4">
                  <div className="space-y-2">
                    <Label>Venue Name *</Label>
                    <Field as={Input} name="Name" placeholder="Enter venue name" />
                    {touched.Name && errors.Name && (
                      <p className="text-sm text-red-600">{errors.Name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Address *</Label>
                    <Field as={Textarea} name="Address" placeholder="Enter venue address" rows={2} />
                    {touched.Address && errors.Address && (
                      <p className="text-sm text-red-600">{errors.Address}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City *</Label>
                      <Field as={Input} name="City" placeholder="City" />
                      {touched.City && errors.City && (
                        <p className="text-sm text-red-600">{errors.City}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Field as={Input} name="State" placeholder="State" />
                      {touched.State && errors.State && (
                        <p className="text-sm text-red-600">{errors.State}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pin Code *</Label>
                      <Field as={Input} name="PinCode" placeholder="Pin code" />
                      {touched.PinCode && errors.PinCode && (
                        <p className="text-sm text-red-600">{errors.PinCode}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity *</Label>
                      <Field as={Input} name="Capacity" type="number" placeholder="Max capacity" />
                      {touched.Capacity && errors.Capacity && (
                        <p className="text-sm text-red-600">{errors.Capacity}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Contact Number *</Label>
                    <Field as={Input} name="ContactNumber" placeholder="10-digit contact number" />
                    {touched.ContactNumber && errors.ContactNumber && (
                      <p className="text-sm text-red-600">{errors.ContactNumber}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Field as={Textarea} name="Description" placeholder="Venue description (optional)" rows={2} />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateVenueModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Venue"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}      {showCreateOrganizerModal && (
        <Dialog open={showCreateOrganizerModal} onOpenChange={setShowCreateOrganizerModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Organizer</DialogTitle>
            </DialogHeader>
            <Formik
              initialValues={{
                Name: "",
                Email: "",
                PhoneNumber: "",
                Address: "",
                Description: ""
              }}
              validationSchema={Yup.object({
                Name: Yup.string().required("Organizer name is required"),
                Email: Yup.string().email("Invalid email").required("Email is required"),
                PhoneNumber: Yup.string().matches(/^[0-9]{10}$/, "Must be 10 digits").required("Phone number is required"),
                Address: Yup.string().required("Address is required")
              })}
              onSubmit={async (values, { setSubmitting, resetForm }) => {
                try {
                  const authToken = getValidToken()
                  if (!authToken) return

                  const response = await fetch(getApiEndpoint("/organizer/register"), {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${authToken}`
                    },
                    body: JSON.stringify(values)
                  })

                  if (response.ok) {
                    const data = await response.json()
                    const newOrganizer = {
                      value: data.data._id || data.data.id,
                      label: data.data.Name || data.data.name || data.data.organizerName
                    }
                    
                    // Update organizers list
                    setOrganizers(prev => [newOrganizer, ...prev.filter(o => o.value !== createOrganizerOption.value)])
                    
                    toast({
                      title: "Success",
                      description: "Organizer created successfully",
                    })
                    
                    setShowCreateOrganizerModal(false)
                    resetForm()
                  } else {
                    const errorData = await response.json()
                    toast({
                      title: "Error",
                      description: errorData.message || "Failed to create organizer",
                      variant: "destructive"
                    })
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create organizer",
                    variant: "destructive"
                  })
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {({ values, errors, touched, isSubmitting }) => (
                <Form className="space-y-4">
                  <div className="space-y-2">
                    <Label>Organizer Name *</Label>
                    <Field as={Input} name="Name" placeholder="Enter organizer name" />
                    {touched.Name && errors.Name && (
                      <p className="text-sm text-red-600">{errors.Name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Field as={Input} name="Email" type="email" placeholder="Enter email address" />
                    {touched.Email && errors.Email && (
                      <p className="text-sm text-red-600">{errors.Email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Field as={Input} name="PhoneNumber" placeholder="10-digit phone number" />
                    {touched.PhoneNumber && errors.PhoneNumber && (
                      <p className="text-sm text-red-600">{errors.PhoneNumber}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Address *</Label>
                    <Field as={Textarea} name="Address" placeholder="Enter address" rows={2} />
                    {touched.Address && errors.Address && (
                      <p className="text-sm text-red-600">{errors.Address}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Field as={Textarea} name="Description" placeholder="Organizer description (optional)" rows={2} />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateOrganizerModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Organizer"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}      {showCreateCategoryModal && (
        <Dialog open={showCreateCategoryModal} onOpenChange={setShowCreateCategoryModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <Formik
              initialValues={{
                Name: "",
                Description: ""
              }}
              validationSchema={Yup.object({
                Name: Yup.string().required("Category name is required").min(3, "Category name must be at least 3 characters")
              })}
              onSubmit={async (values, { setSubmitting, resetForm }) => {
                try {
                  const authToken = getValidToken()
                  if (!authToken) return

                  const response = await fetch(getApiEndpoint("/category/create"), {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${authToken}`
                    },
                    body: JSON.stringify(values)
                  })

                  if (response.ok) {
                    const data = await response.json()
                    const newCategory = {
                      value: data.data._id || data.data.id,
                      label: data.data.Name || data.data.name || data.data.categoryName
                    }
                    
                    // Update categories list
                    setCategories(prev => [newCategory, ...prev.filter(c => c.value !== createCategoryOption.value)])
                    
                    toast({
                      title: "Success",
                      description: "Category created successfully",
                    })
                    
                    setShowCreateCategoryModal(false)
                    resetForm()
                  } else {
                    const errorData = await response.json()
                    toast({
                      title: "Error",
                      description: errorData.message || "Failed to create category",
                      variant: "destructive"
                    })
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create category",
                    variant: "destructive"
                  })
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {({ values, errors, touched, isSubmitting }) => (
                <Form className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category Name *</Label>
                    <Field as={Input} name="Name" placeholder="Enter category name" />
                    {touched.Name && errors.Name && (
                      <p className="text-sm text-red-600">{errors.Name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Field as={Textarea} name="Description" placeholder="Category description (optional)" rows={3} />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateCategoryModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Category"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}      {showCreateArtistModal && (
        <Dialog open={showCreateArtistModal} onOpenChange={setShowCreateArtistModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Artist</DialogTitle>
            </DialogHeader>
            <Formik
              initialValues={{
                Name: "",
                Description: "",
                ContactEmail: "",
                ContactPhone: ""
              }}
              validationSchema={Yup.object({
                Name: Yup.string().required("Artist name is required").min(2, "Artist name must be at least 2 characters"),
                ContactEmail: Yup.string().email("Invalid email format"),
                ContactPhone: Yup.string().matches(/^[0-9]{10}$/, "Must be 10 digits")
              })}
              onSubmit={async (values, { setSubmitting, resetForm }) => {
                try {
                  const authToken = getValidToken()
                  if (!authToken) return

                  const response = await fetch(getApiEndpoint("/artist/register"), {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${authToken}`
                    },
                    body: JSON.stringify(values)
                  })

                  if (response.ok) {
                    const data = await response.json()
                    const newArtist = {
                      value: data.data._id || data.data.id,
                      label: data.data.Name || data.data.name || data.data.artistName
                    }
                    
                    // Update artists list
                    setArtists(prev => [newArtist, ...prev.filter(a => a.value !== createArtistOption.value)])
                    
                    toast({
                      title: "Success",
                      description: "Artist created successfully",
                    })
                    
                    setShowCreateArtistModal(false)
                    resetForm()
                  } else {
                    const errorData = await response.json()
                    toast({
                      title: "Error",
                      description: errorData.message || "Failed to create artist",
                      variant: "destructive"
                    })
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create artist",
                    variant: "destructive"
                  })
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {({ values, errors, touched, isSubmitting }) => (
                <Form className="space-y-4">
                  <div className="space-y-2">
                    <Label>Artist Name *</Label>
                    <Field as={Input} name="Name" placeholder="Enter artist name" />
                    {touched.Name && errors.Name && (
                      <p className="text-sm text-red-600">{errors.Name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Field as={Textarea} name="Description" placeholder="Artist bio/description (optional)" rows={3} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Field as={Input} name="ContactEmail" type="email" placeholder="Artist email (optional)" />
                    {touched.ContactEmail && errors.ContactEmail && (
                      <p className="text-sm text-red-600">{errors.ContactEmail}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Field as={Input} name="ContactPhone" placeholder="10-digit phone number (optional)" />
                    {touched.ContactPhone && errors.ContactPhone && (
                      <p className="text-sm text-red-600">{errors.ContactPhone}</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateArtistModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Artist"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}      {showCreateGenreModal && (
        <Dialog open={showCreateGenreModal} onOpenChange={setShowCreateGenreModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Genre</DialogTitle>
            </DialogHeader>
            <Formik
              initialValues={{
                Name: "",
                Description: ""
              }}
              validationSchema={Yup.object({
                Name: Yup.string().required("Genre name is required").min(2, "Genre name must be at least 2 characters")
              })}
              onSubmit={async (values, { setSubmitting, resetForm }) => {
                try {
                  const authToken = getValidToken()
                  if (!authToken) return

                  const response = await fetch(getApiEndpoint("/genre/create"), {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${authToken}`
                    },
                    body: JSON.stringify(values)
                  })

                  if (response.ok) {
                    const data = await response.json()
                    const newGenre = {
                      value: data.data._id || data.data.id,
                      label: data.data.Name || data.data.name || data.data.genreName
                    }
                    
                    // Update genres list
                    setGenres(prev => [newGenre, ...prev.filter(g => g.value !== createGenreOption.value)])
                    
                    toast({
                      title: "Success",
                      description: "Genre created successfully",
                    })
                    
                    setShowCreateGenreModal(false)
                    resetForm()
                  } else {
                    const errorData = await response.json()
                    toast({
                      title: "Error",
                      description: errorData.message || "Failed to create genre",
                      variant: "destructive"
                    })
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create genre",
                    variant: "destructive"
                  })
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {({ values, errors, touched, isSubmitting }) => (
                <Form className="space-y-4">
                  <div className="space-y-2">
                    <Label>Genre Name *</Label>
                    <Field as={Input} name="Name" placeholder="Enter genre name (e.g., Rock, Classical, Comedy)" />
                    {touched.Name && errors.Name && (
                      <p className="text-sm text-red-600">{errors.Name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Field as={Textarea} name="Description" placeholder="Genre description (optional)" rows={3} />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateGenreModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Genre"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}      {showCreateEventTourModal && (
        <Dialog open={showCreateEventTourModal} onOpenChange={setShowCreateEventTourModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Event Tour</DialogTitle>
            </DialogHeader>
            <Formik
              initialValues={{
                Name: "",
                Description: "",
                StartDate: "",
                EndDate: ""
              }}
              validationSchema={Yup.object({
                Name: Yup.string().required("Tour name is required").min(3, "Tour name must be at least 3 characters"),
                StartDate: Yup.date().required("Start date is required").min(new Date(), "Start date cannot be in the past"),
                EndDate: Yup.date().required("End date is required").min(Yup.ref('StartDate'), "End date must be after start date")
              })}
              onSubmit={async (values, { setSubmitting, resetForm }) => {
                try {
                  const authToken = getValidToken()
                  if (!authToken) return

                  const response = await fetch(getApiEndpoint("/eventtour/create"), {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${authToken}`
                    },
                    body: JSON.stringify(values)
                  })

                  if (response.ok) {
                    const data = await response.json()
                    const newEventTour = {
                      value: data.data._id || data.data.id,
                      label: data.data.Name || data.data.name || data.data.tourName || data.data.title
                    }
                      // Update event tours list and select the new tour
                    setEventTours(prev => [newEventTour, ...prev.filter(t => t.value !== createEventTourOption.value)])
                    if (formikSetFieldValue) {
                      formikSetFieldValue("eventTour_id", newEventTour.value)
                    }
                    
                    toast({
                      title: "Success",
                      description: "Event tour created successfully",
                    })
                    
                    setShowCreateEventTourModal(false)
                    resetForm()
                  } else {
                    const errorData = await response.json()
                    toast({
                      title: "Error",
                      description: errorData.message || "Failed to create event tour",
                      variant: "destructive"
                    })
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create event tour",
                    variant: "destructive"
                  })
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {({ values, errors, touched, isSubmitting }) => (
                <Form className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tour Name *</Label>
                    <Field as={Input} name="Name" placeholder="Enter tour/campaign name" />
                    {touched.Name && errors.Name && (
                      <p className="text-sm text-red-600">{errors.Name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Field as={Textarea} name="Description" placeholder="Tour description (optional)" rows={3} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Field as={Input} name="StartDate" type="date" min={formattedDate} />
                      {touched.StartDate && errors.StartDate && (
                        <p className="text-sm text-red-600">{errors.StartDate}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>End Date *</Label>
                      <Field as={Input} name="EndDate" type="date" min={values.StartDate || formattedDate} />
                      {touched.EndDate && errors.EndDate && (
                        <p className="text-sm text-red-600">{errors.EndDate}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateEventTourModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Tour"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
