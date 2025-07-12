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
  promoterData: PromoterData | null
  eventId?: string
}

export default function PromoterPopup({ isOpen, onClose, promoterData, eventId }: PromoterPopupProps) {
  const { toast } = useToast()

  if (!promoterData) return null

  const promoterName = promoterData.PromoterName || promoterData.promoterName || "Unknown Promoter"
  const promoterId = promoterData.promoter_id

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
          {/* Promoter ID */}
          {promoterId && (
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">ID:</span>
                <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono">
                  {promoterId.slice(0, 8)}...
                </code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyPromoterId}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}

          <Separator className="my-2" />

          {/* Contact Information */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h4>
            
            {promoterData.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs break-all">{promoterData.email}</span>
              </div>
            )}
            
            {promoterData.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs">{promoterData.phone}</span>
              </div>
            )}
            
            {(promoterData.address || promoterData.city) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-xs">
                  {[promoterData.address, promoterData.city, promoterData.state, promoterData.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {promoterData.totalEvents !== undefined && (
              <div className="text-center p-2 bg-muted/20 rounded-md">
                <div className="text-lg font-bold text-primary">{promoterData.totalEvents}</div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
            )}
            
            {promoterData.commissionRate !== undefined && (
              <div className="text-center p-2 bg-muted/20 rounded-md">
                <div className="text-lg font-bold text-green-600">{promoterData.commissionRate}%</div>
                <div className="text-xs text-muted-foreground">Commission</div>
              </div>
            )}
          </div>

          {/* Status */}
          {promoterData.status && (
            <div className="flex items-center justify-center">
              <Badge variant={promoterData.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {promoterData.status}
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
