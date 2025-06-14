"use client"

import { useEffect, useState } from "react"

interface LogoProps {
  collapsed?: boolean
  className?: string
}

export function Logo({ collapsed = false, className = "" }: LogoProps) {
  const [isClient, setIsClient] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient || imageError) {
    // Render nothing if SSR or image fails
    return null
  }

  return (
    <div className={className}>
      <img
        src={collapsed ? "/images/eventing-club-logo.svg" : "/images/eventing-club-logo.svg"}
        alt="EventingClub Logo"
        width={collapsed ? 48 : 180}
        height={collapsed ? 48 : 60}
        className="object-contain"
        onError={() => setImageError(true)}
        loading="eager"
        draggable={false}
      />
    </div>
  )
}
