import { redirect } from "next/navigation"
import { use } from "react"
import type { UserRole } from "@/lib/navigation"

interface DashboardPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

export default function DashboardPage({ params }: DashboardPageProps) {
  // Handle params which might be a Promise
  const resolvedParams = params instanceof Promise ? use(params) : params
  const { role } = resolvedParams

  // Redirect to events page instead of showing dashboard
  redirect(`/${role}/events`)
}
