"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getValidToken } from "@/lib/token-utils"
import { 
  Upload, 
  X, 
  Info, 
  Trash2, 
  Edit, 
  Plus,
  ImagePlus 
} from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import { 
  EventFormat,
  EventType, 
  EventStatus,
  ConvinienceFeeUnit,
  EventVenueTobeAnnounced,
  IsVenueAvailable,
  IsOnlineEvent
} from "./enums"
import { 
  indianLanguages, 
  yearsOptions 
} from "./modal-data"

interface CreateEventProps {
  eventSelectionFlag: number | null
  setEventCreationModal: (value: boolean) => void
  role: UserRole
}

interface EventDateTime {
  EventStartDate: string
  EventStartTime: string
  EventEndDate: string
  EventEndTime: string
}

export default function CreateEvent({ 
  eventSelectionFlag, 
  setEventCreationModal,
  role 
}: CreateEventProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  // Image state
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null)
  const [images, setImages] = React.useState<string[]>([])
  const [allImageFile, setAllImageFile] = React.useState<File[]>([])
  const [imageUrl, setImageUrl] = React.useState<string>("")

  // Form state
  const [formData, setFormData] = React.useState({
    eventVisibility: "",
    eventType: "",
    bookingPhoneNumber: "",
    whatsappNumber: "",
    venueId: "",
    onlineEventUrl: "",
    eventName: "",
    eventDescription: "",
    isFeatured: false,
    eventTermsAndConditions: "",
    eventVideoUrl: "",
    feeUnit: ConvinienceFeeUnit.Percentage,
    feeValue: "",
  })

  // Location state
  const [selectedLocationType, setSelectedLocationType] = React.useState<string>("")
  
  // Language and age state
  const [selectedLanguages, setSelectedLanguages] = React.useState<any[]>([])
  const [selectedAge, setSelectedAge] = React.useState<any>(null)

  // Date and time state
  const [events, setEvents] = React.useState<EventDateTime[]>([])
  const [startDate, setStartDate] = React.useState("")
  const [startTime, setStartTime] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [endTime, setEndTime] = React.useState("")

  // Gallery images
  const [galleryImages, setGalleryImages] = React.useState<File[]>([])

  // Today's date for validation
  const [formattedDate, setFormattedDate] = React.useState("")

  React.useEffect(() => {
    const today = new Date()
    const formatted = today.toISOString().split('T')[0]
    setFormattedDate(formatted)
  }, [])

  // Form handlers
  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Image handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    const maxSize = 500 * 1024 // 500KB

    if (!/\.(jpe?g|png)$/i.test(file.name)) {
      toast({
        title: "Invalid File",
        description: "Please select a JPEG or PNG image.",
        variant: "destructive"
      })
      return
    }

    if (file.size >= maxSize) {
      toast({
        title: "File Too Large",
        description: "Image size should be less than 500KB",
        variant: "destructive"
      })
      return
    }

    const img = new Image()
    img.src = URL.createObjectURL(file)

    img.onload = () => {
      if (img.width !== 612 || img.height !== 408) {
        toast({
          title: "Invalid Dimensions",
          description: "Image dimensions must be 612x408.",
          variant: "destructive"
        })
      } else {
        reader.onloadend = () => {
          setSelectedImage(file)
          setImageUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleAddImage = () => {
    if (!selectedImage || !imageUrl) {
      toast({
        title: "No Image Selected",
        description: "Please select an image first",
        variant: "destructive"
      })
      return
    }

    setImages(prev => [...prev, imageUrl])
    setAllImageFile(prev => [...prev, selectedImage])
    setSelectedImage(null)
    setImageUrl("")
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setAllImageFile(prev => prev.filter((_, i) => i !== index))
  }

  // Date and time handling
  const handleDateTimeChange = (name: string, value: string) => {
    switch (name) {
      case "startDate":
        setStartDate(value)
        break
      case "startTime":
        setStartTime(value)
        break
      case "endDate":
        setEndDate(value)
        break
      case "endTime":
        setEndTime(value)
        break
    }
  }

  const handleSaveDateTime = () => {
    if (!startDate || !startTime || !endDate || !endTime) {
      toast({
        title: "Missing Information",
        description: "All date and time fields are required",
        variant: "destructive"
      })
      return
    }

    const startDateTime = new Date(`${startDate}T${startTime}:00`)
    const endDateTime = new Date(`${endDate}T${endTime}:00`)
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
      EventStartDate: startDate,
      EventStartTime: `${startTime}:00`,
      EventEndDate: endDate,
      EventEndTime: `${endTime}:00`,
    }

    setEvents(prev => [...prev, newEvent])
    setStartDate("")
    setStartTime("")
    setEndDate("")
    setEndTime("")

    toast({
      title: "Success",
      description: "Date and time saved successfully",
    })
  }

  const handleDeleteEvent = (index: number) => {
    setEvents(prev => prev.filter((_, i) => i !== index))
  }

  // Form submission
  const handleSubmit = async (eventStatus: number) => {
    try {
      // Validation
      if (!formData.eventVisibility) {
        toast({
          title: "Validation Error",
          description: "Please select event visibility",
          variant: "destructive"
        })
        return
      }

      if (!formData.eventType) {
        toast({
          title: "Validation Error", 
          description: "Please select event type",
          variant: "destructive"
        })
        return
      }

      if (!selectedLocationType) {
        toast({
          title: "Validation Error",
          description: "Please select location type",
          variant: "destructive"
        })
        return
      }

      if (!formData.eventName) {
        toast({
          title: "Validation Error",
          description: "Please enter event name",
          variant: "destructive"
        })
        return
      }

      if (!formData.eventDescription || formData.eventDescription.length < 5) {
        toast({
          title: "Validation Error", 
          description: "Please enter event description with minimum 5 characters",
          variant: "destructive"
        })
        return
      }

      if (!formData.eventTermsAndConditions || formData.eventTermsAndConditions.length < 5) {
        toast({
          title: "Validation Error",
          description: "Please enter terms and conditions with minimum 5 characters", 
          variant: "destructive"
        })
        return
      }

      if (events.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one event date and time",
          variant: "destructive"
        })
        return
      }

      if (allImageFile.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please upload at least one carousel image",
          variant: "destructive"
        })
        return
      }

      if (selectedLanguages.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one language", 
          variant: "destructive"
        })
        return
      }

      if (!selectedAge) {
        toast({
          title: "Validation Error",
          description: "Please select age group",
          variant: "destructive"
        })
        return
      }

      if (!formData.feeValue) {
        toast({
          title: "Validation Error",
          description: "Please enter convenience fee value",
          variant: "destructive"
        })
        return
      }

      // Create FormData for submission
      const submitData = new FormData()
      
      // Add images
      allImageFile.forEach((image) => {
        submitData.append("CarouselImages", image)
      })

      if (galleryImages.length > 0) {
        galleryImages.forEach((image) => {
          submitData.append("GalleryImages", image)
        })
      }

      // Add form data
      submitData.append("EventType", formData.eventType)
      submitData.append("EventVisibility", formData.eventVisibility)
      submitData.append("EventName", formData.eventName)
      submitData.append("EventDescription", formData.eventDescription)
      submitData.append("EventTermsCondition", formData.eventTermsAndConditions)
      submitData.append("FeaturedEventFlag", formData.isFeatured ? "1" : "0")
      submitData.append("ConvinienceFeeUnit", formData.feeUnit.toString())
      submitData.append("ConvinienceFeeValue", formData.feeValue)
      submitData.append("Status", eventStatus.toString())
      submitData.append("TourEvent", eventSelectionFlag?.toString() || "0")
      
      if (user) {
        submitData.append("CreatedBy", user.AdminRole || role)
        submitData.append("createduser_id", user.user_id)
      }

      // Add location data
      if (selectedLocationType === "venue") {
        if (!formData.venueId) {
          toast({
            title: "Validation Error",
            description: "Please select a venue",
            variant: "destructive"
          })
          return
        }
        submitData.append("venue_id", formData.venueId)
        submitData.append("VenueToBeAnnounced", EventVenueTobeAnnounced.No.toString())
        submitData.append("OnlineEventFlag", IsOnlineEvent.No.toString())
        submitData.append("VenueEventFlag", IsVenueAvailable.Yes.toString())
      } else if (selectedLocationType === "online") {
        if (!formData.onlineEventUrl) {
          toast({
            title: "Validation Error",
            description: "Please enter online event URL",
            variant: "destructive"
          })
          return
        }
        submitData.append("Online_Event_Link", formData.onlineEventUrl)
        submitData.append("VenueToBeAnnounced", EventVenueTobeAnnounced.No.toString())
        submitData.append("VenueEventFlag", IsVenueAvailable.No.toString())
        submitData.append("OnlineEventFlag", IsOnlineEvent.Yes.toString())
      }

      // Add phone numbers
      if (formData.eventType === EventType.Booking.toString()) {
        submitData.append("BookingPhoneNumber", formData.bookingPhoneNumber || "9730589111")
      } else if (formData.eventType === EventType.WhatsApp.toString()) {
        submitData.append("WhatsAppPhoneNumber", formData.whatsappNumber || "9730589111")
      }

      // Add languages
      const languages = selectedLanguages.map(lang => lang.value)
      submitData.append("EventLanguages", JSON.stringify(languages))

      // Add age
      submitData.append("BestSuitedFor", selectedAge.value)

      // Add event dates
      submitData.append("EventDateTime", JSON.stringify(events))

      // Add video URL if provided
      if (formData.eventVideoUrl) {
        submitData.append("EventVedioUrl", formData.eventVideoUrl)
      }

      // Submit to API
      const authToken = getValidToken()
      if (!authToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in again",
          variant: "destructive"
        })
        return
      }

      // Use the appropriate endpoint based on role
      const endpoint = role === "superadmin" 
        ? process.env.NEXT_PUBLIC_API_BASE_URL + "/api/admin/events"
        : process.env.NEXT_PUBLIC_API_BASE_URL + "/api/organizer/events"

      const response = await fetch(endpoint, {
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
        throw new Error(errorData.message || "Failed to create event")
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Image Upload Section */}
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
                    onChange={handleFileChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {selectedImage && imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Selected"
                        className="w-full h-48 object-cover rounded"
                      />
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <ImagePlus className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-500">Add Image</p>
                      </div>
                    )}
                  </label>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-gray-600">
                    Only PNG or JPG files. 500 KB max size
                  </p>
                  <Button onClick={handleAddImage} variant="outline">
                    Upload Image
                  </Button>
                </div>
              </div>

              {/* Display uploaded images */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Details Form */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Visibility */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Event Visibility *</Label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="public"
                      name="eventVisibility"
                      value="1"
                      checked={formData.eventVisibility === "1"}
                      onChange={(e) => handleInputChange("eventVisibility", e.target.value)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="public">Public</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="private"
                      name="eventVisibility"
                      value="2"
                      checked={formData.eventVisibility === "2"}
                      onChange={(e) => handleInputChange("eventVisibility", e.target.value)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="private">Private</Label>
                  </div>
                </div>
              </div>

              {/* Event Type */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Event Type *</Label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="booking"
                      name="eventType"
                      value={EventType.Booking}
                      checked={formData.eventType === EventType.Booking.toString()}
                      onChange={(e) => handleInputChange("eventType", e.target.value)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="booking">Booking</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="registration"
                      name="eventType"
                      value={EventType.Registration}
                      checked={formData.eventType === EventType.Registration.toString()}
                      onChange={(e) => handleInputChange("eventType", e.target.value)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="registration">Registration</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="whatsapp"
                      name="eventType"
                      value={EventType.WhatsApp}
                      checked={formData.eventType === EventType.WhatsApp.toString()}
                      onChange={(e) => handleInputChange("eventType", e.target.value)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                  </div>
                </div>

                {/* Conditional phone number input */}
                {(formData.eventType === EventType.Booking.toString() || 
                  formData.eventType === EventType.WhatsApp.toString()) && (
                  <div className="space-y-2">
                    <Label>
                      {formData.eventType === EventType.Booking.toString() ? "Booking Phone No." : "Phone Number"}
                    </Label>
                    <Input
                      type="tel"
                      placeholder="Enter phone number"
                      value={formData.eventType === EventType.Booking.toString() ? 
                        formData.bookingPhoneNumber : formData.whatsappNumber}
                      onChange={(e) => handleInputChange(
                        formData.eventType === EventType.Booking.toString() ? 
                          "bookingPhoneNumber" : "whatsappNumber", 
                        e.target.value
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Location *</Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={selectedLocationType === "venue" ? "default" : "outline"}
                    onClick={() => setSelectedLocationType("venue")}
                    className="flex-1"
                  >
                    Venue
                  </Button>
                  <Button
                    type="button"
                    variant={selectedLocationType === "online" ? "default" : "outline"}
                    onClick={() => setSelectedLocationType("online")}
                    className="flex-1"
                  >
                    Online Event
                  </Button>
                  <Button
                    type="button"
                    variant={selectedLocationType === "tba" ? "default" : "outline"}
                    onClick={() => setSelectedLocationType("tba")}
                    className="flex-1"
                  >
                    To Be Announced
                  </Button>
                </div>

                {/* Conditional location inputs */}
                {selectedLocationType === "venue" && (
                  <div className="space-y-2">
                    <Label>Select Venue</Label>
                    <Select
                      value={formData.venueId}
                      onValueChange={(value) => handleInputChange("venueId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Venue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="venue1">Venue 1</SelectItem>
                        <SelectItem value="venue2">Venue 2</SelectItem>
                        <SelectItem value="create">+ Create Venue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedLocationType === "online" && (
                  <div className="space-y-2">
                    <Label>Online Event URL</Label>
                    <Input
                      type="url"
                      placeholder="Enter online event URL"
                      value={formData.onlineEventUrl}
                      onChange={(e) => handleInputChange("onlineEventUrl", e.target.value)}
                    />
                  </div>
                )}

                {selectedLocationType === "tba" && (
                  <div className="text-sm text-muted-foreground">
                    Venue details will be announced later
                  </div>
                )}
              </div>

              {/* Language Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Select Language *</Label>
                <Select
                  value={selectedLanguages.map(lang => lang.value).join(",")}
                  onValueChange={(value) => {
                    const selectedLang = indianLanguages.find(lang => lang.value === value)
                    if (selectedLang && !selectedLanguages.find(lang => lang.value === value)) {
                      setSelectedLanguages(prev => [...prev, selectedLang])
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select languages" />
                  </SelectTrigger>
                  <SelectContent>
                    {indianLanguages.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedLanguages.map((language, index) => (
                      <Badge key={index} variant="secondary">
                        {language.label}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-4 w-4 p-0"
                          onClick={() => setSelectedLanguages(prev => 
                            prev.filter((_, i) => i !== index)
                          )}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Age Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Select Age *</Label>
                <Select
                  value={selectedAge?.value || ""}
                  onValueChange={(value) => {
                    const age = yearsOptions.find(option => option.value === value)
                    setSelectedAge(age)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearsOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label>Add Video URL</Label>
                <Textarea
                  placeholder="Enter event video URL"
                  value={formData.eventVideoUrl}
                  onChange={(e) => handleInputChange("eventVideoUrl", e.target.value)}
                  rows={2}
                />
              </div>

              {/* Convenience Fee */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Convenience Fee Unit *</Label>
                  <Select
                    value={formData.feeUnit.toString()}
                    onValueChange={(value) => handleInputChange("feeUnit", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ConvinienceFeeUnit.Percentage.toString()}>Percentage</SelectItem>
                      <SelectItem value={ConvinienceFeeUnit.Fixed.toString()}>Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Convenience Fee Value *</Label>
                  <Input
                    type="number"
                    placeholder="Enter fee value"
                    value={formData.feeValue}
                    onChange={(e) => handleInputChange("feeValue", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Event Name */}
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Event Name *</Label>
                <Input
                  placeholder="Enter event name"
                  value={formData.eventName}
                  onChange={(e) => handleInputChange("eventName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Event Description *</Label>
                <Textarea
                  placeholder="Enter event description"
                  value={formData.eventDescription}
                  onChange={(e) => handleInputChange("eventDescription", e.target.value)}
                  rows={4}
                />
              </div>

              {/* Featured Event Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => handleInputChange("isFeatured", checked)}
                />
                <Label htmlFor="featured">Make as Featured Event</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Event Terms and Conditions *</Label>
                <Textarea
                  placeholder="Enter terms and conditions"
                  value={formData.eventTermsAndConditions}
                  onChange={(e) => handleInputChange("eventTermsAndConditions", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date and Time */}
          <Card>
            <CardHeader>
              <CardTitle>Add Date & Time *</CardTitle>
              <p className="text-sm text-muted-foreground">
                Single Day Event: Set start and end times. Multiple Day Event: Add another date for each day.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    min={formattedDate}
                    value={startDate}
                    onChange={(e) => handleDateTimeChange("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleDateTimeChange("startTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    min={startDate || formattedDate}
                    value={endDate}
                    onChange={(e) => handleDateTimeChange("endDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => handleDateTimeChange("endTime", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveDateTime} variant="outline">
                  Save Date & Time
                </Button>
              </div>

              {/* Display saved events */}
              {events.length > 0 && (
                <div className="space-y-2">
                  <Label>Saved Events:</Label>
                  {events.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="text-sm">
                        <p>{new Date(event.EventStartDate).toLocaleDateString()} - {new Date(event.EventEndDate).toLocaleDateString()}</p>
                        <p>{event.EventStartTime} - {event.EventEndTime}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteEvent(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setGalleryImages(prev => [...prev, ...files])
                    }}
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
              {galleryImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    {galleryImages.length} image(s) selected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => handleSubmit(EventStatus.Draft)}
        >
          Save as Draft
        </Button>
        <Button
          onClick={() => handleSubmit(EventStatus.Published)}
        >
          Publish Event
        </Button>
      </div>
    </div>
  )
}
