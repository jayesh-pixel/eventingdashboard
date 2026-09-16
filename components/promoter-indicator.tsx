"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { User, Plus } from "lucide-react"

interface PromoterIndicatorProps {
  promoterData?: {
    promoter_id?: string
    PromoterName?: string
    promoterName?: string
    FullName?: string
    fullName?: string
    Username?: string
  } | null
  onClick: () => void
  size?: "sm" | "md" | "lg"
  showAddOption?: boolean
}

export default function PromoterIndicator({ 
  promoterData, 
  onClick, 
  size = "sm", 
  showAddOption = false 
}: PromoterIndicatorProps) {
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

  // If no promoter and we can add one, show add button
  if (!promoterData && showAddOption) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        className="h-8 px-2 text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Promoter
      </Button>
    )
  }

  // If no promoter data, show empty state
  if (!promoterData) {
    return (
      <div className="flex items-center justify-center">
        <div className={`${getAvatarSize()} bg-muted rounded-full flex items-center justify-center`}>
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    )
  }

  const promoterName = promoterData.Username || promoterData.PromoterName || promoterData.promoterName || promoterData.FullName || promoterData.fullName || "Unknown Promoter"

  return (
    <button
      onClick={onClick}
      className="group relative cursor-pointer transition-all duration-200 hover:scale-105 flex-shrink-0"
      title={`Click to view ${promoterName} details`}
    >
      <Avatar className={`${getAvatarSize()} ring-2 ring-offset-2 ring-transparent group-hover:ring-primary/50 transition-all duration-200`}>
        <AvatarImage src="" alt={promoterName} />
        <AvatarFallback className="bg-gradient-to-br from-green-100 to-green-50 text-green-700 font-semibold text-xs group-hover:from-green-200 group-hover:to-green-100 transition-all duration-200">
          {getInitials(promoterName)}
        </AvatarFallback>
      </Avatar>
      
      {/* Hover indicator */}
      <div className="absolute -inset-1 bg-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 -z-10" />
    </button>
  )
}
