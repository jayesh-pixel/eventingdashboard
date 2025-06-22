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
  Phone,
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
  return (    <Card
      key={event._id}
      className="group overflow-hidden hover:shadow-md transition-all duration-200 border bg-card cursor-pointer h-fit"
      style={{ maxWidth: 380, minWidth: 320, width: "100%" }}
    >
      {/* Enhanced Image Section with Overlay Effects */}
      <div className="relative overflow-hidden">    
            <div className="aspect-[16/10] overflow-hidden">
          <img
            src={event.eventImage || "/placeholder.svg"}
            alt={event.eventName}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
          />
        </div>        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-40 group-hover:opacity-50 transition-opacity duration-200" />
        
        {/* Status Badge with enhanced styling */}
        <div className="absolute top-4 right-4">
          {/* <Badge 
            variant={getStatusBadgeVariant(event.eventStatus)} 
            className="shadow-lg backdrop-blur-md bg-background/90 border-background/20 text-xs font-medium px-3 py-1"
          >
            {normalizeEventStatus(event.eventStatus)}
          </Badge> */}
        </div>        {/* Featured Badge with enhanced styling */}
        {event.featuredEvent && (
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
              <Star className="h-3 w-3 fill-current" />
              Featured
            </div>
          </div>
        )}
      </div>{/* Simplified Content Section - Essential Details Only */}
      <div className="p-5 space-y-4">
        {/* Event Title */}
        <div className="space-y-2">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300">
            {event.eventName}
          </h3>
        </div>

        {/* Essential Event Details - Date, Time, Location */}
        <div className="space-y-3">
          {/* Date & Time */}
          <div className="flex items-center gap-3 text-sm text-foreground bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 flex-1">
              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium">{formatDate(event.eventStartDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium">{formatTime(event.eventStartDate)}</span>
            </div>
          </div>

          {/* Location - City Only */}
          <div className="flex items-center gap-3 text-sm text-foreground bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg p-3 border border-border/30">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-medium">{event.city}</span>
          </div>
        </div>        {/* Desktop Action Buttons with improved styling */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1 text-sm hover:bg-primary/5 transition-colors duration-200" 
            onClick={(e) => {
              e.stopPropagation()
              onCheckReport(event._id)
            }}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Report
          </Button>
          <Button 
            size="sm" 
            className="flex-1 text-sm bg-primary hover:bg-primary/90 transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation()
              onBookTicket(event._id, event.arrangedEventDateTime)
            }}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Book Tickets
          </Button>
        </div>
      </div>
    </Card>
  )
}
