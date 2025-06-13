"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { authEndpoints, organizerEndpoint, promoterEndPointPannel } from "@/lib/api-endpoints"
import { Loader2, Eye, EyeOff, UserCheck } from "lucide-react"
import { Logo } from "@/components/logo"

type LoginRole = "superadmin" | "organizer" | "promoter"

interface RoleOption {
  value: LoginRole
  label: string
  description: string
  endpoint: string
}

const roleOptions: RoleOption[] = [
  // {
  //   value: "superadmin",
  //   label: "Super Admin",
  //   description: "Full system access and management",
  //   endpoint: authEndpoints.LOGIN_API,
  // },
  // {
  //   value: "organizer",
  //   label: "Organizer",
  //   description: "Event creation and management",
  //   endpoint: organizerEndpoint.ORGANIZER_LOGIN_API_URL,
  // },
  {
    value: "promoter",
    label: "Promoter",
    description: "",
    endpoint: promoterEndPointPannel.LOGIN_PROMOTER_URL,
  },
]

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { setUser } = useAuth()

  const [selectedRole, setSelectedRole] = useState<LoginRole>("superadmin")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const getSelectedRoleOption = () => {
    return roleOptions.find((option) => option.value === selectedRole) || roleOptions[0]
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      })
      return
    }

    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const roleOption = getSelectedRoleOption()
      console.log("Attempting login with:", {
        role: selectedRole,
        username,
        endpoint: roleOption.endpoint,
      })

      const requestPayload = {
        Username: username,
        Password: password,
      }

      const response = await fetch(roleOption.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      })

      const responseText = await response.text()
      console.log("Raw response:", responseText)

      if (!response.ok) {
        console.error("Login failed with status:", response.status, "Response:", responseText)

        let errorMessage = `Login failed: Status ${response.status}`

        try {
          const errorData = JSON.parse(responseText)
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.error && typeof errorData.error === "string") {
            errorMessage = errorData.error
          } else if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.join(", ")
          }
        } catch (parseError) {
          // If JSON parsing fails, use the raw response or a generic message
          if (responseText && responseText.length < 200) {
            errorMessage = responseText
          } else {
            errorMessage = `Authentication failed. Please check your credentials.`
          }
        }

        throw new Error(errorMessage)
      }

      let userData
      let token

      // First try to parse as JSON
      try {
        const data = JSON.parse(responseText)
        console.log("Parsed response data:", data)

        if (data && typeof data === "object") {
          // Handle the actual API response structure
          if (data.error === false && data.message === "Login successfully" && data.data) {
            console.log("Login successful with API data structure")
            console.log("🔍 API Response data.data:", data.data)
            console.log("🔍 Available user_id fields:")
            console.log("  - data.data.user_id:", data.data.user_id)
            console.log("  - data.data._id:", data.data._id)
            console.log("  - data.data.id:", data.data.id)
            
            token = data.data.token
            const extractedUserId = data.data.user_id || data.data._id
            console.log("🎯 Final extracted user_id:", extractedUserId)

            userData = {
              AdminRole: selectedRole,
              user_id: extractedUserId,  // Try user_id first, then _id
              Username: data.data.Username || username,
              Email: data.data.Email || "",
            }
          } else if (data.token && data.data) {
            console.log("Login successful with full data structure")
            token = data.token

            userData = {
              AdminRole: selectedRole,
              user_id: data.data.user_id || data.data._id || data.data.id,
              Username: data.data.Username || data.data.username || username,
              Email: data.data.Email || data.data.email || "",
            }
          } else if (data.success || data.message === "Login successfully") {
            userData = {
              AdminRole: selectedRole,
              user_id: data.user_id || `user_${Date.now()}`,
              Username: data.Username || username,
              Email: data.Email || "",
            }
            token = data.token || `token_${Date.now()}`
          } else if (data.data && !data.token) {
            userData = {
              AdminRole: selectedRole,
              user_id: data.data.user_id || data.data._id || data.data.id || `user_${Date.now()}`,
              Username: data.data.Username || data.data.username || username,
              Email: data.data.Email || data.data.email || "",
            }
            token = `token_${Date.now()}`
          } else {
            throw new Error("Unexpected response structure from server")
          }
        } else {
          throw new Error("Invalid response format")
        }
      } catch (parseError) {
        // If JSON parsing fails, treat as simple success message
        console.log("Could not parse as JSON, treating as simple success message")
        console.log("Parse error:", parseError)
        
        if (responseText === "Login successfully" || responseText.includes("Login successfully")) {
          console.log("Login successful - simple success message received")

          userData = {
            AdminRole: selectedRole,
            user_id: `user_${Date.now()}`,
            Username: username,
            Email: "",
          }

          token = `token_${Date.now()}`
        } else {
          throw new Error("Unexpected response format from server")
        }
      }

      console.log("🎉 ===== LOGIN SUCCESSFUL =====")
      console.log("🔐 Setting user data:", userData)
      console.log("🔑 Setting token:", token)
      console.log("👤 FINAL USER_ID BEING STORED:", userData.user_id)
      console.log("📝 Username:", userData.Username)
      console.log("🏷️ Role:", userData.AdminRole)
      console.log("================================")

      // Set token expiration time (7 days from now)
      const expirationTime = Date.now() + (60 * 60 * 24 * 7 * 1000) // 7 days in milliseconds
      
      // Store token with expiration time in localStorage
      const tokenData = {
        token: token,
        expiresAt: expirationTime
      }
      localStorage.setItem("authToken", JSON.stringify(tokenData))
      
      // Set token as cookie for middleware (7 days expiration)
      document.cookie = `authToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      setUser(userData)

      toast({
        title: "Success",
        description: `Login successful as ${roleOption.label}!`,
      })

      // Use router.push for navigation
      const redirectPath = `/${selectedRole}/dashboard`
      console.log("Redirecting to:", redirectPath)

      // Use replace to prevent back navigation to login
      router.replace(redirectPath)
    } catch (error) {
      console.error("Login error:", error)

      let errorMessage = "An unexpected error occurred"
      let errorTitle = "Login Failed"

      if (error instanceof Error) {
        const errorText = error.message.toLowerCase()

        // Handle specific API error responses
        if (errorText.includes('"username" length') || errorText.includes("username length")) {
          errorMessage = "Username is too short. Please enter a valid username."
          errorTitle = "Invalid Username"
        } else if (errorText.includes('"password" length') || errorText.includes("password length")) {
          errorMessage = "Password is too short. Please enter a valid password."
          errorTitle = "Invalid Password"
        } else if (
          errorText.includes("invalid credentials") ||
          errorText.includes("unauthorized") ||
          errorText.includes("401") ||
          errorText.includes("wrong password") ||
          errorText.includes("user not found") ||
          errorText.includes("authentication failed")
        ) {
          errorMessage = `Invalid ${getSelectedRoleOption().label.toLowerCase()} credentials. Please check your username and password.`
          errorTitle = "Authentication Failed"
        } else if (errorText.includes("user not found") || errorText.includes("username not found")) {
          errorMessage = `No ${getSelectedRoleOption().label.toLowerCase()} account found with this username.`
          errorTitle = "User Not Found"
        } else if (errorText.includes("account disabled") || errorText.includes("user disabled")) {
          errorMessage = `Your ${getSelectedRoleOption().label.toLowerCase()} account has been disabled. Please contact support.`
          errorTitle = "Account Disabled"
        } else if (errorText.includes("network") || errorText.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again."
          errorTitle = "Connection Error"
        } else if (errorText.includes("timeout")) {
          errorMessage = "Request timed out. Please try again."
          errorTitle = "Timeout Error"
        } else if (errorText.includes("server error") || errorText.includes("500")) {
          errorMessage = "Server error. Please try again later or contact support."
          errorTitle = "Server Error"
        } else {
          // For any other error, show a generic message but log the details
          errorMessage = `Login failed. Please check your credentials and try again.`
          console.error("Unhandled login error:", error.message)
        }
      } else if (typeof error === "string") {
        if (error.toLowerCase().includes("username") || error.toLowerCase().includes("password")) {
          errorMessage = "Invalid username or password. Please try again."
          errorTitle = "Authentication Failed"
        } else {
          errorMessage = error
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000, // Show for 5 seconds
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
          <CardDescription className="text-center">
            Select your role and enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Login as</Label>
              <Select value={selectedRole} onValueChange={(value: LoginRole) => setSelectedRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>

            {/* Selected Role Info */}
            {selectedRole && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Logging in as {getSelectedRoleOption().label}</div>
                    <div className="text-xs text-muted-foreground">{getSelectedRoleOption().description}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading || !selectedRole}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Sign in as {getSelectedRoleOption().label}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
        <div className="px-8 pb-6 text-center">
          <Link href="#" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
      </Card>
    </div>
  )
}
