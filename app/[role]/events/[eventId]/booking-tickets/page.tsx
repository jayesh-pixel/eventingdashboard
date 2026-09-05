// BookingTicketsPage.tsx
// Full, compile‑ready client component for Next.js (App Router)
// -----------------------------------------------------------------------------
"use client"

// Extend the Window interface to include __EVENT_DATA__ (optional global your
// app might set for analytics)
declare global {
  interface Window {
    __EVENT_DATA__?: any;
  }
}

import * as React from "react";
import { useRouter } from "next/navigation";

// ──────────────────────────────────────────────────────────────────────────────
// UI Components (shadcn/ui) & Icons
// ──────────────────────────────────────────────────────────────────────────────
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  IndianRupee,
  Loader2,
  Minus,
  Plus,
  Users,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// App‑level hooks, utils, constants
// ──────────────────────────────────────────────────────────────────────────────
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { promoterEndPointPannel, websiteCustomer } from "@/lib/api-endpoints";
import { getValidToken } from "@/lib/token-utils";
import type { UserRole } from "@/lib/navigation";
import { TicketType } from "@/lib/types";

// ──────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ──────────────────────────────────────────────────────────────────────────────
interface BookingTicketsPageProps {
  params:
    | {
        role: UserRole;
        eventId: string;
      }
    | Promise<{
        role: UserRole;
        eventId: string;
      }>;
}

interface EventDateTime {
  _id: string;
  EventStartDateTime: string;
  EventEndDateTime: string;
  Event_id: string;
  status: number;
}

interface TicketData {
  _id: string;
  Name: string;
  Description: string | null;
  Price: number;
  EventStartDateTime: string;
  EventEndDateTime: string;
  MaxQuantityAllowedPerOrder: number;
  AvailableQuantity: number;
  BookingMaxLimit?: number; // (optional) some APIs return this field
  TicketType?: number; // from backend
}

// -----------------------------------------------------------------------------
// Utility helpers
// -----------------------------------------------------------------------------
const formatTimeInIST = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

const formatDateBlock = (iso: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }),
    month: d.toLocaleDateString("en-US", { month: "short", timeZone: "Asia/Kolkata" }),
    date: d.toLocaleDateString("en-US", { day: "numeric", timeZone: "Asia/Kolkata" }),
    year: d.toLocaleDateString("en-US", { year: "numeric", timeZone: "Asia/Kolkata" }),
    time: d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }),
  } as const;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export default function BookingTicketsPage({ params }: BookingTicketsPageProps) {
  // Handle params which might be a Promise (consistent with other client pages in this repo)
  let resolvedParams: { role: UserRole; eventId: string };
  if (params instanceof Promise) {
    resolvedParams = React.use(params);
  } else {
    resolvedParams = params;
  }

  const { role, eventId } = resolvedParams;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // ────────────────────────────────────────────────────────────────────────────
  // Local state
  // ────────────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = React.useState(true);
  const [selectedDateId, setSelectedDateId] = React.useState<string | null>(null);
  const [dates, setDates] = React.useState<EventDateTime[]>([]);
  const [tickets, setTickets] = React.useState<TicketData[]>([]);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [showCount, setShowCount] = React.useState<Record<string, boolean>>({});
  const [customerFormPage, setCustomerFormPage] = React.useState(false);
  const [checkoutPage, setCheckoutPage] = React.useState(false);
  const [bookingSuccessPage, setBookingSuccessPage] = React.useState(false);
  const [bookingResult, setBookingResult] = React.useState<any>(null);

  // Customer details -----------------------------------------------------------
  const [customer, setCustomer] = React.useState({
    FullName: "",
    PhoneNo: "",
    Email: "",
    Age: "",
    noteDescription: "",
    WhatsAppNo: "",
    isWhatsApp: 1 as 0 | 1,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Derived totals -------------------------------------------------------------
  const totalTickets = Object.values(counts).reduce((s, n) => s + n, 0);
  const totalPrice = tickets.reduce((s, t) => s + (counts[t._id] || 0) * t.Price, 0);
  const isAnyCountActive = Object.keys(showCount).some((id) => showCount[id] && counts[id] > 0);

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch event dates on mount
  // ────────────────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const loadDates = async () => {
      try {
        setLoading(true);
        const token = getValidToken();
        if (!user || !token) return;

        const res = await fetch(promoterEndPointPannel.GET_ALL_EVENT_DATE_BY_EVENT_ID, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ event_id: eventId }),
        });

        if (!res.ok) throw new Error("Failed to load dates");
        const data = await res.json();
        const list: EventDateTime[] =
          data?.data?.EventDateTimeData?.length > 0
            ? data.data.EventDateTimeData
            : data?.data?.EventDateTime ?? [];
        setDates(list);
        // If only one date, auto-select it and fetch tickets
        if (list.length === 1) {
          setSelectedDateId(list[0]._id);
          // Fetch tickets for the single date
          const token2 = getValidToken();
          if (user && token2) {
            const payload = { event_id: eventId, eventDateTime_id: list[0]._id, promoter_id: user.user_id };
            const res2 = await fetch(promoterEndPointPannel.GET_PROMOTER_TICKET_DATA_BY_EVENT_DATE, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token2}`,
              },
              body: JSON.stringify(payload),
            });
            if (res2.ok) {
              const data2 = await res2.json();
              setTickets(data2.data ?? []);
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast({ title: "Error", description: "Could not fetch event dates", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadDates();
  }, [eventId, user, toast]);

  // ────────────────────────────────────────────────────────────────────────────
  // Handlers – date click (fetch tickets), qty controls, navigation
  // ────────────────────────────────────────────────────────────────────────────
  const handleDateClick = async (dateId: string) => {
    setSelectedDateId(dateId);
    setCounts({});
    setShowCount({});
    try {
      const token = getValidToken();
      if (!user || !token) return;

      const payload = { event_id: eventId, eventDateTime_id: dateId, promoter_id: user.user_id };
      const res = await fetch(promoterEndPointPannel.GET_PROMOTER_TICKET_DATA_BY_EVENT_DATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to fetch ticket data");
      const data = await res.json();
      setTickets(data.data ?? []);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not load tickets", variant: "destructive" });
    }
  };

  const handleIncrease = (id: string) => {
    setCounts({ [id]: (counts[id] || 0) + 1 });
    setShowCount({ [id]: true });
  };
  const handleDecrease = (id: string) => {
    setCounts((prev) => {
      const newCount = Math.max((prev[id] || 0) - 1, 0);
      if (newCount === 0) {
        setShowCount({});
        return {};
      }
      return { [id]: newCount };
    });
  };
  const handleShowCount = (id: string) => setShowCount({ [id]: true });

  // ────────────────────────────────────────────────────────────────────────────
  // Customer‑form & validation
  // ────────────────────────────────────────────────────────────────────────────
  const handleCustChange = (field: keyof typeof customer, value: string | number) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateCustomerForm = () => {
    const errors: Record<string, string> = {};
    if (!customer.FullName.trim()) errors.FullName = "Full name is required";
    if (!customer.PhoneNo.trim()) errors.PhoneNo = "Phone number is required";
    else if (customer.PhoneNo.length !== 10) errors.PhoneNo = "Phone number must be 10 digits";
    if (!customer.Email.trim()) errors.Email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.Email)) errors.Email = "Enter a valid email";
    if (customer.Age.trim()) {
      const age = parseInt(customer.Age, 10);
      if (isNaN(age) || age < 1 || age > 120) errors.Age = "Age should be 1–120";
    }
    if (customer.isWhatsApp === 0 && !customer.WhatsAppNo.trim()) errors.WhatsAppNo = "WhatsApp no. required";
    else if (customer.isWhatsApp === 0 && customer.WhatsAppNo.length !== 10) errors.WhatsAppNo = "WhatsApp no. must be 10 digits";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Booking API call
  // ────────────────────────────────────────────────────────────────────────────
  const handleBooking = async () => {
    try {
      setLoading(true);
      const token = getValidToken();
      if (!user || !token || !selectedDateId) return;
      const selectedTicket = tickets.find((t) => counts[t._id] > 0);
      if (!selectedTicket) return;

      const payload: any = {
        promoter_id: user.user_id,
        event_id: eventId,
        EventTicketType: String(selectedTicket.TicketType || TicketType.SingleDay),
        EventDateTime_id: selectedDateId,
        EventTicket_id: selectedTicket._id,
        CustomerName: customer.FullName,
        PhoneNumber: customer.PhoneNo,
        isWhatsAppNumberisSame: customer.isWhatsApp,
        Email: customer.Email,
        TicketQuantity: totalTickets,
      }

      // Only send WhatsAppNumber if it's a valid 10-digit number
      const whatsappNum = customer.isWhatsApp === 1 ? customer.PhoneNo : (customer.WhatsAppNo || customer.PhoneNo)
      if (whatsappNum && /^\d{10}$/.test(whatsappNum)) {
        payload.WhatsAppNumber = whatsappNum
      }

      // Only send PromoterNote if it has at least 3 chars (Joi min(3))
      if (customer.noteDescription && customer.noteDescription.trim().length >= 3) {
        payload.PromoterNote = customer.noteDescription.trim()
      }

      // Only send CustomerAge if it's a positive integer (Joi positive())
      if (customer.Age) {
        const age = parseInt(customer.Age, 10)
        if (age > 0) {
          payload.CustomerAge = age
        }
      }

      const res = await fetch(promoterEndPointPannel.BOOKING_TICKET_BY_PROMOTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();

      if (!res.ok) {
        let msg = "Booking failed";
        try {
          const obj = JSON.parse(text);
          msg = obj.message || msg;
        } catch (_) {
          /* ignore non‑JSON */
        }
        throw new Error(msg);
      }

      let bookingData: any = null;
      try {
        bookingData = JSON.parse(text);
      } catch (_) {
        /* ignore non-JSON */
      }

      toast({ title: "Success", description: `Booked ${totalTickets} ticket(s) for ₹${totalPrice}` });

      // Create customer record (fire-and-forget, don't block booking success)
      try {
        await fetch(websiteCustomer.CREATE_CUSTOMER_WEBSITE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            CustomerName: customer.FullName,
            Email: customer.Email,
            MobileNumber: customer.PhoneNo,
            createduser_id: user.user_id,
          }),
        });
      } catch {
        // Customer creation is best-effort; don't fail the booking
      }

      // Store booking details for success page
      const selectedDate = dates.find((d) => d._id === selectedDateId);
      setBookingResult({
        bookingId: bookingData?.data?.Booking_id || bookingData?.data?.booking_id || bookingData?.data?._id || "N/A",
        customerName: customer.FullName,
        phone: customer.PhoneNo,
        email: customer.Email,
        ticketName: selectedTicket?.Name || "N/A",
        quantity: totalTickets,
        totalPrice: totalPrice,
        ticketPrice: selectedTicket?.Price || 0,
        eventDate: selectedDate ? new Date(selectedDate.EventStartDateTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A",
        eventTime: selectedDate ? formatTimeInIST(selectedDate.EventStartDateTime) + " - " + formatTimeInIST(selectedDate.EventEndDateTime) : "N/A",
        bookingDate: new Date().toLocaleString("en-IN"),
        status: "Confirmed",
      });
      setCheckoutPage(false);
      setCustomerFormPage(false);
      setBookingSuccessPage(true);
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not complete booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Early loading indicator
  // ────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // BOOKING SUCCESS PAGE (shown after successful booking)
  // ---------------------------------------------------------------------------
  if (bookingSuccessPage && bookingResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col gap-6 max-w-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">Booking Confirmed!</h1>
            <p className="text-muted-foreground">Your tickets have been booked successfully</p>
          </div>

          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-green-500/5 to-green-500/10 p-4">
              <CardTitle className="text-xl">Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Booking ID</p>
                  <p className="font-semibold font-mono">{bookingResult.bookingId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="default" className="bg-green-600">{bookingResult.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer Name</p>
                  <p className="font-semibold">{bookingResult.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-semibold">{bookingResult.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-semibold">{bookingResult.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Booking Date</p>
                  <p className="font-semibold">{bookingResult.bookingDate}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Ticket Name</p>
                  <p className="font-semibold">{bookingResult.ticketName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Event Date</p>
                  <p className="font-semibold">{bookingResult.eventDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Event Time</p>
                  <p className="font-semibold">{bookingResult.eventTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-semibold">{bookingResult.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ticket Price</p>
                  <p className="font-semibold">₹{bookingResult.ticketPrice}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-lg text-primary">₹{bookingResult.totalPrice}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setCounts({});
                setShowCount({});
                setBookingSuccessPage(false);
                setBookingResult(null);
                setCustomer({ FullName: "", PhoneNo: "", Email: "", Age: "", noteDescription: "", WhatsAppNo: "", isWhatsApp: 1 });
                router.push(`/${role}/events`);
              }}
            >
              Back to Events
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setCounts({});
                setShowCount({});
                setBookingSuccessPage(false);
                setBookingResult(null);
                setCustomer({ FullName: "", PhoneNo: "", Email: "", Age: "", noteDescription: "", WhatsAppNo: "", isWhatsApp: 1 });
                setCustomerFormPage(false);
                setCheckoutPage(false);
              }}
            >
              Book Another Ticket
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CHECKOUT PAGE (step 3)
  // ---------------------------------------------------------------------------
  if (checkoutPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setCheckoutPage(false)} className="flex items-center gap-2 text-xs sm:text-sm">
              <ArrowLeft className="h-3 w-3" />
              Back
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Final Checkout</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer summary */}
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4">
                <CardTitle className="text-xl">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-sm">
                <p><span className="font-medium">Name:</span> {customer.FullName}</p>
                <p><span className="font-medium">Phone:</span> {customer.PhoneNo}</p>
                <p><span className="font-medium">Email:</span> {customer.Email}</p>
                {customer.Age && <p><span className="font-medium">Age:</span> {customer.Age}</p>}
                {customer.isWhatsApp === 0 && <p><span className="font-medium">WhatsApp:</span> {customer.WhatsAppNo}</p>}
                {customer.noteDescription && <p><span className="font-medium">Note:</span> {customer.noteDescription}</p>}
              </CardContent>
            </Card>

            {/* Ticket summary */}
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4">
                <CardTitle className="text-xl">Booking Summary</CardTitle>
                <CardDescription>Review your selection before confirming</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {tickets.filter((t) => counts[t._id] > 0).map((t) => (
                  <div key={t._id} className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border">
                    <div className="space-y-1">
                      <p className="font-semibold">{t.Name}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeInIST(t.EventStartDateTime)} – {formatTimeInIST(t.EventEndDateTime)}</p>
                      <p className="text-xs text-muted-foreground">Qty: {counts[t._id]}</p>
                    </div>
                    <p className="text-lg font-bold text-primary">₹{counts[t._id] * t.Price}</p>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between items-center bg-primary/10 p-3 rounded-xl">
                  <p className="font-bold">Total ({totalTickets} ticket{totalTickets !== 1 ? "s" : ""})</p>
                  <p className="text-xl font-bold text-primary">₹{totalPrice}</p>
                </div>

                <Button className="w-full h-12" onClick={handleBooking}>
                  Confirm Booking
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CUSTOMER FORM (step 2)
  // ---------------------------------------------------------------------------
  if (customerFormPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setCustomerFormPage(false)} className="flex items-center gap-2 text-xs sm:text-sm">
              <ArrowLeft className="h-3 w-3" />
              Back
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Customer Details</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <Card className="lg:col-span-2 border-0 shadow-xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4">
                <CardTitle className="text-xl">Contact Information</CardTitle>
                <CardDescription>Required for booking confirmation</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-sm">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="font-medium">Full Name</label>
                  <input value={customer.FullName} className="w-full p-2 rounded-xl border" onChange={(e) => handleCustChange("FullName", e.target.value)} />
                  {formErrors.FullName && <p className="text-destructive text-xs">{formErrors.FullName}</p>}
                </div>

                {/* Phone only */}
                <div className="space-y-1">
                  <label className="font-medium">Phone Number</label>
                  <input value={customer.PhoneNo} maxLength={10} pattern="[6-9][0-9]{9}" className="w-full p-2 rounded-xl border" onChange={(e) => handleCustChange("PhoneNo", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                  {formErrors.PhoneNo && <p className="text-destructive text-xs">{formErrors.PhoneNo}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="font-medium">Email</label>
                  <input value={customer.Email} type="email" className="w-full p-2 rounded-xl border" onChange={(e) => handleCustChange("Email", e.target.value)} />
                  {formErrors.Email && <p className="text-destructive text-xs">{formErrors.Email}</p>}
                </div>

                {/* WhatsApp toggle */}
                <div className="space-y-1">
                  <label className="font-medium">Is this a WhatsApp number?</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={customer.isWhatsApp === 1} onChange={() => handleCustChange("isWhatsApp", 1)} /> Yes
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={customer.isWhatsApp === 0} onChange={() => handleCustChange("isWhatsApp", 0)} /> No
                    </label>
                  </div>
                </div>
                {customer.isWhatsApp === 0 && (
                  <div className="space-y-1">
                    <label className="font-medium">WhatsApp Number</label>
                    <input value={customer.WhatsAppNo} maxLength={10} pattern="[6-9][0-9]{9}" className="w-full p-2 rounded-xl border" onChange={(e) => handleCustChange("WhatsAppNo", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                    {formErrors.WhatsAppNo && <p className="text-destructive text-xs">{formErrors.WhatsAppNo}</p>}
                  </div>
                )}

                {/* Note */}
                <div className="space-y-1">
                  <label className="font-medium">Note (optional)</label>
                  <textarea rows={3} value={customer.noteDescription} className="w-full p-2 rounded-xl border" onChange={(e) => handleCustChange("noteDescription", e.target.value)} />
                </div>

                <Button className="w-full h-12" onClick={() => validateCustomerForm() && setCheckoutPage(true)}>
                  Continue to Checkout
                </Button>
              </CardContent>
            </Card>

            {/* Sidebar summary */}
            <Card className="lg:col-span-1 border-0 shadow-xl bg-card/80 backdrop-blur-sm sticky top-4">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4">
                <CardTitle className="text-xl">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-sm">
                {tickets.filter((t) => counts[t._id] > 0).map((t) => (
                  <div key={t._id} className="flex justify-between items-center">
                    <span className="truncate flex-1 pr-2">{t.Name} × {counts[t._id]}</span>
                    <span className="font-semibold">₹{counts[t._id] * t.Price}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>₹{totalPrice}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN PAGE (step 1 – select date & tickets)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push(`/${role}/events`)} className="flex items-center gap-2 text-xs sm:text-sm">
            <ArrowLeft className="h-3 w-3" />
            Back to Events
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Book Event Tickets</h1>
        </div>

        {/* Date selection UI: show as selected if only one date, else show list */}
        {dates.length === 1 && selectedDateId && (
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4">
              <CardTitle className="flex items-center gap-2 text-xl"><CalendarDays className="h-5 w-5 text-primary" /> Event Date</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex gap-3 flex-wrap">
              {(() => {
                const d = dates[0];
                const f = formatDateBlock(d.EventStartDateTime);
                if (!f) return null;
                return (
                  <div key={d._id} className={"border-2 rounded-2xl px-4 py-3 min-w-[120px] text-center border-primary bg-primary text-primary-foreground scale-105"}>
                    <p className="text-sm font-semibold underline mb-1">{f.day}</p>
                    <p className="text-xs opacity-80 mb-1">{f.month} {f.year}</p>
                    <span className={"inline-block text-lg font-bold rounded-full px-3 py-1 bg-white/20"}>{f.date}</span>
                    <p className="text-xs opacity-80 mt-1">{f.time}</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
        {dates.length > 1 && (
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4">
              <CardTitle className="flex items-center gap-2 text-xl"><CalendarDays className="h-5 w-5 text-primary" /> Select Event Date</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex gap-3 flex-wrap">
              {dates.map((d) => {
                const f = formatDateBlock(d.EventStartDateTime);
                if (!f) return null;

                const selected = selectedDateId === d._id;
                return (
                  <div key={d._id} onClick={() => handleDateClick(d._id)} className={`cursor-pointer border-2 rounded-2xl px-4 py-3 min-w-[120px] text-center transition-all ${selected ? "border-primary bg-primary text-primary-foreground scale-105" : "border-border hover:border-primary/50"}`}>
                    <p className="text-sm font-semibold underline mb-1">{f.day}</p>
                    <p className="text-xs opacity-80 mb-1">{f.month} {f.year}</p>
                    <span className={`inline-block text-lg font-bold rounded-full px-3 py-1 ${selected ? "bg-white/20" : "bg-primary/10 text-primary"}`}>{f.date}</span>
                    <p className="text-xs opacity-80 mt-1">{f.time}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Ticket selection */}
        {selectedDateId && (
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4">
              <CardTitle className="flex items-center gap-2 text-xl"><Users className="h-5 w-5 text-primary" /> Available Tickets</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {tickets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No tickets available for this date</p>
              ) : (
                tickets.map((t) => {
                  const count = counts[t._id] || 0;
                  const selected = showCount[t._id];
                  const soldOut = t.AvailableQuantity === 0;
                  const maxAllowed = t.BookingMaxLimit ?? t.MaxQuantityAllowedPerOrder;
                  return (
                    <Card key={t._id} className={`border-2 transition-all ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"} ${soldOut ? "opacity-60" : ""}`}>
                      <CardContent className="p-4 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                        <div className="flex-1 space-y-1 min-w-0 pr-2">
                          <p className="font-bold truncate">{t.Name}</p>
                          {t.Description && <p className="text-xs text-muted-foreground leading-tight">{t.Description}</p>}
                          <div className="flex gap-4 text-xs mt-1">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Available: {t.AvailableQuantity}</span>
                          </div>
                        </div>
                        <div className="flex flex-row lg:flex-col items-center gap-3 lg:gap-2">
                          <p className="text-lg font-bold text-primary flex items-center"><IndianRupee className="h-4 w-4" />{t.Price}</p>
                          {selected ? (
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleDecrease(t._id)} className="h-8 w-8 p-0"><Minus className="h-3 w-3" /></Button>
                              <span className="w-8 text-center font-bold text-primary">{count}</span>
                              <Button size="sm" variant="outline" onClick={() => handleIncrease(t._id)} disabled={count >= maxAllowed || count >= t.AvailableQuantity} className="h-8 w-8 p-0"><Plus className="h-3 w-3" /></Button>
                            </div>
                          ) : (
                            <Button onClick={() => handleShowCount(t._id)} disabled={isAnyCountActive || soldOut} className="px-4" >{soldOut ? "Sold Out" : "Select"}</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* Sticky footer checkout */}
        {totalTickets > 0 && (
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm sticky bottom-2 z-10">
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex flex-col text-center sm:text-left">
                <p className="text-xl font-bold flex items-center gap-1"><IndianRupee className="h-5 w-5" />{totalPrice}</p>
                <p className="text-xs text-muted-foreground">{totalTickets} ticket{totalTickets !== 1 ? "s" : ""} selected</p>
              </div>
              <Button size="lg" className="w-full sm:w-auto h-12" onClick={() => setCustomerFormPage(true)}>Continue</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
