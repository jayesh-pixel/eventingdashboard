// Role mapping for API compatibility
export const ROLE_MAPPING = {
  superadmin: 1,
  organizer: 2,
  promoter: 3,
  // Add more roles as needed
  admin: 4,
} as const

export const REVERSE_ROLE_MAPPING = {
  1: "superadmin",
  2: "organizer",
  3: "promoter",
  4: "admin",
} as const

export type NumericRole = keyof typeof REVERSE_ROLE_MAPPING
export type StringRole = keyof typeof ROLE_MAPPING

export function getNumericRole(stringRole: string): number {
  return ROLE_MAPPING[stringRole as StringRole] || 1 // Default to superadmin
}

export function getStringRole(numericRole: number): string {
  return REVERSE_ROLE_MAPPING[numericRole as NumericRole] || "superadmin"
}
