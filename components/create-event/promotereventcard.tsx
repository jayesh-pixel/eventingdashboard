"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  BarChart3,
  Star,
  IndianRupee,
} from "lucide-react"

interface PromoterEventCardProps {
  event: any
  onCheckReport: (eventId: string) => void
  onBookTicket: (eventId: string, arrangedEventDateTime?: any[]) => void
  formatDate: (dateString: string) => string
  formatTime: (dateString: string) => string
  stripHtmlTags: (html: string) => string
  getStatusBadgeVariant: (status: string | number) => "default" | "secondary" | "outline" | "destructive"
  normalizeEventStatus: (status: number | string) => string
}

export default function PromoterEventCard({
  event,
  onCheckReport,
  onBookTicket,
  formatDate,
  formatTime,
  stripHtmlTags,
  getStatusBadgeVariant,
  normalizeEventStatus,
}: PromoterEventCardProps) {
  return (
    <Card
      key={event._id}
      className="group w-full max-w-xs rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-card border -mt-16 border-border"
    >
      {/* Image */}
      <div className="relative w-full h-48">
        <img
          src={event.eventImage || "/placeholder.svg"}
          alt={event.eventName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Featured badge */}
        {event.featuredEvent && (
          <div className="absolute top-2 left-2 bg-yellow-500 text-white px-3 py-1 text-xs font-semibold rounded-full shadow-md flex items-center gap-1">
            <Star className="w-3 h-3 fill-white" />
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Event name */}
        <h3
          className="font-semibold text-base truncate group-hover:text-primary transition-colors"
          title={event.eventName}
        >
          {event.eventName}
        </h3>



        {/* Date & Time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{formatDate(event.eventStartDate)}</span>
          <Clock className="h-4 w-4 text-primary ml-2" />
          <span>{formatTime(event.eventStartDate)}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium truncate">{event.venueName}</span>
          <span className="ml-1">| {event.city}</span>
        </div>



        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onCheckReport(event._id)
            }}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Report
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-primary"
            onClick={(e) => {
              e.stopPropagation()
              onBookTicket(event._id, event.arrangedEventDateTime)
            }}
          >
            <IndianRupee className="h-4 w-4 mr-1" />
            Book
          </Button>
        </div>
      </div>
    </Card>
  )
}
