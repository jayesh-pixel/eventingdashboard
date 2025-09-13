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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface OrganizerData {
  organizer_id?: string
  OrganizerName?: string
  organizerName?: string
}

interface OrganizerPopupProps {
  isOpen: boolean
  onClose: () => void
  organizerData: OrganizerData[] | OrganizerData | null
}

export default function OrganizerPopup({ isOpen, onClose, organizerData }: OrganizerPopupProps) {
  const { toast } = useToast()

  if (!organizerData) return null

  // Normalize to array format
  const organizers = Array.isArray(organizerData) ? organizerData : [organizerData]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[300px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <div>
              <div className="font-semibold text-base">
                Event Organizers ({organizers.length})
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {organizers.map((organizer, index) => {
            const organizerName = organizer.OrganizerName || organizer.organizerName || "Unknown Organizer"

            return (
              <div key={organizer.organizer_id || index} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-xs">
                    {organizerName.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{organizerName}</span>
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
