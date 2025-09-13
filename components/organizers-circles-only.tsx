"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface OrganizerData {
  organizer_id?: string
  OrganizerName?: string
  organizerName?: string
  email?: string
  phone?: string
  role?: string
}

interface OrganizersCirclesOnlyProps {
  organizers: OrganizerData[]
  maxDisplay?: number
  size?: "sm" | "md" | "lg"
  onClick?: () => void
}

export default function OrganizersCirclesOnly({ 
  organizers, 
  maxDisplay = 3, 
  size = "sm",
  onClick
}: OrganizersCirclesOnlyProps) {
  if (!organizers || organizers.length === 0) {
    return (
      <div className="flex items-center">
        <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
          <span className="text-xs text-muted-foreground">?</span>
        </div>
      </div>
    )
  }

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

  // Multiple organizers - show only avatars with count, no text
  const displayedOrganizers = organizers.slice(0, maxDisplay)
  const remainingCount = organizers.length - maxDisplay

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center -space-x-2 cursor-pointer hover:scale-105 transition-transform"
            onClick={onClick}
          >
            {displayedOrganizers.map((organizer, index) => {
              const organizerName = organizer.OrganizerName || organizer.organizerName || "Unknown"
              return (
                <Avatar key={organizer.organizer_id || index} className={`${getAvatarSize()} border-2 border-background ring-1 ring-border/20 hover:ring-primary/50 transition-all`}>
                  <AvatarImage src="" alt={organizerName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 font-semibold text-xs">
                    {getInitials(organizerName)}
                  </AvatarFallback>
                </Avatar>
              )
            })}
            
            {/* Show count if more organizers */}
            {remainingCount > 0 && (
              <div className={`${getAvatarSize()} border-2 border-background bg-muted flex items-center justify-center rounded-full ring-1 ring-border/20`}>
                <span className="text-xs font-semibold text-muted-foreground">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold">
              {organizers.length} Organizer{organizers.length !== 1 ? 's' : ''}
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {organizers.map((organizer, index) => {
                const organizerName = organizer.OrganizerName || organizer.organizerName || "Unknown Organizer"
                return (
                  <div key={organizer.organizer_id || index} className="text-sm">
                    {organizerName}
                  </div>
                )
              })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}