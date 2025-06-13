"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { ShieldAlert } from "lucide-react"

export default function UnauthorizedPage() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-center">Access Denied</CardTitle>
          <CardDescription className="text-center">You don't have permission to access this page.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>Please contact your administrator if you believe this is an error.</p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button asChild className="w-full">
            <Link href="/">Go to Home</Link>
          </Button>
          <Button variant="outline" className="w-full" onClick={logout}>
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
