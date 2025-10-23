"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Phone, Mail, MapPin, User, Calendar, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PromoterData {
  promoter_id?: string
  PromoterName?: string
  promoterName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  joinedDate?: string
  totalEvents?: number
  commissionRate?: number
  status?: string
}

interface PromoterPopupProps {
  isOpen: boolean
  onClose: () => void
  promoterData: PromoterData[] | PromoterData | null
  eventId?: string
}

export default function PromoterPopup({ isOpen, onClose, promoterData, eventId }: PromoterPopupProps) {
  const { toast } = useToast()

  if (!promoterData) return null

  // Normalize to array format
  const promoters = Array.isArray(promoterData) ? promoterData : [promoterData]
  
  // If showing multiple promoters, use a simpler list view
  if (promoters.length > 1 || (promoters.length === 1 && !promoters[0].email && !promoters[0].phone)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[300px] max-w-[90vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <div>
                <div className="font-semibold text-base">
                  Event Promoters ({promoters.length})
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {promoters.map((promoter, index) => {
              const promoterName = promoter.PromoterName || promoter.promoterName || "Unknown Promoter"

              return (
                <div key={promoter.promoter_id || index} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-xs">
                      {promoterName.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">{promoterName}</span>
                </div>
              )
            })}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="text-sm">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Single promoter with detailed view
  const promoter = promoters[0]
  const promoterName = promoter.PromoterName || promoter.promoterName || "Unknown Promoter"
  const promoterId = promoter.promoter_id

  const copyPromoterId = () => {
    if (promoterId) {
      navigator.clipboard.writeText(promoterId)
      toast({
        title: "Success",
        description: "Promoter ID copied to clipboard!",
      })
    }
  }

  const copyPromoterLink = () => {
    if (eventId && promoterId) {
      const link = `${window.location.origin}/book/${eventId}?promoter=${promoterId}`
      navigator.clipboard.writeText(link)
      toast({
        title: "Success",
        description: "Promoter booking link copied to clipboard!",
      })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[380px] max-w-[90vw] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt={promoterName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-xs">
                {getInitials(promoterName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-base">{promoterName}</div>
              <div className="text-xs text-muted-foreground">Promoter Details</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Contact Information */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h4>
            
            {promoter.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs break-all">{promoter.email}</span>
              </div>
            )}
            
            {promoter.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs">{promoter.phone}</span>
              </div>
            )}
            
            {(promoter.address || promoter.city) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-xs">
                  {[promoter.address, promoter.city, promoter.state, promoter.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {promoter.totalEvents !== undefined && (
              <div className="text-center p-2 bg-muted/20 rounded-md">
                <div className="text-lg font-bold text-primary">{promoter.totalEvents}</div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
            )}
            
            {promoter.commissionRate !== undefined && (
              <div className="text-center p-2 bg-muted/20 rounded-md">
                <div className="text-lg font-bold text-green-600">{promoter.commissionRate}%</div>
                <div className="text-xs text-muted-foreground">Commission</div>
              </div>
            )}
          </div>

          {/* Status */}
          {promoter.status && (
            <div className="flex items-center justify-center">
              <Badge variant={promoter.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {promoter.status}
              </Badge>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            {eventId && promoterId && (
              <Button
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={copyPromoterLink}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Link
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="flex-1 text-xs h-8">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
