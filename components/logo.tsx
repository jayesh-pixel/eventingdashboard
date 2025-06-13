"use client"

import Image from "next/image"
import { useState } from "react"

interface LogoProps {
  collapsed?: boolean
  className?: string
}

export function Logo({ collapsed = false, className = "" }: LogoProps) {
  const [imageError, setImageError] = useState(false)

  // Fallback text logo if image fails to load
  const FallbackLogo = () => (
    <div className={`font-bold text-white ${collapsed ? "text-lg" : "text-xl"} ${className}`}>
      {collapsed ? "EC" : "EventingClub"}
    </div>
  )

  if (imageError) {
    return <FallbackLogo />
  }

  return (
    <div className={className}>
      <Image
        src={collapsed ? "/images/eventing-club-logo.svg" : "/images/eventing-club-logo.svg"}
        alt="EventingClub Logo"
        width={collapsed ? 48 : 180}
        height={collapsed ? 48 : 60}
        priority
        className="object-contain"
        onError={() => {
          console.warn("Logo image failed to load, using fallback")
          setImageError(true)
        }}
        onLoad={() => {
          console.log("Logo loaded successfully")
        }}
      />
    </div>
  )
}
