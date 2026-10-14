// Length rules enforced by the backend Joi schemas (checked against /organizer/login and
// /promoter/login): Username min 5, Password 5-10. Login does not trim, so spaces count.
export const USERNAME_MIN_LENGTH = 5
export const USERNAME_MAX_LENGTH = 50
export const PASSWORD_MIN_LENGTH = 5
export const PASSWORD_MAX_LENGTH = 10

// Red inline message for a value outside [min, max]; empty values are left to "required" checks.
export const getLengthError = (label: string, value: string, min: number, max?: number) => {
  const length = value.length
  if (length === 0) return ""
  const range = max ? `${min}-${max}` : `at least ${min}`
  if (length < min || (max !== undefined && length > max)) {
    return `${label} must be ${range} characters (currently ${length})`
  }
  return ""
}

export const getUsernameError = (value: string) =>
  getLengthError("Username", value, USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH)

// Spaces at either end are easy to miss when a password is typed or pasted, and the
// account then cannot be logged into without typing them back exactly.
export const getPasswordError = (value: string) =>
  getLengthError("Password", value, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH) ||
  (value && value !== value.trim() ? "Password cannot start or end with a space" : "")

// Backend phone fields use the Joi pattern /^\d{10}$/. Empty values are left to "required" checks.
export const getPhoneError = (label: string, value: string) =>
  value && !/^\d{10}$/.test(value) ? `${label} must be exactly 10 digits` : ""

// Approximates Joi .email(); pass the trimmed value. Empty values are left to "required" checks.
export const getEmailError = (value: string) =>
  value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Please enter a valid email address" : ""
