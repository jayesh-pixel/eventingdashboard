"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

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
  className = ""
}) => {
  const [stateData, setStateData] = React.useState<State[]>([])
  const [cityData, setCityData] = React.useState<City[]>([])
  const [loading, setLoading] = React.useState(false)

  const API_KEY = "TUo5UThvYmNjckE0U294WmdzeFBtZmV4RzZlMUxhUHhTaG05TURVdQ=="

  // Fetch all states on component mount
  React.useEffect(() => {
    getAllStateData()
  }, [])

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setStateData(data)
    } catch (error) {
      console.error("Error fetching states:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch cities when state changes
  const handleStateChange = async (selectedStateIso: string) => {
    setStateIsoCode(selectedStateIso)
    
    // Find the selected state and set its name
    const selectedState = stateData.find((state) => state.iso2 === selectedStateIso)
    setStateName(selectedState ? selectedState.name : "")

    // Clear city selection when state changes
    setCityIsoCode("")
    setCityName("")
    setCityData([])

    if (!selectedStateIso) return

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setCityData(data)
    } catch (error) {
      console.error("Error fetching cities:", error)
    } finally {
      setLoading(false)
    }
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
        <Label htmlFor="state">State *</Label>
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
        <Label htmlFor="city">City *</Label>
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
