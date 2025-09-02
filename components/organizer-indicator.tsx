"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { User, Plus } from "lucide-react"

interface OrganizerIndicatorProps {
  organizerData?: {
    organizer_id?: string
    OrganizerName?: string
    organizerName?: string
  } | null
  onClick: () => void
  size?: "sm" | "md" | "lg"
  showAddOption?: boolean
}

export default function OrganizerIndicator({ 
  organizerData, 
  onClick, 
  size = "sm", 
  showAddOption = false 
}: OrganizerIndicatorProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarSize = () => {
    switch (size) {
      case "sm": return "h-8 w-8"
      case "md": return "h-10 w-10"
      case "lg": return "h-12 w-12"
      default: return "h-8 w-8"
    }
  }

  // If no organizer and we can add one, show add button
  if (!organizerData && showAddOption) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        className="h-8 px-2 text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Organizer
      </Button>
    )
  }

  // If no organizer data, show empty state
  if (!organizerData) {
    return (
      <div className="flex items-center justify-center">
        <div className={`${getAvatarSize()} bg-muted rounded-full flex items-center justify-center`}>
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    )
  }

  const organizerName = organizerData.OrganizerName || organizerData.organizerName || "Unknown Organizer"

  return (
    <button
      onClick={onClick}
      className="group relative cursor-pointer transition-all duration-200 hover:scale-105 flex-shrink-0"
      title={`Click to view ${organizerName} details`}
    >
      <Avatar className={`${getAvatarSize()} ring-2 ring-offset-2 ring-transparent group-hover:ring-primary/50 transition-all duration-200`}>
        <AvatarImage src="" alt={organizerName} />
        <AvatarFallback className="bg-gradient-to-br from-green-100 to-green-50 text-green-700 font-semibold text-xs group-hover:from-green-200 group-hover:to-green-100 transition-all duration-200">
          {getInitials(organizerName)}
        </AvatarFallback>
      </Avatar>
      
      {/* Hover indicator */}
      <div className="absolute -inset-1 bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 -z-10" />
    </button>
  )
}
