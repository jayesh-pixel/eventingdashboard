"use client"

import { useState } from "react"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import AddNewOrganizerModal from "./add-new-organizer-modal"

interface OrganizerData {
  _id: string
  organizer_id: string
  OrganizerName: string
}

interface AddOrganizerAndShowProps {
  eventData: any
  onOrganizerUpdate?: () => void
}

/**
 * Component for managing organizers in events
 * - Shows existing organizers as avatars for superadmin
 * - Allows adding/removing organizers through a modal
 * - For non-superadmin roles, shows organizer name as text
 */
const AddOrganizerAndShow = ({ eventData, onOrganizerUpdate }: AddOrganizerAndShowProps) => {
  const organizers = eventData.EventOrganizers || []
  const eventID = eventData._id

  const [eventId, setEventId] = useState(eventID)
  const [currentOrganizers, setCurrentOrganizers] = useState(organizers)
  const [openAddOrganizerModal, setOpenAddOrganizerModal] = useState(false)
  const [openModalOrganizerData, setOpenModalOrganizerData] = useState<any[]>([])

  const handlerOrganizer = (organizerData: any[]) => {
    setOpenAddOrganizerModal(true)
    setOpenModalOrganizerData(organizerData)
  }

  const handleOrganizerUpdate = (newOrganizers: any[]) => {
    setCurrentOrganizers(newOrganizers)
    // Call the parent callback to refresh the entire events list
    if (onOrganizerUpdate) {
      onOrganizerUpdate()
    }
  }

  return (
    <TooltipProvider>
      <div className="flex items-center">
        {currentOrganizers.length === 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlerOrganizer(currentOrganizers)}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add organizer</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add organizers to this event</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center cursor-pointer">
            <div className="flex -space-x-2">
              {currentOrganizers.map((organizer: OrganizerData, index: number) => {
                if (index < 4) {
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <Avatar
                          className="h-6 w-6 border-2 border-background cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => handlerOrganizer(currentOrganizers)}
                        >
                          <AvatarFallback className="text-xs bg-muted">
                            {organizer.OrganizerName ? organizer.OrganizerName.charAt(0).toUpperCase() : "O"}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{organizer.OrganizerName || "Unknown Organizer"}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }
                return null
              })}
            </div>
            {currentOrganizers.length > 4 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-2 text-sm text-muted-foreground font-medium cursor-pointer">
                    +{currentOrganizers.length - 4}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">Additional organizers:</p>
                    {currentOrganizers.slice(4).map((organizer: OrganizerData, index: number) => (
                      <p key={index} className="text-sm">
                        {organizer.OrganizerName || "Unknown Organizer"}
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
                  onClick={() => handlerOrganizer(currentOrganizers)}
                  className="h-6 w-6 p-0 ml-2 hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                  <span className="sr-only">Manage organizers</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage organizers for this event</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {openAddOrganizerModal && (
          <AddNewOrganizerModal
            open={openAddOrganizerModal}
            onOpenChange={setOpenAddOrganizerModal}
            openModalOrganizerData={openModalOrganizerData}
            eventId={eventId}
            onOrganizerUpdate={handleOrganizerUpdate}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

export default AddOrganizerAndShow
