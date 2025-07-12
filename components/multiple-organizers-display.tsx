"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"

interface OrganizerData {
  organizer_id?: string
  OrganizerName?: string
  organizerName?: string
  email?: string
  phone?: string
  role?: string
}

interface MultipleOrganizersDisplayProps {
  organizers: OrganizerData[]
  maxDisplay?: number
  size?: "sm" | "md" | "lg"
}

export default function MultipleOrganizersDisplay({ 
  organizers, 
  maxDisplay = 3, 
  size = "sm" 
}: MultipleOrganizersDisplayProps) {
  if (!organizers || organizers.length === 0) {
    return <span className="text-muted-foreground">Unknown Organizer</span>
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
      case "sm": return "h-6 w-6"
      case "md": return "h-8 w-8"
      case "lg": return "h-10 w-10"
      default: return "h-6 w-6"
    }
  }

  const getTextSize = () => {
    switch (size) {
      case "sm": return "text-xs"
      case "md": return "text-sm"
      case "lg": return "text-base"
      default: return "text-xs"
    }
  }

  // If only one organizer, show name directly
  if (organizers.length === 1) {
    const organizer = organizers[0]
    const organizerName = organizer.OrganizerName || organizer.organizerName || "Unknown Organizer"
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <Avatar className={getAvatarSize()}>
                <AvatarImage src="" alt={organizerName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 font-semibold text-xs">
                  {getInitials(organizerName)}
                </AvatarFallback>
              </Avatar>
              <span className={`font-medium ${getTextSize()}`}>{organizerName}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-semibold">{organizerName}</div>
              {organizer.email && (
                <div className="text-xs text-muted-foreground">
                  Email: {organizer.email}
                </div>
              )}
              {organizer.phone && (
                <div className="text-xs text-muted-foreground">
                  Phone: {organizer.phone}
                </div>
              )}
              {organizer.role && (
                <Badge variant="outline" className="text-xs">
                  {organizer.role}
                </Badge>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Multiple organizers - show avatars with count
  const displayedOrganizers = organizers.slice(0, maxDisplay)
  const remainingCount = organizers.length - maxDisplay

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            {/* Avatar Stack */}
            <div className="flex -space-x-2">
              {displayedOrganizers.map((organizer, index) => {
                const organizerName = organizer.OrganizerName || organizer.organizerName || "Unknown"
                return (
                  <Avatar key={organizer.organizer_id || index} className={`${getAvatarSize()} border-2 border-background`}>
                    <AvatarImage src="" alt={organizerName} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 font-semibold text-xs">
                      {getInitials(organizerName)}
                    </AvatarFallback>
                  </Avatar>
                )
              })}
              
              {/* Show count if more organizers */}
              {remainingCount > 0 && (
                <div className={`${getAvatarSize()} border-2 border-background bg-muted flex items-center justify-center rounded-full`}>
                  <span className="text-xs font-semibold text-muted-foreground">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </div>

            {/* Organizers label */}
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className={`font-medium ${getTextSize()}`}>
                {organizers.length} Organizer{organizers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="space-y-3">
            <div className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Organizers ({organizers.length})
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {organizers.map((organizer, index) => {
                const organizerName = organizer.OrganizerName || organizer.organizerName || "Unknown Organizer"
                return (
                  <div key={organizer.organizer_id || index} className="border-b border-border/30 pb-2 last:border-b-0 last:pb-0">
                    <div className="font-medium text-sm">{organizerName}</div>
                    {organizer.email && (
                      <div className="text-xs text-muted-foreground">
                        Email: {organizer.email}
                      </div>
                    )}
                    {organizer.phone && (
                      <div className="text-xs text-muted-foreground">
                        Phone: {organizer.phone}
                      </div>
                    )}
                    {organizer.role && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {organizer.role}
                      </Badge>
                    )}
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
