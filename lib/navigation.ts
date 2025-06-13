import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Ticket,
  Settings,
  BarChart3,
  ImageIcon,
  ScanLine,
  FileText,
  Mic2,
  Tag,
  MapPin,
  Route,
  PercentCircle,
  UserCog,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  children?: NavItem[]
  roleAccess: UserRole[]
}

export type UserRole = "superadmin" | "organizer" | "promoter"

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roleAccess: ["superadmin", "organizer", "promoter"],
  },
  {
    title: "Events",
    href: "/events",
    icon: CalendarDays,
    roleAccess: ["superadmin", "organizer", "promoter"],
  },
  {
    title: "Bookings",
    href: "/bookings",
    icon: Ticket,
    roleAccess: ["superadmin", "organizer", "promoter"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roleAccess: ["superadmin", "organizer", "promoter"],
  },
  {
    title: "Artists",
    href: "/artists",
    icon: Mic2,
    roleAccess: ["superadmin"],
  },
  {
    title: "Categories",
    href: "/categories",
    icon: Tag,
    roleAccess: ["superadmin"],
  },
  {
    title: "Genres",
    href: "/genres",
    icon: Tag, // Consider a different icon if needed
    roleAccess: ["superadmin"],
  },
  {
    title: "Event Tours",
    href: "/event-tours",
    icon: Route,
    roleAccess: ["superadmin"],
  },
  {
    title: "Venues",
    href: "/venues",
    icon: MapPin,
    roleAccess: ["superadmin"],
  },
  {
    title: "Organizers",
    href: "/organizers",
    icon: Users,
    roleAccess: ["superadmin"],
  },
  {
    title: "Promoters",
    href: "/promoters",
    icon: UserCog, // Changed from Users to avoid conflict
    roleAccess: ["superadmin"],
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    roleAccess: ["superadmin"],
  },
  {
    title: "Promo Codes",
    href: "/promocodes",
    icon: PercentCircle,
    roleAccess: ["superadmin"],
  },
  {
    title: "Banners",
    href: "/banners",
    icon: ImageIcon,
    roleAccess: ["superadmin"],
  },
  {
    title: "Scanner Users",
    href: "/scanner-users",
    icon: ScanLine,
    roleAccess: ["superadmin"],
  },
  {
    title: "Leads",
    href: "/leads",
    icon: FileText,
    roleAccess: ["superadmin"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roleAccess: ["superadmin", "organizer", "promoter"],
  },
]

export const getNavItemsForRole = (role: UserRole): NavItem[] => {
  return navItems
    .filter((item) => item.roleAccess.includes(role))
    .map((item) => ({
      ...item,
      href: `/${role}${item.href}`, // Prepend role to href
      children: item.children?.map((child) => ({
        ...child,
        href: `/${role}${child.href}`,
      })),
    }))
}
