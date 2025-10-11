"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Users } from "lucide-react"

interface PromoterData {
  _id: string
  promoter_id: string
  PromoterName: string
}

interface OrganizerPromoterViewProps {
  promoters: PromoterData[]
  onPromoterClick?: (promoterData: PromoterData[], eventId: string) => void
  eventId?: string
}

/**
 * Read-only promoter display component for organizers
 * - Shows existing promoters as avatars without management controls
 * - Organizers can view promoter details but cannot add/remove promoters
 */
const OrganizerPromoterView = ({ 
  promoters = [], 
  onPromoterClick,
  eventId = ""
}: OrganizerPromoterViewProps) => {
  const handleClick = () => {
    if (onPromoterClick && promoters.length > 0) {
      onPromoterClick(promoters, eventId)
    }
  }

  if (promoters.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="h-4 w-4 mr-1" />
              No promoters assigned
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>No promoters have been assigned to this event by the SuperAdmin</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex items-center cursor-pointer" onClick={handleClick}>
        <div className="flex -space-x-2">
          {promoters.map((promoter: PromoterData, index: number) => {
            if (index < 4) {
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Avatar
                      className="h-6 w-6 border-2 border-background cursor-pointer hover:scale-105 transition-transform"
                    >
                      <AvatarFallback className="text-xs bg-muted">
                        {promoter.PromoterName ? promoter.PromoterName.charAt(0).toUpperCase() : "P"}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{promoter.PromoterName || "Unknown Promoter"}</p>
                  </TooltipContent>
                </Tooltip>
              )
            }
            return null
          })}
        </div>
        {promoters.length > 4 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-2 text-sm text-muted-foreground font-medium cursor-pointer">
                +{promoters.length - 4}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-medium">Additional promoters:</p>
                {promoters.slice(4).map((promoter: PromoterData, index: number) => (
                  <p key={index} className="text-sm">
                    {promoter.PromoterName || "Unknown Promoter"}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        {promoters.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-2 text-xs text-muted-foreground">
                (View only)
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Assigned by SuperAdmin - View promoter details</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

export default OrganizerPromoterView