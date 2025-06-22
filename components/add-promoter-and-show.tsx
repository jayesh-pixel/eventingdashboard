"use client"

import { useState } from "react"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import AddNewPromoterModal from "./add-new-promoter-modal"

interface PromoterData {
  _id: string
  promoter_id: string
  PromoterName: string
}

interface AddPromoterAndShowProps {
  eventData: any
  onPromoterUpdate?: () => void
}

/**
 * Component for managing promoters in events
 * - Shows existing promoters as avatars for superadmin
 * - Allows adding/removing promoters through a modal
 * - For non-superadmin roles, shows promoter name as text
 */
const AddPromoterAndShow = ({ eventData, onPromoterUpdate }: AddPromoterAndShowProps) => {
  const promoterss = eventData.EventPromoter || []
  const eventID = eventData._id

  const [eventId, setEventId] = useState(eventID)
  const [promoters, setPromoters] = useState(promoterss)
  const [openAddPromoterModal, setOpenAddPromoterModal] = useState(false)
  const [openModalPromoterData, setOpenModalPromoterData] = useState<any[]>([])

  const handlerPromoter = (promoterData: any[]) => {
    setOpenAddPromoterModal(true)
    setOpenModalPromoterData(promoterData)
  }

  const handlePromoterUpdate = (newPromoters: any[]) => {
    setPromoters(newPromoters)
    // Call the parent callback to refresh the entire events list
    if (onPromoterUpdate) {
      onPromoterUpdate()
    }
  }
  return (
    <TooltipProvider>
      <div className="flex items-center">
        {promoters.length === 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlerPromoter(promoters)}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add promoter</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add promoters to this event</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center cursor-pointer">
            <div className="flex -space-x-2">
              {promoters.map((promoter: PromoterData, index: number) => {
                if (index < 4) {
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <Avatar
                          className="h-6 w-6 border-2 border-background cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => handlerPromoter(promoters)}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlerPromoter(promoters)}
                  className="h-6 w-6 p-0 ml-2 hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                  <span className="sr-only">Manage promoters</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage promoters for this event</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {openAddPromoterModal && (
          <AddNewPromoterModal
            open={openAddPromoterModal}
            onOpenChange={setOpenAddPromoterModal}
            openModalPromoterData={openModalPromoterData}
            eventId={eventId}
            onPromoterUpdate={handlePromoterUpdate}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

export default AddPromoterAndShow
