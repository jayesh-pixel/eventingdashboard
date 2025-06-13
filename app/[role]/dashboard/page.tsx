import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, CalendarDays, Ticket, TrendingUp, Target } from "lucide-react"
import type { UserRole } from "@/lib/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface DashboardPageProps {
  params: { role: UserRole }
}

const roleSpecificStats = (role: UserRole) => {
  switch (role) {
    case "superadmin":
      return [
        { title: "Total Revenue", value: "$1,250,340", icon: DollarSign, change: "+12.5%" },
        { title: "Total Events", value: "1,502", icon: CalendarDays, change: "+50" },
        { title: "Active Organizers", value: "87", icon: Users, change: "+3" },
        { title: "Tickets Sold", value: "250,890", icon: Ticket, change: "+8.2%" },
      ]
    case "organizer":
      return [
        { title: "My Events Revenue", value: "$85,600", icon: DollarSign, change: "+9.1%" },
        { title: "My Active Events", value: "12", icon: CalendarDays, change: "+2" },
        { title: "Tickets Sold (My Events)", value: "15,230", icon: Ticket, change: "+5.7%" },
        { title: "Upcoming Events", value: "5", icon: CalendarDays, change: "" },
      ]
    case "promoter":
      return [
        { title: "My Commission", value: "$12,350", icon: DollarSign, change: "+15.3%" },
        { title: "Tickets Sold (My Links)", value: "2,105", icon: Ticket, change: "+102" },
        { title: "Active Promotions", value: "8", icon: CalendarDays, change: "" },
        { title: "Conversion Rate", value: "5.2%", icon: TrendingUp, change: "+0.5%" },
      ]
    default:
      return []
  }
}

const roleSpecificContent = (role: UserRole) => {
  switch (role) {
    case "superadmin":
      return {
        title: "Super Admin Dashboard",
        description: "Complete system overview and management",
        recentActivity: [
          "New event 'Summer Music Festival' created by MusicFest Inc.",
          "150 tickets sold for 'Tech Conference 2025'",
          "Organizer 'EventMasters Inc.' joined the platform",
          "Promoter 'PromoKing' achieved 95% conversion rate",
          "Monthly revenue target exceeded by 12%",
        ],
      }
    case "organizer":
      return {
        title: "Organizer Dashboard",
        description: "Manage your events and track performance",
        recentActivity: [
          "Your event 'Summer Music Festival' received 50 new bookings",
          "Ticket sales for 'Art Expo Downtown' are trending up",
          "New promoter 'TicketMaster' joined your event",
          "Event 'Food & Wine Fair' was approved and published",
          "Weekly sales report is ready for download",
        ],
      }
    case "promoter":
      return {
        title: "Promoter Dashboard",
        description: "Track your promotions and commission earnings",
        recentActivity: [
          "Earned $450 commission from 'Summer Music Festival' sales",
          "Your promotion link for 'Tech Conference 2025' generated 25 clicks",
          "New event 'Food & Wine Fair' available for promotion",
          "Monthly commission payout of $2,100 processed",
          "Your conversion rate improved by 0.8% this week",
        ],
      }
    default:
      return {
        title: "Dashboard",
        description: "Welcome to the admin panel",
        recentActivity: [],
      }
  }
}

export default async function DashboardPage({ params }: { params: { role: string } | Promise<{ role: string }> }) {
  // Ensure params is awaited if it's a Promise
  const resolvedParams = params instanceof Promise ? await params : params
  // Cast role to UserRole for type safety
  const role = resolvedParams.role as UserRole
  const stats = roleSpecificStats(role)
  const content = roleSpecificContent(role)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{content.title}</h1>
        <p className="text-muted-foreground">{content.description}</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button asChild>
          <Link href={`/${role}/events`} prefetch={false}>
            <CalendarDays className="mr-2 h-4 w-4" />
            View Events
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${role}/reports`} prefetch={false}>
            <TrendingUp className="mr-2 h-4 w-4" />
            View Reports
          </Link>
        </Button>
        {role !== "promoter" && (
          <Button variant="outline" asChild>
            <Link href={`/${role}/bookings`} prefetch={false}>
              <Ticket className="mr-2 h-4 w-4" />
              Manage Bookings
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change && (
                <p className="text-xs text-muted-foreground">
                  <span className={stat.change.startsWith("+") ? "text-green-500" : "text-red-500"}>{stat.change}</span>{" "}
                  from last month
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {content.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">{activity}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role-specific additional content */}
      {role === "promoter" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Available Events to Promote
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm font-medium">Summer Music Festival</span>
                  <span className="text-xs text-green-600">15% commission</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm font-medium">Tech Conference 2025</span>
                  <span className="text-xs text-green-600">12% commission</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm font-medium">Food & Wine Fair</span>
                  <span className="text-xs text-green-600">18% commission</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Clicks Generated</span>
                  <span className="text-sm font-medium">1,247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Conversions</span>
                  <span className="text-sm font-medium">65</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Commission Earned</span>
                  <span className="text-sm font-medium text-green-600">$2,847</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Top Event</span>
                  <span className="text-sm font-medium">Summer Music Festival</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {role === "organizer" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href={`/${role}/events`} prefetch={false}>
                    Create New Event
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href={`/${role}/reports`} prefetch={false}>
                    View Event Analytics
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href={`/${role}/events`} prefetch={false}>
                    Manage Tickets
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href={`/${role}/reports`} prefetch={false}>
                    Download Reports
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Summer Music Festival</p>
                    <p className="text-xs text-muted-foreground">July 15-17, 2025</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Published</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Art Expo Downtown</p>
                    <p className="text-xs text-muted-foreground">August 1, 2025</p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Review</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Food & Wine Fair</p>
                    <p className="text-xs text-muted-foreground">November 20-22, 2025</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Draft</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
