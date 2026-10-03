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
 * - Profile: { user_id, FullName, Email, Phone1, Phone2 (WhatsApp), Address, State, City, ProfileImage? }
 * - Password: { user_id, CurrentPassword, NewPassword }
 */

import { authFetch } from "@/lib/auth-fetch"
import { useState, useEffect } from "react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AddressSelector } from "@/components/address-selector"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { dashboard, promoterEndPointPannel, organizerEndpoint, smtpEndpoints } from "@/lib/api-endpoints"
import { getValidToken } from "@/lib/token-utils"
import { Loader2, Eye, EyeOff, Upload } from "lucide-react"
import type { UserRole } from "@/lib/navigation"

interface SettingsPageProps {
  params: { role: UserRole } | Promise<{ role: UserRole }>
}

interface UserProfile {
  FullName: string
  Email: string
  Phone1: string
  WhatsappNumber: string
  Address: string
  State: string
  StateIsoCode: string
  City: string
  CityIsoCode: string
  ProfileImage?: string
}

interface ApiUserData {
  FullName?: string
  Email?: string
  // SuperAdmin stores phones as Number, Organizer/Promoter as String
  Phone1?: string | number | null
  Phone2?: string | number | null
  Address?: string
  State?: string
  StateIsoCode?: string
  City?: string
  CityIsoCode?: string
  profile_img?: string
  [key: string]: any
}

// Backend profile Joi schemas cap State/City at 20 chars for organizer/promoter
const ADDRESS_NAME_MAX_LENGTH = 20

const toPhoneString = (value: unknown): string =>
  value == null ? "" : String(value).replace(/\D/g, "").slice(0, 10)

// profile_img is a path relative to the API server (served at BASE_URL/uploads/...)
const toProfileImageUrl = (path?: string | null): string => {
  if (!path) return ""
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "")
  return `${base}/${path.replace(/^\/+/, "")}`
}

const emptyProfile: UserProfile = {
  FullName: "",
  Email: "",
  Phone1: "",
  WhatsappNumber: "",
  Address: "",
  State: "",
  StateIsoCode: "",
  City: "",
  CityIsoCode: "",
}

export default function SettingsPage({ params }: SettingsPageProps) {
  // Handle params which might be a Promise
  let resolvedParams: { role: UserRole }
  if (params instanceof Promise) {
    resolvedParams = React.use(params)
  } else {
    resolvedParams = params
  }
  const { role } = resolvedParams
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
  const [profileForm, setProfileForm] = useState<UserProfile>(emptyProfile)
  const [savedProfileForm, setSavedProfileForm] = useState<UserProfile>(emptyProfile)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>("")
  const [savedProfileImage, setSavedProfileImage] = useState<string>("")

  // SMTP settings state (for superadmin)
  const [smtpForm, setSmtpForm] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
    encryption: "TLS",
  })
  const [smtpId, setSmtpId] = useState<string | null>(null)
  const [smtpLoading, setSmtpLoading] = useState(false)

  // Load user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.user_id) return

      try {
        let endpoint = ""
        switch (role) {
          case "superadmin":
            endpoint = dashboard.ADMIN_PROFILE_API
            break
          case "promoter":
            endpoint = promoterEndPointPannel.GET_PROMOTER_PROFILE_DATA_BY_ID
            break
          case "organizer":
            endpoint = organizerEndpoint.GET_ORGANIZER_DATA_BY_ID_URL
            break
          default:
            return
        }

        const response = await apiClient.post(endpoint, { user_id: user.user_id })
        if (response.success && response.data) {
          const userData = response.data as ApiUserData
          const loadedProfile: UserProfile = {
            FullName: userData.FullName || "",
            Email: userData.Email || "",
            Phone1: toPhoneString(userData.Phone1),
            // Backend stores the WhatsApp number as Phone2
            WhatsappNumber: toPhoneString(userData.Phone2),
            Address: userData.Address || userData.address || "",
            State: userData.State || userData.state || "",
            StateIsoCode: userData.StateIsoCode || userData.stateIsoCode || "",
            City: userData.City || userData.city || "",
            CityIsoCode: userData.CityIsoCode || userData.cityIsoCode || "",
            ProfileImage: toProfileImageUrl(userData.profile_img),
          }
          setProfileForm(loadedProfile)
          setSavedProfileForm(loadedProfile)
          setProfileImagePreview(loadedProfile.ProfileImage || "")
          setSavedProfileImage(loadedProfile.ProfileImage || "")
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error)
      }
    }

    fetchProfile()
  }, [user?.user_id, role])

  // Fetch SMTP settings (superadmin only)
  const fetchSmtpSettings = async () => {
    if (role !== "superadmin") return
    setSmtpLoading(true)
    try {
      const response = await apiClient.get(smtpEndpoints.GET)
      if (response.success && response.data) {
        const data = response.data as any
        setSmtpId(data._id ?? null)
        setSmtpForm({
          host: data.Host || "",
          port: data.Port != null ? String(data.Port) : "",
          username: data.Username || "",
          password: data.Password || "",
          encryption: data.Encryption || "TLS",
        })
      }
    } catch (error) {
      // 404 means no SMTP configured yet — leave form empty so user can register
      console.error("Failed to fetch SMTP settings:", error)
      setSmtpId(null)
    } finally {
      setSmtpLoading(false)
    }
  }

  useEffect(() => {
    if (role === "superadmin") {
      fetchSmtpSettings()
    }
  }, [role])

  // Save (register or update) SMTP settings
  const handleSaveSmtp = async () => {
    // Backend SMTP validation marks every field optional — only send non-empty values
    // (Joi rejects empty strings, so blank fields are omitted instead of sent as "")
    setSmtpLoading(true)
    try {
      const payload = {
        ...(smtpForm.host.trim() ? { Host: smtpForm.host.trim() } : {}),
        ...(smtpForm.port.trim() ? { Port: smtpForm.port.trim() } : {}),
        ...(smtpForm.username.trim() ? { Username: smtpForm.username.trim() } : {}),
        ...(smtpForm.password.trim() ? { Password: smtpForm.password.trim() } : {}),
        ...(smtpForm.encryption.trim() ? { Encryption: smtpForm.encryption.trim() } : {}),
        ...(smtpId ? { smtp_id: smtpId } : {}),
      }

      const endpoint = smtpId ? smtpEndpoints.UPDATE_BY_ID : smtpEndpoints.REGISTER
      const response = await apiClient.post(endpoint, payload)

      if (response.success) {
        const data = response.data as any
        if (data?._id) setSmtpId(data._id)
        toast({
          title: "Success",
          description: smtpId ? "SMTP settings updated successfully." : "SMTP settings saved successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to save SMTP settings.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to save SMTP settings.",
        variant: "destructive",
      })
    } finally {
      setSmtpLoading(false)
    }
  }
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

    // Backend change-password (and login) schemas require 5-10 characters
    if (passwordForm.currentPassword.length < 5 || passwordForm.currentPassword.length > 10) {
      toast({
        title: "Error",
        description: "Current password must be 5-10 characters long.",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword.length < 5 || passwordForm.newPassword.length > 10) {
      toast({
        title: "Error",
        description: "New password must be 5-10 characters long.",
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
          endpoint = dashboard.SUPERADMIN_CHANGE_PASSWORD
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

    // Validation — backend profile update only requires user_id; all fields optional
    // Email validation (only if provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (profileForm.Email.trim() && !emailRegex.test(profileForm.Email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      })
      return
    }

    if (profileForm.Phone1 && profileForm.Phone1.length !== 10) {
      toast({
        title: "Error",
        description: "Phone number must contain 10 digits.",
        variant: "destructive",
      })
      return
    }

    if (profileForm.WhatsappNumber && profileForm.WhatsappNumber.length !== 10) {
      toast({
        title: "Error",
        description: "WhatsApp number must contain 10 digits.",
        variant: "destructive",
      })
      return
    }

    if (role === "organizer" || role === "promoter") {
      // Unchanged names are not re-sent, so only a newly picked long name is blocked
      const tooLong = [
        { label: "State", value: profileForm.State, saved: savedProfileForm.State },
        { label: "City", value: profileForm.City, saved: savedProfileForm.City },
      ].find(({ value, saved }) => value !== saved && value.trim().length > ADDRESS_NAME_MAX_LENGTH)
      if (tooLong) {
        toast({
          title: "Error",
          description: `${tooLong.label} name "${tooLong.value}" is too long (max ${ADDRESS_NAME_MAX_LENGTH} characters). Please choose a different ${tooLong.label.toLowerCase()}.`,
          variant: "destructive",
        })
        return
      }
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
      // Only append non-empty values — backend Joi rejects empty strings for optional fields
      const formData = new FormData()
      const appendIfFilled = (key: string, value: string) => {
        if (value && value.trim()) formData.append(key, value)
      }
      formData.append("user_id", user.user_id)
      appendIfFilled("FullName", profileForm.FullName)
      appendIfFilled("Email", profileForm.Email)
      appendIfFilled("Phone1", toPhoneString(profileForm.Phone1))
      appendIfFilled("Phone2", toPhoneString(profileForm.WhatsappNumber))
      appendIfFilled("Address", profileForm.Address)
      formData.append("Country", "India")
      formData.append("CountryIsoCode", "IN")
      // Backend keeps the stored value for omitted fields; skip unchanged State/City so a
      // legacy name over the organizer/promoter 20-char limit does not fail every save
      if (profileForm.State !== savedProfileForm.State || profileForm.StateIsoCode !== savedProfileForm.StateIsoCode) {
        appendIfFilled("State", profileForm.State)
        appendIfFilled("StateIsoCode", profileForm.StateIsoCode)
      }
      if (profileForm.City !== savedProfileForm.City || profileForm.CityIsoCode !== savedProfileForm.CityIsoCode) {
        appendIfFilled("City", profileForm.City)
        appendIfFilled("CityIsoCode", profileForm.CityIsoCode)
      }
      
      if (profileImageFile) {
        formData.append("ProfileImage", profileImageFile)
      }

      const response = await authFetch(endpoint, {
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
        const updatedProfile = {
          ...profileForm,
          ProfileImage: profileImagePreview,
        }
        setProfileForm(updatedProfile)
        setSavedProfileForm(updatedProfile)
        setSavedProfileImage(profileImagePreview)
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

  const handleProfileCancel = () => {
    setProfileForm(savedProfileForm)
    setProfileImageFile(null)
    setProfileImagePreview(savedProfileImage)
  }

  return (    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Profile Information Card - Available for all roles */}
      <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  value={profileForm.FullName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, FullName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone No.</Label>
                <Input
                  id="phone"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter Admin phone number"
                  value={profileForm.Phone1}
                  onChange={(e) => setProfileForm(prev => ({
                    ...prev,
                    Phone1: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-number">Whatsapp No.</Label>
                <Input
                  id="whatsapp-number"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter Admin phone number"
                  value={profileForm.WhatsappNumber}
                  onChange={(e) => setProfileForm(prev => ({
                    ...prev,
                    WhatsappNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Id</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter Admin emailId"
                  value={profileForm.Email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, Email: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter text here..."
                  value={profileForm.Address}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, Address: e.target.value }))}
                />
              </div>

              <AddressSelector
                className="md:col-span-2"
                required={false}
                stateIsoCode={profileForm.StateIsoCode}
                setStateIsoCode={(StateIsoCode) => setProfileForm(prev => ({ ...prev, StateIsoCode }))}
                stateName={profileForm.State}
                setStateName={(State) => setProfileForm(prev => ({ ...prev, State }))}
                cityIsoCode={profileForm.CityIsoCode}
                setCityIsoCode={(CityIsoCode) => setProfileForm(prev => ({ ...prev, CityIsoCode }))}
                cityName={profileForm.City}
                setCityName={(City) => setProfileForm(prev => ({ ...prev, City }))}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleProfileCancel} disabled={profileLoading}>
                Cancel
              </Button>
              <Button onClick={handleProfileUpdate} disabled={profileLoading}>
                {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password for security.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password *</Label>
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
            <Label htmlFor="new-password">New Password *</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                maxLength={10}
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
            <Label htmlFor="confirm-password">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                maxLength={10}
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
            <div className="space-y-2">
              <Label htmlFor="smtp-encryption">Encryption</Label>
              <Input
                id="smtp-encryption"
                placeholder="TLS / SSL / NONE"
                value={smtpForm.encryption}
                onChange={(e) => setSmtpForm(prev => ({ ...prev, encryption: e.target.value }))}
              />
            </div>
            <Button onClick={handleSaveSmtp} disabled={smtpLoading}>
              {smtpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {smtpId ? "Update SMTP Settings" : "Save SMTP Settings"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
