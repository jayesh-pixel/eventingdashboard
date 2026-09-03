// Role mapping for API compatibility — must match backend AdminRoles enum
// Backend: SuperAdmin=1, Employee=2, Organizer=3, Promoter=4
export const ROLE_MAPPING = {
  superadmin: 1,
  employee: 2,
  organizer: 3,
  promoter: 4,
} as const

export const REVERSE_ROLE_MAPPING = {
  1: "superadmin",
  2: "employee",
  3: "organizer",
  4: "promoter",
} as const

export type NumericRole = keyof typeof REVERSE_ROLE_MAPPING
export type StringRole = keyof typeof ROLE_MAPPING

export function getNumericRole(stringRole: string): number {
  return ROLE_MAPPING[stringRole as StringRole] || 1 // Default to superadmin
}

export function getStringRole(numericRole: number): string {
  return REVERSE_ROLE_MAPPING[numericRole as NumericRole] || "superadmin"
}
