"use client"

/**
 * Settings Page Component
 *  * This component provides a comprehensive settings interface for all user roles:
 * - SuperAdmin: Full system configuration including SMTP settings and profile management
 * - Promoter: Password changes only (no profile editing)
 * - Organizer: Profile management and password changes
 * 
 * API Integration:
 * 
 * Profile Management:
 * - GET /superadmin/getById/{user_id} - Fetch superadmin profile
 * - GET /promoter/getById/{user_id} - Fetch promoter profile  
 * - GET /organizer/getById/{user_id} - Fetch organizer profile
 * - POST /superadmin/updateProfile - Update superadmin profile
 * - POST /promoter/updateProfile - Update promoter profile (multipart/form-data)
 * - POST /organizer/updateProfile - Update organizer profile (multipart/form-data)
 * 
 * Password Management:
 * - POST /promoter/changepassword - Change promoter password
 * - POST /organizer/changepassword - Change organizer password
 * - POST /superadmin/changepassword - Change superadmin password (TODO: verify endpoint)
 * 
 * Features:
 * - Real-time form validation
 * - Profile image upload with preview
 * - Password visibility toggles
 * - Loading states and error handling
 * - Toast notifications for user feedback
 * - Role-specific settings sections
 * 
 * Form Data Schema:
 * - Profile: { user_id, FullName, Email, Phone1, ProfileImage? }
 * - Password: { user_id, CurrentPassword, NewPassword }
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { dashboard, promoterEndPointPannel, authEndpoints, organizerEndpoint } from "@/lib/api-endpoints"
import { Loader2, Eye, EyeOff, Upload } from "lucide-react"
import type { UserRole } from "@/lib/navigation"

interface SettingsPageProps {
  params: { role: UserRole }
}

interface UserProfile {
  FullName: string
  Email: string
  Phone1: string
  ProfileImage?: string
}

interface ApiUserData {
  FullName?: string
  Email?: string
  Phone1?: string
  ProfileImage?: string
  [key: string]: any
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { role } = params
  const { user } = useAuth()
  const { toast } = useToast()

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Profile update state
  const [profileForm, setProfileForm] = useState<UserProfile>({
    FullName: "",
    Email: "",
    Phone1: "",
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>("")

  // SMTP settings state (for superadmin)
  const [smtpForm, setSmtpForm] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
  })
  const [smtpLoading, setSmtpLoading] = useState(false)

  // Load user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.user_id) return

      try {
        let endpoint = ""
          switch (role) {
          case "superadmin":
            endpoint = `${dashboard.ADMIN_PROFILE_API}/${user.user_id}`
            break
          case "promoter":
            endpoint = `${promoterEndPointPannel.GET_PROMOTER_PROFILE_DATA_BY_ID}/${user.user_id}`
            break
          case "organizer":
            endpoint = `${organizerEndpoint.GET_ORGANIZER_DATA_BY_ID_URL}/${user.user_id}`
            break
          default:
            return
        }const response = await apiClient.get(endpoint)
        if (response.success && response.data) {
          const userData = response.data as ApiUserData
          setProfileForm({
            FullName: userData.FullName || "",
            Email: userData.Email || "",
            Phone1: userData.Phone1 || "",
          })
          if (userData.ProfileImage) {
            setProfileImagePreview(userData.ProfileImage)
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error)
      }
    }

    fetchProfile()
  }, [user?.user_id, role])
  // Handle password change
  const handlePasswordChange = async () => {
    if (!user?.user_id) {
      toast({
        title: "Error",
        description: "User not found. Please log in again.",
        variant: "destructive",
      })
      return
    }

    // Validation
    if (!passwordForm.currentPassword.trim()) {
      toast({
        title: "Error",
        description: "Please enter your current password.",
        variant: "destructive",
      })
      return
    }

    if (!passwordForm.newPassword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a new password.",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast({
        title: "Error",
        description: "New password must be different from current password.",
        variant: "destructive",
      })
      return
    }

    setPasswordLoading(true)

    try {
      let endpoint = ""
        switch (role) {
        case "superadmin":
          endpoint = authEndpoints.FORGOT_PASSWORD_API // Update with correct endpoint
          break
        case "promoter":
          endpoint = promoterEndPointPannel.PROMOTER_CHANGE_PASSWORD_IN_PROFILE
          break
        case "organizer":
          endpoint = organizerEndpoint.PROFILE_CHANGE_PASSWORD
          break
        default:
          throw new Error("Invalid role")
      }

      const response = await apiClient.post(endpoint, {
        user_id: user.user_id,
        CurrentPassword: passwordForm.currentPassword,
        NewPassword: passwordForm.newPassword,
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Password updated successfully.",
        })
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to update password.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setPasswordLoading(false)
    }
  }
  // Handle profile update
  const handleProfileUpdate = async () => {
    if (!user?.user_id) {
      toast({
        title: "Error",
        description: "User not found. Please log in again.",
        variant: "destructive",
      })
      return
    }

    // Validation
    if (!profileForm.FullName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your full name.",
        variant: "destructive",
      })
      return
    }

    if (!profileForm.Email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profileForm.Email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      })
      return
    }

    setProfileLoading(true)

    try {
      let endpoint = ""
        switch (role) {
        case "superadmin":
          endpoint = dashboard.ADMIN_PROFILE_UPDATE_API
          break
        case "promoter":
          endpoint = promoterEndPointPannel.UPDATE_PROMOTER_DATA_PROFILE_DATA
          break
        case "organizer":
          endpoint = organizerEndpoint.UPDATE_ORGANIZER_PROFILE
          break
        default:
          throw new Error("Invalid role")
      }

      // Create FormData for multipart form data
      const formData = new FormData()
      formData.append("user_id", user.user_id)
      formData.append("FullName", profileForm.FullName)
      formData.append("Email", profileForm.Email)
      formData.append("Phone1", profileForm.Phone1)
      
      if (profileImageFile) {
        formData.append("ProfileImage", profileImageFile)
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully.",
        })
        setProfileImageFile(null)
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update profile.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProfileLoading(false)
    }
  }

  // Handle profile image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Profile Information Card - Only for superadmin and organizer */}
      {(role === "superadmin" || role === "organizer") && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and profile picture.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Image */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-auto"
                  />
                  <p className="text-sm text-gray-500 mt-1">Upload a new profile picture</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                value={profileForm.FullName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, FullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.Email}
                onChange={(e) => setProfileForm(prev => ({ ...prev, Email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileForm.Phone1}
                onChange={(e) => setProfileForm(prev => ({ ...prev, Phone1: e.target.value }))}
              />
            </div>
            <Button onClick={handleProfileUpdate} disabled={profileLoading}>
              {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password for security.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <Button onClick={handlePasswordChange} disabled={passwordLoading}>
            {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Super Admin Specific Settings */}
      {role === "superadmin" && (
        <Card>
          <CardHeader>
            <CardTitle>SMTP Configuration</CardTitle>
            <CardDescription>Configure email sending settings for the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.example.com"
                value={smtpForm.host}
                onChange={(e) => setSmtpForm(prev => ({ ...prev, host: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                value={smtpForm.port}
                onChange={(e) => setSmtpForm(prev => ({ ...prev, port: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">SMTP Username</Label>
              <Input
                id="smtp-user"
                value={smtpForm.username}
                onChange={(e) => setSmtpForm(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-password">SMTP Password</Label>
              <Input
                id="smtp-password"
                type="password"
                value={smtpForm.password}
                onChange={(e) => setSmtpForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <Button disabled={smtpLoading}>
              {smtpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save SMTP Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
