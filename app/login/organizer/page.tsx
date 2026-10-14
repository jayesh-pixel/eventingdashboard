"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { organizerEndpoint } from "@/lib/api-endpoints"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Eye, EyeOff, UserCheck } from "lucide-react"
import { Logo } from "@/components/logo"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, getLengthError, getUsernameError } from "@/lib/credential-limits"

export default function OrganizerLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { setUser } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const usernameError = getUsernameError(username)
  // Length only: an existing password with spaces at either end must still be accepted.
  const passwordError = getLengthError("Password", password, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      toast({ title: "Error", description: "Please enter both username and password", variant: "destructive" })
      return
    }
    if (usernameError || passwordError) {
      toast({ title: "Error", description: usernameError || passwordError, variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(organizerEndpoint.ORGANIZER_LOGIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Username: username, Password: password }),
      })
      const data = await response.json()
      if (!response.ok || data.error) throw new Error(data.message || "Login failed")
      setUser({ AdminRole: "organizer", user_id: data.data?.user_id || data.data?._id, Username: data.data?.Username || username, Email: data.data?.Email || "" })
      localStorage.setItem("authToken", JSON.stringify({ token: data.data?.token, expiresAt: Date.now() + 60 * 60 * 24 * 7 * 1000 }))
      document.cookie = `authToken=${data.data?.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      toast({ title: "Success", description: `Login successful as Organizer!` })
      router.replace("/organizer/dashboard")
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message || "An error occurred", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/80 via-accent/30 to-muted/80 relative overflow-hidden px-2 sm:px-4">
      {/* Decorative background shapes */}
      <div className="absolute -top-32 -left-32 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-accent opacity-20 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-0 right-0 w-[180px] h-[180px] sm:w-[300px] sm:h-[300px] bg-primary opacity-10 rounded-full blur-2xl z-0" />
      <Card className="w-full max-w-xs sm:max-w-md bg-white/80 dark:bg-card/80 shadow-2xl backdrop-blur-lg border-0 z-10 mx-auto">
        <CardHeader className="flex flex-col items-center gap-2">
          <Logo className="mb-2 w-32 sm:w-44" />
          <CardTitle className="text-2xl sm:text-3xl font-bold text-accent text-center">Organizer Login</CardTitle>
          <CardDescription className="text-center text-sm sm:text-base text-muted-foreground">Sign in to your organizer dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base font-medium">Username</Label>
              <Input id="username" type="text" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} disabled={isLoading} required autoComplete="username" aria-invalid={!!usernameError} className={`py-3 px-4 rounded-lg border-accent/30 focus:ring-2 focus:ring-accent/40 text-base${usernameError ? " border-red-500 focus:ring-red-500/40" : ""}`} />
              {usernameError && <p className="text-sm text-red-600">{usernameError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} required autoComplete="current-password" aria-invalid={!!passwordError} className={`py-3 px-4 rounded-lg border-accent/30 focus:ring-2 focus:ring-accent/40 text-base${passwordError ? " border-red-500 focus:ring-red-500/40" : ""}`} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full py-3 text-base sm:text-lg font-semibold bg-accent text-primary hover:bg-accent/90 transition" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>) : (<><UserCheck className="mr-2 h-4 w-4" />Sign in as Organizer</>)}
            </Button>
            {/* <Link href="#" className="text-sm text-accent hover:underline text-center">Forgot password?</Link> */}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
