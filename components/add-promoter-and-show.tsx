"use client"

import { useEffect, useState } from "react"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import AddNewPromoterModal from "./add-new-promoter-modal"
 import { useAuth } from "@/lib/auth-context"
import type { UserRole } from "@/lib/navigation"
import { authFetch } from "@/lib/auth-fetch"
import { getValidToken } from "@/lib/token-utils"
import { promoterEndpoint } from "@/lib/api-endpoints"

interface PromoterData {
  _id: string
  promoter_id: string
  PromoterName: string
  Username?: string
  FullName?: string
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
  const { user } = useAuth()
  // PopUpPromoterData carries the display-ready { promoter_id, PromoterName };
  // EventPromoter is a reference-only array without the name, so prefer PopUpPromoterData.
  const promoterss = eventData.PopUpPromoterData || eventData.EventPromoter || []
  const eventID = eventData._id

  const [eventId, setEventId] = useState(eventID)
  const [promoters, setPromoters] = useState(promoterss)
  const [openAddPromoterModal, setOpenAddPromoterModal] = useState(false)
  const [openModalPromoterData, setOpenModalPromoterData] = useState<any[]>([])

  // Re-sync when the parent re-fetches the event (useState only reads its initial value)
  useEffect(() => {
    setEventId(eventData._id)
    setPromoters(eventData.PopUpPromoterData || eventData.EventPromoter || [])
  }, [eventData])

  // Check if user has permission to manage promoters (only SuperAdmin)
  const userRole = user?.AdminRole?.toLowerCase() as UserRole
  const canManagePromoters = userRole === "superadmin"

  const handlerPromoter = (promoterData: any[]) => {
    if (!canManagePromoters) {
      // For non-SuperAdmin users, do nothing or show a message
      return
    }
    setOpenAddPromoterModal(true)
    setOpenModalPromoterData(promoterData)
  }

  // /events/addpromoter returns EventPromoter, which only holds promoter ids; attach the names
  // (from the promoters already shown, else from the promoter list) so the avatars stay labelled
  const resolvePromoterNames = async (assigned: any[]): Promise<any[]> => {
    const names = new Map<string, string>()
    promoters.forEach((promoter: PromoterData) => {
      const name = promoter.PromoterName || promoter.Username || promoter.FullName
      if (promoter.promoter_id && name) names.set(promoter.promoter_id, name)
    })

    if (assigned.some((promoter) => !names.has(promoter.promoter_id))) {
      try {
        const authToken = getValidToken()
        const response = await authFetch(promoterEndpoint.GET_ALL_PROMOTER_DATA_URL, {
          method: "GET",
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (response.ok) {
          const data = await response.json()
          ;(data.data || []).forEach((promoter: any) => {
            const name = promoter.Username || promoter.FullName
            if (promoter._id && name) names.set(promoter._id, name)
          })
        }
      } catch (error) {
        console.warn("Could not resolve promoter names (handled):", error)
      }
    }

    return assigned.map((promoter) => ({
      ...promoter,
      PromoterName: promoter.PromoterName || names.get(promoter.promoter_id),
    }))
  }

  const handlePromoterUpdate = async (newPromoters: any[]) => {
    setPromoters(await resolvePromoterNames(newPromoters || []))
    // Call the parent callback to refresh the entire events list
    if (onPromoterUpdate) {
      onPromoterUpdate()
    }
  }
  // For SuperAdmin - full management capabilities  
  if (canManagePromoters) {
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
                              {(promoter.Username || promoter.PromoterName || (promoter as any).FullName) ? (promoter.Username || promoter.PromoterName || (promoter as any).FullName).charAt(0).toUpperCase() : "P"}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{promoter.Username || promoter.PromoterName || (promoter as any).FullName || "Unknown Promoter"}</p>
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
                          {promoter.Username || promoter.PromoterName || (promoter as any).FullName || "Unknown Promoter"}
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

  // For non-SuperAdmin users (organizers) - read-only view
  return (
    <TooltipProvider>
      <div className="flex items-center">
        {promoters.length === 0 ? (
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
        ) : (
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {promoters.map((promoter: PromoterData, index: number) => {
                if (index < 4) {
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-xs bg-muted">
                            {promoter.Username || promoter.PromoterName ? (promoter.Username || promoter.PromoterName).charAt(0).toUpperCase() : "P"}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{promoter.Username || promoter.PromoterName || (promoter as any).FullName || "Unknown Promoter"}</p>
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
                  <span className="ml-2 text-sm text-muted-foreground font-medium">
                    +{promoters.length - 4}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">Additional promoters:</p>
                    {promoters.slice(4).map((promoter: PromoterData, index: number) => (
                      <p key={index} className="text-sm">
                        {promoter.Username || promoter.PromoterName || (promoter as any).FullName || "Unknown Promoter"}
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-2 text-xs text-muted-foreground">
                  (Assigned by SuperAdmin)
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Only SuperAdmin can manage promoter assignments</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default AddPromoterAndShow
