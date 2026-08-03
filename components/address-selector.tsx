"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { handleApiResponse, getApiErrorMessage } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface State {
  id: number
  name: string
  iso2: string
}

interface City {
  id: number
  name: string
}

interface AddressSelectorProps {
  stateIsoCode: string
  setStateIsoCode: (value: string) => void
  stateName: string
  setStateName: (value: string) => void
  cityIsoCode: string
  setCityIsoCode: (value: string) => void
  cityName: string
  setCityName: (value: string) => void
  className?: string
  required?: boolean
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  stateIsoCode,
  setStateIsoCode,
  stateName,
  setStateName,
  cityIsoCode,
  setCityIsoCode,
  cityName,
  setCityName,
  className = "",
  required = true,
}) => {
  const [stateData, setStateData] = React.useState<State[]>([])
  const [cityData, setCityData] = React.useState<City[]>([])
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()

  const API_KEY = "TUo5UThvYmNjckE0U294WmdzeFBtZmV4RzZlMUxhUHhTaG05TURVdQ=="

  // Fetch all states on component mount
  React.useEffect(() => {
    getAllStateData()
  }, [])

  React.useEffect(() => {
    if (!stateIsoCode && stateName && stateData.length > 0) {
      const matchingState = stateData.find(
        (state) => state.name.toLowerCase() === stateName.toLowerCase()
      )
      if (matchingState) setStateIsoCode(matchingState.iso2)
    }
  }, [stateData, stateIsoCode, stateName, setStateIsoCode])

  React.useEffect(() => {
    if (!cityIsoCode && cityName && cityData.length > 0) {
      const matchingCity = cityData.find(
        (city) => city.name.toLowerCase() === cityName.toLowerCase()
      )
      if (matchingCity) setCityIsoCode(matchingCity.id.toString())
    }
  }, [cityData, cityIsoCode, cityName, setCityIsoCode])

  const getAllStateData = async () => {
    try {
      setLoading(true)
      const config = {
        headers: {
          "X-CSCAPI-KEY": API_KEY,
        },
      }

      const response = await fetch(
        "https://api.countrystatecity.in/v1/countries/IN/states",
        {
          method: "GET",
          headers: config.headers,
        }
      )

      const data = await handleApiResponse(response)
      setStateData(data)
    } catch (error) {
      console.error("Error fetching states:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to fetch states"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getCities = async (selectedStateIso: string) => {
    try {
      setLoading(true)
      const config = {
        headers: {
          "X-CSCAPI-KEY": API_KEY,
        },
      }

      const response = await fetch(
        `https://api.countrystatecity.in/v1/countries/IN/states/${selectedStateIso}/cities`,
        {
          method: "GET",
          headers: config.headers,
        }
      )

      const data = await handleApiResponse(response)
      setCityData(data)
    } catch (error) {
      console.error("Error fetching cities:", error)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to fetch cities"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!stateIsoCode) {
      setCityData([])
      return
    }

    void getCities(stateIsoCode)
  }, [stateIsoCode])

  // Fetch cities when state changes
  const handleStateChange = (selectedStateIso: string) => {
    setStateIsoCode(selectedStateIso)

    // Find the selected state and set its name
    const selectedState = stateData.find((state) => state.iso2 === selectedStateIso)
    setStateName(selectedState ? selectedState.name : "")

    // Clear city selection when state changes
    setCityIsoCode("")
    setCityName("")
    setCityData([])
  }

  const handleCityChange = (selectedCityId: string) => {
    setCityIsoCode(selectedCityId)
    
    // Find the selected city and set its name
    const selectedCity = cityData.find((city) => city.id.toString() === selectedCityId)
    setCityName(selectedCity ? selectedCity.name : "")
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* State Selector */}
      <div className="space-y-2">
        <Label htmlFor="state">State{required ? " *" : ""}</Label>
        <Select value={stateIsoCode} onValueChange={handleStateChange} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading states..." : "Select State"} />
          </SelectTrigger>
          <SelectContent>
            {stateData.map((state) => (
              <SelectItem key={state.id} value={state.iso2}>
                {state.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City Selector */}
      <div className="space-y-2">
        <Label htmlFor="city">City{required ? " *" : ""}</Label>
        <Select 
          value={cityIsoCode} 
          onValueChange={handleCityChange} 
          disabled={!stateIsoCode || loading}
        >
          <SelectTrigger>
            <SelectValue 
              placeholder={
                !stateIsoCode 
                  ? "Select state first" 
                  : loading 
                    ? "Loading cities..." 
                    : "Select City"
              } 
            />
          </SelectTrigger>
          <SelectContent>
            {cityData.map((city) => (
              <SelectItem key={city.id} value={city.id.toString()}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
