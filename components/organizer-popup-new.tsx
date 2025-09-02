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

interface OrganizerData {
  organizer_id?: string
  OrganizerName?: string
  organizerName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  joinedDate?: string
  totalEvents?: number
  status?: string
}

interface OrganizerPopupProps {
  isOpen: boolean
  onClose: () => void
  organizerData: OrganizerData | null
}

export default function OrganizerPopup({ isOpen, onClose, organizerData }: OrganizerPopupProps) {
  const { toast } = useToast()

  if (!organizerData) return null

  const organizerName = organizerData.OrganizerName || organizerData.organizerName || "Unknown Organizer"
  const organizerId = organizerData.organizer_id

  const copyOrganizerId = () => {
    if (organizerId) {
      navigator.clipboard.writeText(organizerId)
      toast({
        title: "Success",
        description: "Organizer ID copied to clipboard!",
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[380px] max-w-[90vw] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt={organizerName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-xs">
                {getInitials(organizerName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-base">{organizerName}</div>
              <div className="text-xs text-muted-foreground">Organizer Details</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Organizer ID */}
          {organizerId && (
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">ID:</span>
                <code className="text-xs bg-background px-1.5 py-0.5 rounded font-mono">
                  {organizerId.slice(0, 8)}...
                </code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyOrganizerId}
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
            
            {organizerData.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs break-all">{organizerData.email}</span>
              </div>
            )}
            
            {organizerData.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs">{organizerData.phone}</span>
              </div>
            )}
            
            {(organizerData.address || organizerData.city) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-xs">
                  {[organizerData.address, organizerData.city, organizerData.state, organizerData.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* Statistics */}
          <div className="space-y-2">
            <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
              Statistics
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted/30 rounded-md">
                <div className="text-xs text-muted-foreground">Total Events</div>
                <div className="text-sm font-semibold">{organizerData.totalEvents || 0}</div>
              </div>
              
              <div className="p-2 bg-muted/30 rounded-md">
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge variant="secondary" className="text-xs">
                  {organizerData.status || "Active"}
                </Badge>
              </div>
            </div>
            
            {organizerData.joinedDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">Joined {formatDate(organizerData.joinedDate)}</span>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* Actions */}
          <div className="flex gap-2">
            {organizerData.phone && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => window.open(`tel:${organizerData.phone}`, '_self')}
              >
                <Phone className="h-3 w-3 mr-1" />
                Call
              </Button>
            )}
            
            {organizerData.email && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => window.open(`mailto:${organizerData.email}`, '_self')}
              >
                <Mail className="h-3 w-3 mr-1" />
                Email
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
