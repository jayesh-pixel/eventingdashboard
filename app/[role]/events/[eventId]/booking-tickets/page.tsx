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

import { authFetch } from "@/lib/auth-fetch"
import * as React from "react";
import { useRouter } from "next/navigation";
import { formatEventDate, formatEventTime, normalizeSearchText, parseEventDateTime } from "@/lib/utils";

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
  Loader2,
  Minus,
  Plus,
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
// The API returns event date/times as wall-clock values tagged +00:00, so they
// are rendered as stored rather than converted into another timezone.
const formatTimeInIST = (iso: string) =>
  formatEventTime(iso, { hour: "2-digit", minute: "2-digit" }, "en-IN");

// Season passes span every date of the event, so label them with the range
// rather than a single date.
const formatDateRange = (list: { EventStartDateTime: string }[]) => {
  if (list.length === 0) return "N/A";
  const asDay = (iso: string) =>
    formatEventDate(iso, { day: "2-digit", month: "short", year: "numeric" }, "en-IN");
  const sorted = [...list].sort(
    (a, b) =>
      (parseEventDateTime(a.EventStartDateTime)?.getTime() ?? 0) -
      (parseEventDateTime(b.EventStartDateTime)?.getTime() ?? 0)
  );
  const first = asDay(sorted[0].EventStartDateTime);
  const last = asDay(sorted[sorted.length - 1].EventStartDateTime);
  return first === last ? first : `${first} - ${last}`;
};

const sortByStart = <T extends { EventStartDateTime: string }>(list: T[]) =>
  [...list].sort(
    (a, b) =>
      (parseEventDateTime(a.EventStartDateTime)?.getTime() ?? 0) -
      (parseEventDateTime(b.EventStartDateTime)?.getTime() ?? 0)
  );

// Calendar-day key used to group show slots that fall on the same date.
const dayKeyOf = (iso: string) =>
  formatEventDate(iso, { year: "numeric", month: "2-digit", day: "2-digit" }, "en-CA");

const slotTimeOf = (iso: string) =>
  formatEventTime(iso, { hour: "numeric", minute: "2-digit", hour12: true }, "en-US");

// "Sun, 31 Jan · 3:00 PM" - shown under the title of a single-date event.
const formatSingleDateLine = (iso: string) => {
  const weekday = formatEventDate(iso, { weekday: "short" }, "en-US");
  const day = formatEventDate(iso, { day: "numeric" }, "en-US");
  const month = formatEventDate(iso, { month: "short" }, "en-US");
  return `${weekday}, ${day} ${month} · ${slotTimeOf(iso)}`;
};

// The event-by-id response is not typed, so read the title/venue defensively.
const readEventHeader = (ev: any) => {
  const venue =
    ev?.VenueName || ev?.venueName || ev?.EventVenue || (typeof ev?.Venue === "string" ? ev.Venue : "") || "";
  const city = ev?.VenueCity || ev?.CityName || ev?.City || ev?.VenueToBeAnnouncedCity || "";
  return {
    name: ev?.EventName || ev?.eventName || "",
    venue: [venue, city].filter(Boolean).join(", "),
  };
};

// Brand gradient (logo cyan -> deep blue) used for the active chip and CTAs.
const BRAND_GRADIENT = "bg-gradient-to-br from-[#00E1FC] to-[#0F33D1] text-white";

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
  const [ticketsLoading, setTicketsLoading] = React.useState(false);
  const [eventInfo, setEventInfo] = React.useState({ name: "", venue: "" });
  const [selectedDateId, setSelectedDateId] = React.useState<string | null>(null);
  // Multi-day events can also sell a season pass. It is offered as an extra tab
  // next to the dates; picking it shows the season pass tickets instead of the
  // tickets for a single date.
  const [selectionMode, setSelectionMode] = React.useState<"date" | "season">("date");
  const [dates, setDates] = React.useState<EventDateTime[]>([]);
  const [tickets, setTickets] = React.useState<TicketData[]>([]);
  const [seasonPasses, setSeasonPasses] = React.useState<TicketData[]>([]);
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

  // A season pass is valid for every date of the event, so it is not tied to the
  // date the user picked. Keep both lists in one array for totals/selection.
  const isMultiDayEvent = dates.length > 1;
  const selectableTickets = React.useMemo(
    () => [...seasonPasses, ...tickets],
    [seasonPasses, tickets]
  );
  const isSeasonPassTicket = React.useCallback(
    (id: string) => seasonPasses.some((sp) => sp._id === id),
    [seasonPasses]
  );

  // Dates are picked as calendar days; a day with several show slots then
  // offers them as time chips underneath.
  const dayGroups = React.useMemo(() => {
    const groups: { key: string; slots: EventDateTime[] }[] = [];
    for (const d of dates) {
      const key = dayKeyOf(d.EventStartDateTime);
      const group = groups.find((g) => g.key === key);
      if (group) group.slots.push(d);
      else groups.push({ key, slots: [d] });
    }
    return groups;
  }, [dates]);
  const selectedDate = dates.find((d) => d._id === selectedDateId);
  const selectedDayKey = selectedDate ? dayKeyOf(selectedDate.EventStartDateTime) : null;
  const selectedDaySlots = dayGroups.find((g) => g.key === selectedDayKey)?.slots ?? [];

  // Derived totals -------------------------------------------------------------
  const totalTickets = Object.values(counts).reduce((s, n) => s + n, 0);
  const totalPrice = selectableTickets.reduce((s, t) => s + (counts[t._id] || 0) * t.Price, 0);
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

        const res = await authFetch(promoterEndPointPannel.GET_ALL_EVENT_DATE_BY_EVENT_ID, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ event_id: eventId }),
        });

        if (!res.ok) throw new Error("Failed to load dates");
        const data = await res.json();
        const list: EventDateTime[] = sortByStart(
          data?.data?.EventDateTimeData?.length > 0
            ? data.data.EventDateTimeData
            : data?.data?.EventDateTime ?? []
        );
        setDates(list);
        setEventInfo(readEventHeader(Array.isArray(data?.data) ? data.data[0] : data?.data));

        // Multi-day event -> the event can also sell a Season Pass that covers
        // every date, so fetch those alongside the per-date tickets.
        if (list.length > 1) {
          const spToken = getValidToken();
          if (user && spToken) {
            try {
              const spRes = await authFetch(promoterEndPointPannel.GET_PROMOTER_SEASON_PASS, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${spToken}`,
                },
                body: JSON.stringify({ event_id: eventId, promoter_id: user.user_id }),
              });
              if (spRes.ok) {
                const spData = await spRes.json();
                setSeasonPasses(Array.isArray(spData?.data) ? spData.data : []);
              } else {
                // 404 simply means this event has no season pass configured.
                setSeasonPasses([]);
              }
            } catch {
              // Season passes are optional; never block the per-date tickets.
              setSeasonPasses([]);
            }
          }
        } else {
          setSeasonPasses([]);
        }

        // Open on the earliest date so tickets show straight away; on a
        // multi-day event the user can switch dates or pick the season pass.
        if (list.length > 0) {
          setSelectedDateId(list[0]._id);
          // Fetch tickets for that date
          const token2 = getValidToken();
          if (user && token2) {
            const payload = { event_id: eventId, eventDateTime_id: list[0]._id, promoter_id: user.user_id };
            const res2 = await authFetch(promoterEndPointPannel.GET_PROMOTER_TICKET_DATA_BY_EVENT_DATE, {
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
            } else {
              // 404 = no tickets assigned to this promoter for this date.
              setTickets([]);
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
    setSelectionMode("date");
    setCounts({});
    setShowCount({});
    setTicketsLoading(true);
    try {
      const token = getValidToken();
      if (!user || !token) return;

      const payload = { event_id: eventId, eventDateTime_id: dateId, promoter_id: user.user_id };
      const res = await authFetch(promoterEndPointPannel.GET_PROMOTER_TICKET_DATA_BY_EVENT_DATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // 404 is the documented "No Tickets Found for the Promoter" response,
      // i.e. this promoter has no single-day ticket for this date. That is an
      // empty result, not an error - a season pass may still be on offer.
      if (res.status === 404) {
        setTickets([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch ticket data");
      const data = await res.json();
      setTickets(data.data ?? []);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not load tickets", variant: "destructive" });
    } finally {
      setTicketsLoading(false);
    }
  };


  // The Season Pass tab sits next to the dates but is not a date. Keep whatever
  // date was picked (the booking payload still needs one) and swap the ticket
  // list for the passes.
  const handleSeasonPassClick = () => {
    setSelectionMode("season");
    setCounts({});
    setShowCount({});
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

  // ────────────────────────────────────────────────────────────────────────────
  // Shared ticket row renderer (used for per-date tickets and for season passes)
  // ────────────────────────────────────────────────────────────────────────────
  const renderTicketRow = (t: TicketData, seasonPass = false) => {
    const count = counts[t._id] || 0;
    const selected = showCount[t._id];
    // Availability / per-order cap can be absent from the response; only apply
    // a limit we actually know about instead of comparing against undefined.
    const hasAvailability = typeof t.AvailableQuantity === "number";
    const soldOut = hasAvailability && t.AvailableQuantity === 0;
    const maxAllowed = t.BookingMaxLimit ?? t.MaxQuantityAllowedPerOrder;
    const atLimit =
      (typeof maxAllowed === "number" && count >= maxAllowed) ||
      (hasAvailability && count >= t.AvailableQuantity);
    // Only one ticket type can be booked per order, so the others lock while a
    // quantity is being chosen.
    const locked = isAnyCountActive && !selected;
    const hasFooter = !!t.Description || seasonPass || hasAvailability;
    return (
      <div
        key={t._id}
        className={`rounded-2xl border bg-card p-5 transition-colors ${selected ? "border-[#00E1FC]/60" : "border-border"} ${soldOut || locked ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="font-semibold text-base sm:text-lg leading-tight break-words">{t.Name}</p>
            <p className="font-semibold text-base sm:text-lg">₹{t.Price}</p>
          </div>
          {selected && count > 0 ? (
            <div className={`flex h-11 w-[130px] shrink-0 items-center justify-between rounded-xl px-1 ${BRAND_GRADIENT}`}>
              <button type="button" aria-label="Remove one" onClick={() => handleDecrease(t._id)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15">
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-bold tabular-nums">{count}</span>
              <button type="button" aria-label="Add one" onClick={() => handleIncrease(t._id)} disabled={atLimit} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleIncrease(t._id)}
              disabled={locked || soldOut}
              className={`h-11 w-[130px] shrink-0 rounded-xl font-bold tracking-wide transition-opacity disabled:cursor-not-allowed ${soldOut ? "bg-muted text-muted-foreground" : `${BRAND_GRADIENT} hover:opacity-90`}`}
            >
              {soldOut ? "SOLD OUT" : "ADD"}
            </button>
          )}
        </div>
        {hasFooter && (
          <div className="mt-4 border-t pt-4 space-y-1.5 text-sm text-muted-foreground">
            {t.Description && <p className="leading-snug">{t.Description}</p>}
            {seasonPass && <p>Valid for all {dates.length} days · {formatDateRange(dates)}</p>}
            {hasAvailability && !soldOut && <p className="text-xs">{t.AvailableQuantity} available</p>}
          </div>
        )}
      </div>
    );
  };

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
    else if (customer.PhoneNo.trim().length !== 10) errors.PhoneNo = "Phone number must be 10 digits";
    if (!customer.Email.trim()) errors.Email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.Email.trim())) errors.Email = "Enter a valid email";
    if (customer.Age.trim()) {
      const age = parseInt(customer.Age, 10);
      if (isNaN(age) || age < 1 || age > 120) errors.Age = "Age should be 1–120";
    }
    // WhatsApp number is optional on the backend; only check its format when provided
    if (customer.isWhatsApp === 0 && customer.WhatsAppNo.trim() && customer.WhatsAppNo.trim().length !== 10) errors.WhatsAppNo = "WhatsApp no. must be 10 digits";
    // Note is optional, but when provided the backend requires at least 3 characters
    if (customer.noteDescription.trim() && customer.noteDescription.trim().length < 3) errors.noteDescription = "Note must be at least 3 characters";
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
      if (!user || !token) return;
      const selectedTicket = selectableTickets.find((t) => counts[t._id] > 0);
      if (!selectedTicket) {
        toast({ title: "Validation Error", description: "Please select at least one ticket", variant: "destructive" });
        return;
      }

      // A season pass covers every date, so its ticket document carries no
      // EventDateTime_id. Sending one makes the backend's stock filter match
      // nothing, which surfaces as "409 Insufficient Tickets Available" - so the
      // field is left out of the payload below for passes. The id is still
      // resolved here because the confirmation screen labels the booking with it.
      const isSeasonPass = isSeasonPassTicket(selectedTicket._id);
      const bookingDateId = isSeasonPass ? selectedDateId ?? dates[0]?._id : selectedDateId;
      if (!isSeasonPass && !bookingDateId) {
        toast({ title: "Validation Error", description: "Please select an event date", variant: "destructive" });
        return;
      }

      // Stray spaces around the typed name/email are stored verbatim by the
      // backend, and a booking saved as " Eventing Club LLP " then goes missing
      // from the booking table until the same spacing is searched for.
      const customerName = normalizeSearchText(customer.FullName);
      const customerEmail = customer.Email.trim();
      const customerPhone = customer.PhoneNo.trim();

      const payload: any = {
        promoter_id: user.user_id,
        event_id: eventId,
        EventTicketType: String(
          selectedTicket.TicketType || (isSeasonPass ? TicketType.SeasonPass : TicketType.SingleDay)
        ),
        EventTicket_id: selectedTicket._id,
        CustomerName: customerName,
        PhoneNumber: customerPhone,
        isWhatsAppNumberisSame: customer.isWhatsApp,
        Email: customerEmail,
        TicketQuantity: totalTickets,
      }

      // Only a date-bound ticket has an EventDateTime_id on the backend; a
      // season pass must be booked without one.
      if (!isSeasonPass && bookingDateId) {
        payload.EventDateTime_id = bookingDateId
      }

      // Only send WhatsAppNumber if it's a valid 10-digit number
      const whatsappNum = customer.isWhatsApp === 1 ? customerPhone : (customer.WhatsAppNo.trim() || customerPhone)
      if (whatsappNum && /^\d{10}$/.test(whatsappNum)) {
        payload.WhatsAppNumber = whatsappNum
      }

      // PromoterNote is optional — only send it when provided (length checked in validateCustomerForm)
      if (customer.noteDescription && customer.noteDescription.trim()) {
        payload.PromoterNote = customer.noteDescription.trim()
      }

      // Only send CustomerAge if it's a positive integer (Joi positive())
      if (customer.Age) {
        const age = parseInt(customer.Age, 10)
        if (age > 0) {
          payload.CustomerAge = age
        }
      }

      const res = await authFetch(promoterEndPointPannel.BOOKING_TICKET_BY_PROMOTER, {
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
        await authFetch(websiteCustomer.CREATE_CUSTOMER_WEBSITE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            CustomerName: customerName,
            Email: customerEmail,
            MobileNumber: customerPhone,
            createduser_id: user.user_id,
          }),
        });
      } catch {
        // Customer creation is best-effort; don't fail the booking
      }

      // Store booking details for success page
      const selectedDate = dates.find((d) => d._id === bookingDateId);
      setBookingResult({
        bookingId: bookingData?.data?.Booking_id || bookingData?.data?.booking_id || bookingData?.data?._id || "N/A",
        customerName: customer.FullName,
        phone: customer.PhoneNo,
        email: customer.Email,
        ticketName: selectedTicket?.Name || "N/A",
        quantity: totalTickets,
        totalPrice: totalPrice,
        ticketPrice: selectedTicket?.Price || 0,
        eventDate: isSeasonPass
          ? formatDateRange(dates)
          : selectedDate
          ? formatEventDate(selectedDate.EventStartDateTime, { day: "2-digit", month: "short", year: "numeric" }, "en-IN")
          : "N/A",
        eventTime: isSeasonPass
          ? `All ${dates.length} days`
          : selectedDate
          ? formatTimeInIST(selectedDate.EventStartDateTime) + " - " + formatTimeInIST(selectedDate.EventEndDateTime)
          : "N/A",
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
                {selectableTickets.filter((t) => counts[t._id] > 0).map((t) => (
                  <div key={t._id} className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border">
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {t.Name}
                        {isSeasonPassTicket(t._id) && (
                          <Badge variant="secondary" className="ml-2 align-middle text-[10px]">Season Pass</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isSeasonPassTicket(t._id)
                          ? `Valid for all ${dates.length} days · ${formatDateRange(dates)}`
                          : `${formatTimeInIST(t.EventStartDateTime)} – ${formatTimeInIST(t.EventEndDateTime)}`}
                      </p>
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
                  <label className="font-medium">Full Name *</label>
                  <input value={customer.FullName} className="w-full p-2 rounded-xl border" onChange={(e) => handleCustChange("FullName", e.target.value)} />
                  {formErrors.FullName && <p className="text-destructive text-xs">{formErrors.FullName}</p>}
                </div>

                {/* Phone only */}
                <div className="space-y-1">
                  <label className="font-medium">Phone Number *</label>
                  <input value={customer.PhoneNo} maxLength={10} pattern="[6-9][0-9]{9}" className="w-full p-2 rounded-xl border" onChange={(e) => handleCustChange("PhoneNo", e.target.value.replace(/\D/g, "").slice(0, 10))} />
                  {formErrors.PhoneNo && <p className="text-destructive text-xs">{formErrors.PhoneNo}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="font-medium">Email *</label>
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
                  {formErrors.noteDescription && <p className="text-destructive text-xs">{formErrors.noteDescription}</p>}
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
                {selectableTickets.filter((t) => counts[t._id] > 0).map((t) => (
                  <div key={t._id} className="flex justify-between items-center">
                    <span className="truncate flex-1 pr-2">
                      {t.Name} × {counts[t._id]}
                      {isSeasonPassTicket(t._id) && (
                        <Badge variant="secondary" className="ml-2 align-middle text-[10px]">Season Pass</Badge>
                      )}
                    </span>
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
  const sectionHeading = (label: string) => (
    <div className="flex items-center gap-4">
      <h2 className="text-sm font-extrabold uppercase tracking-wider whitespace-nowrap">{label}</h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  );

  const dateChipBase =
    "flex h-20 min-w-[70px] flex-col items-center justify-center rounded-xl border px-3 transition-all";
  const selectedTicket = selectableTickets.find((t) => counts[t._id] > 0);
  const showTickets = selectionMode === "season" ? seasonPasses.length > 0 : !!selectedDateId;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto max-w-4xl flex-1 px-4 py-6 sm:py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to events"
            onClick={() => router.push(`/${role}/events`)}
            className="h-11 w-11 shrink-0 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight break-words">
              {eventInfo.name || "Book Event Tickets"}
            </h1>
            {eventInfo.venue && <p className="text-muted-foreground">{eventInfo.venue}</p>}
            {!isMultiDayEvent && dates[0] && (
              <p className="text-sm font-medium text-[#0F33D1] dark:text-[#00E1FC]">
                {formatSingleDateLine(dates[0].EventStartDateTime)}
              </p>
            )}
          </div>
        </div>

        {/* Date & time selection - multi-date events only */}
        {isMultiDayEvent && (
          <section className="space-y-4">
            {sectionHeading("Select Date & Time")}
            <div className="flex flex-wrap gap-3">
              {dayGroups.map((g, i) => {
                const first = g.slots[0].EventStartDateTime;
                const month = formatEventDate(first, { month: "short" }, "en-US").toUpperCase();
                const prevMonth =
                  i > 0
                    ? formatEventDate(dayGroups[i - 1].slots[0].EventStartDateTime, { month: "short" }, "en-US").toUpperCase()
                    : null;
                const selected = selectionMode === "date" && selectedDayKey === g.key;
                return (
                  <React.Fragment key={g.key}>
                    {month !== prevMonth && (
                      <div className="flex h-20 w-11 items-center justify-center rounded-xl border bg-card">
                        <span className="rotate-180 text-xs font-bold tracking-[0.2em] [writing-mode:vertical-rl]">{month}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDateClick(g.slots[0]._id)}
                      className={`${dateChipBase} ${
                        selected
                          ? `${BRAND_GRADIENT} border-transparent shadow-[0_8px_20px_-6px_rgba(0,225,252,0.6)]`
                          : "bg-card border-border hover:border-[#00E1FC]/60"
                      }`}
                    >
                      <span className="text-xl font-bold leading-none">{formatEventDate(first, { day: "numeric" }, "en-US")}</span>
                      <span className={`mt-1.5 text-sm ${selected ? "text-white/90" : "text-muted-foreground"}`}>
                        {formatEventDate(first, { weekday: "short" }, "en-US")}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}

              {/* Season Pass sits alongside the dates as its own tab: it covers
                  every date, so it is picked instead of a single date. */}
              {seasonPasses.length > 0 && (
                <button
                  type="button"
                  onClick={handleSeasonPassClick}
                  className={`${dateChipBase} px-4 ${
                    selectionMode === "season"
                      ? "border-transparent bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_8px_20px_-6px_rgba(245,158,11,0.6)]"
                      : "bg-card border-amber-500/50 hover:border-amber-500"
                  }`}
                >
                  <span className={`font-bold ${selectionMode === "season" ? "" : "text-amber-600 dark:text-amber-300"}`}>Season Pass</span>
                  <span className={`mt-1 text-sm ${selectionMode === "season" ? "text-white/90" : "text-muted-foreground"}`}>
                    All {dates.length} days
                  </span>
                </button>
              )}
            </div>

            {/* Show slots for the picked day */}
            {selectionMode === "date" && selectedDaySlots.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {selectedDaySlots.map((s) => {
                  const selected = s._id === selectedDateId;
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => !selected && handleDateClick(s._id)}
                      className={`h-14 min-w-[130px] rounded-xl border px-5 font-semibold transition-colors ${
                        selected
                          ? "border-[#00E1FC] bg-[#00E1FC]/10"
                          : "border-border bg-card hover:border-[#00E1FC]/60"
                      }`}
                    >
                      {slotTimeOf(s.EventStartDateTime)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Ticket selection - per-date tickets, or the season passes when the
            Season Pass tab is active. */}
        {showTickets && (
          <section className="space-y-4">
            {ticketsLoading && selectionMode === "date" ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {selectionMode === "season" ? (
                  seasonPasses.map((sp) => renderTicketRow(sp, true))
                ) : tickets.length === 0 ? (
                  <p className="rounded-2xl border border-dashed py-10 text-center text-muted-foreground">
                    No tickets available for this date
                  </p>
                ) : (
                  tickets.map((t) => renderTicketRow(t))
                )}
              </div>
            )}
          </section>
        )}

        {dates.length === 0 && (
          <p className="rounded-2xl border border-dashed py-10 text-center text-muted-foreground">
            No dates are scheduled for this event yet
          </p>
        )}
      </div>

      {/* Checkout bar */}
      <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {totalTickets > 0 ? (
              <>
                <p className="truncate text-sm text-muted-foreground">
                  {totalTickets} × {selectedTicket?.Name}
                </p>
                <p className="text-xl font-bold">₹{totalPrice}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No tickets selected</p>
                <p className="text-xl font-bold leading-none">—</p>
              </>
            )}
          </div>
          <button
            type="button"
            disabled={totalTickets === 0}
            onClick={() => setCustomerFormPage(true)}
            className={`h-12 w-40 sm:w-48 shrink-0 rounded-xl font-bold transition-opacity ${BRAND_GRADIENT} hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
