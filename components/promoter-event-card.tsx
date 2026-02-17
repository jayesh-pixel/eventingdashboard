"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  IndianRupee,
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
  return (
    <Card
      key={event._id}
      className="group flex h-full flex-col overflow-visible hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border-0 bg-gradient-to-br from-card/95 to-card/85 backdrop-blur-md hover:from-card/100 hover:to-card/95 cursor-pointer"
      style={{ maxWidth: 410, minWidth: 340, width: "100%", height: "100%" }}
    >
      {/* Enhanced Image Section with Overlay Effects */}
      <div className="relative overflow-hidden">
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={event.eventImage || "/placeholder.svg"}
            alt={event.eventName}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
          />
        </div>
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-70 transition-opacity duration-300" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />                      
        
        {/* Status Badge with enhanced styling */}
        <div className="absolute top-4 right-4">
          <Badge 
            variant={getStatusBadgeVariant(event.eventStatus)} 
            className="shadow-lg backdrop-blur-md bg-background/90 border-background/20 text-xs font-medium px-3 py-1"
          >
            {normalizeEventStatus(event.eventStatus)}
          </Badge>
        </div>

        {/* Featured Badge with enhanced styling */}
        {event.featuredEvent && (
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
              <Star className="h-3 w-3 fill-current" />
              Featured
            </div>
          </div>
        )}

        {/* Quick Action Overlay with improved positioning */}
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 bg-white/95 hover:bg-white text-black border-0 shadow-lg text-xs font-medium backdrop-blur-sm hover:shadow-xl transition-all duration-200" 
              onClick={(e) => {
                e.stopPropagation()
                onCheckReport(event._id)
              }}
            >
              <BarChart3 className="h-3 w-3 mr-1.5" />
              Analytics
            </Button>
            <Button 
              size="sm" 
              className="flex-1 bg-primary/95 hover:bg-primary text-primary-foreground border-0 shadow-lg text-xs font-medium backdrop-blur-sm hover:shadow-xl transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation()
                onBookTicket(event._id, event.arrangedEventDateTime)
              }}
            >
              <IndianRupee className="h-3 w-3 mr-1.5" />
              Book Now
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Content Section */}
      <div className="p-5 flex flex-1 flex-col gap-4 overflow-visible">
        {/* Header with improved typography */}
        <div className="space-y-2">
          <h3 className="min-h-[3.25rem] font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300">
            {event.eventName}
          </h3>
          <div 
            className="min-h-[4.5rem] text-sm text-muted-foreground line-clamp-3 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: stripHtmlTags(event.eventDescription).length > 100 
                ? stripHtmlTags(event.eventDescription).substring(0, 100) + '...' 
                : stripHtmlTags(event.eventDescription)
            }}
          />
        </div>

        {/* Event Details Grid with enhanced styling */}
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

          {/* Location */}
          <div className="flex items-center gap-3 text-sm text-foreground bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg p-3 border border-border/30">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium block truncate">
                {event.venueName}
              </span>
              <span className="text-muted-foreground text-xs">
                {event.city}
              </span>
            </div>
          </div>

          {/* Organizer */}
          <div className="flex items-center gap-3 text-sm text-foreground bg-gradient-to-r from-muted/40 to-muted/20 rounded-lg p-3 border border-border/30">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-medium truncate">{event.organizerName}</span>
          </div>
        </div>

        {/* Enhanced badges and info sections */}
        <div className="space-y-3">
          {/* Category */}
          {event.categoryName && (
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-medium px-3 py-1">
                🎯 {event.categoryName}
              </Badge>
            </div>
          )}

          {/* Additional Info sections with improved styling */}
          {event.bestSuitedFor && (
            <div className="p-3 bg-gradient-to-r from-blue-50/80 to-blue-100/80 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 text-center">
                👥 Best suited for age {event.bestSuitedFor}+
              </div>
            </div>
          )}

          {/* Contact Info */}
          {event.bookingPhoneNumber && (
            <div className="p-3 bg-gradient-to-r from-green-50/80 to-green-100/80 dark:from-green-950/30 dark:to-green-900/30 rounded-lg border border-green-200/50 dark:border-green-800/50">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-800 dark:text-green-200">{event.bookingPhoneNumber}</span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Action Buttons with improved styling */}
        <div className="mt-auto flex gap-3 pt-2 overflow-visible">
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1 text-sm border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 font-medium" 
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
            className="flex-1 text-sm bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
            style={{ minWidth: 0, whiteSpace: "nowrap" }}
            onClick={(e) => {
              e.stopPropagation()
              onBookTicket(event._id, event.arrangedEventDateTime)
            }}
          >
            <IndianRupee className="h-4 w-4 mr-2" />
            Book Tickets
          </Button>
        </div>
      </div>
    </Card>
  )
}
