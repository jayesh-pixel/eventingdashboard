"use client"

import { useEffect, useState } from "react"
import { X, UserPlus, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { getValidToken } from "@/lib/token-utils"
import { promoterEndpoint, eventEndPoint } from "@/lib/api-endpoints"

interface PromoterData {
  _id: string
  Username: string
  PromoterName?: string
  email?: string
}

interface SelectedPromoter {
  promoter_id: string
  PromoterName: string
}

interface AddNewPromoterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  openModalPromoterData: SelectedPromoter[]
  eventId: string
  onPromoterUpdate: (newPromoters: any[]) => void
}

const AddNewPromoterModal = ({
  open,
  onOpenChange,
  openModalPromoterData,
  eventId,
  onPromoterUpdate,
}: AddNewPromoterModalProps) => {
  const { toast } = useToast()
  const [apiAllPromoterData, setApiAllPromoterData] = useState<PromoterData[]>([])
  const [selectedPromoterIds, setSelectedPromoterIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      getAllPromoterData()
    }
  }, [open])

  useEffect(() => {
    if (apiAllPromoterData.length > 0) {
      initializeSelectedPromoters()
    }
  }, [apiAllPromoterData])

  const getAllPromoterData = async () => {
    try {
      setLoading(true)
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(promoterEndpoint.GET_ALL_PROMOTER_DATA_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const allPromoterData = data.data || []
        setApiAllPromoterData(allPromoterData)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch promoters",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching promoters:", error)
      toast({
        title: "Error",
        description: "Failed to fetch promoters",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const initializeSelectedPromoters = () => {
    // Get currently selected promoter IDs from the event data
    const currentlySelected = (openModalPromoterData || []).map(
      (promoter) => promoter.promoter_id
    )
    setSelectedPromoterIds(currentlySelected)
  }

  const handlePromoterToggle = (promoterId: string) => {
    setSelectedPromoterIds((prev) => {
      if (prev.includes(promoterId)) {
        return prev.filter((id) => id !== promoterId)
      } else {
        return [...prev, promoterId]
      }
    })
  }

  const handleAddPromoters = async () => {
    try {
      setSubmitting(true)
      const authToken = getValidToken()
      
      if (!authToken) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        })
        return
      }

      const payload = {
        event_id: eventId,
        promoterIds: selectedPromoterIds,
      }

      const response = await fetch(eventEndPoint.ADD_PROMOTER_IN_EVENT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        onPromoterUpdate(data.data.EventPromoter)
        onOpenChange(false)
        toast({
          title: "Success",
          description: data.message || "Promoters updated successfully",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to update promoters",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating promoters:", error)
      toast({
        title: "Error",
        description: "Failed to update promoters",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getSelectedPromotersCount = () => selectedPromoterIds.length
  const getInitialPromotersCount = () => (openModalPromoterData || []).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Manage Event Promoters
          </DialogTitle>
          <DialogDescription>
            Select promoters to associate with this event
          </DialogDescription>
        </DialogHeader>        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading promoters...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Selected Promoters:</span>
              <Badge variant="secondary">
                {getSelectedPromotersCount()} selected
              </Badge>
            </div>

            {/* Scrollable Content */}
            <div className="max-h-[50vh] overflow-hidden">
              <ScrollArea className="h-[50vh]">
                <div className="space-y-4 pr-4">
                  {/* Currently Assigned Promoters Section */}
                  {openModalPromoterData && openModalPromoterData.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Currently Assigned Promoters</h3>
                      </div>
                      <div className="border rounded-md bg-muted/10">
                        <div className="p-3 space-y-2">
                          {openModalPromoterData.map((currentPromoter, index) => {
                            // Find the full promoter data from API to get more details
                            const fullPromoterData = apiAllPromoterData.find(
                              (p) => p._id === currentPromoter.promoter_id
                            )
                            
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-background rounded-md border border-border/30"
                              >
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {currentPromoter.PromoterName 
                                        ? currentPromoter.PromoterName.charAt(0).toUpperCase() 
                                        : "P"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {currentPromoter.PromoterName || fullPromoterData?.PromoterName || fullPromoterData?.Username || "Unknown Promoter"}
                                    </p>
                                    {fullPromoterData?.email && (
                                      <p className="text-xs text-muted-foreground">
                                        {fullPromoterData.email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    Current
                                  </Badge>
                                  <Checkbox
                                    checked={selectedPromoterIds.includes(currentPromoter.promoter_id)}
                                    onCheckedChange={() => handlePromoterToggle(currentPromoter.promoter_id)}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* All Available Promoters Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">All Available Promoters</h3>
                    </div>
                    <div className="border rounded-md">
                      <div className="p-4 space-y-3">
                        {apiAllPromoterData.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No promoters available
                          </div>
                        ) : (
                          apiAllPromoterData.map((promoter) => {
                            const isCurrentlyAssigned = (openModalPromoterData || []).some(
                              (currentPromoter) => currentPromoter.promoter_id === promoter._id
                            )
                            
                            return (
                              <div
                                key={promoter._id}
                                className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                                  isCurrentlyAssigned 
                                    ? 'bg-primary/5 border border-primary/20' 
                                    : 'hover:bg-muted/50'
                                }`}
                              >
                                <Checkbox
                                  id={promoter._id}
                                  checked={selectedPromoterIds.includes(promoter._id)}
                                  onCheckedChange={() => handlePromoterToggle(promoter._id)}
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className={`text-xs ${
                                    isCurrentlyAssigned 
                                      ? 'bg-primary/10 text-primary' 
                                      : 'bg-muted'
                                  }`}>
                                    {(promoter.PromoterName || promoter.Username)?.charAt(0).toUpperCase() || "P"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <label
                                    htmlFor={promoter._id}
                                    className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                                  >
                                    {promoter.PromoterName || promoter.Username}
                                    {isCurrentlyAssigned && (
                                      <Badge variant="secondary" className="text-xs">
                                        Assigned
                                      </Badge>
                                    )}
                                  </label>
                                  {promoter.email && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {promoter.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-border/20 flex-shrink-0">
              <div className="flex gap-2">
                {/* Quick Action Buttons */}
                {openModalPromoterData && openModalPromoterData.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPromoterIds([])}
                    disabled={submitting}
                    className="text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Remove All
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allPromoterIds = apiAllPromoterData.map(p => p._id)
                    setSelectedPromoterIds(allPromoterIds)
                  }}
                  disabled={submitting}
                  className="text-xs"
                >
                  Select All
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPromoters}
                  disabled={submitting}
                  className="min-w-[120px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {getSelectedPromotersCount() === 0 
                        ? "Remove All Promoters"
                        : getSelectedPromotersCount() !== getInitialPromotersCount()
                        ? "Update Promoters"
                        : "No Changes"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddNewPromoterModal
