import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { generateBookings, fmtDate, isSlotTaken, services, timeSlots, type Booking } from "./turf-data";

export type BookingDraft = { date?: string; serviceId?: string; slotId?: string };

type Ctx = {
  today: Date;
  bookings: Booking[];
  createBooking: (b: { date: string; serviceId: string; slotId: string; customer: string; phone: string }) => { ok: true; booking: Booking } | { ok: false; error: string };
  draft: BookingDraft | null;
  openBooking: (d?: BookingDraft) => void;
  closeBooking: () => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [bookings, setBookings] = useState<Booking[]>(() => generateBookings(today));
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  const createBooking: Ctx["createBooking"] = ({ date, serviceId, slotId, customer, phone }) => {
    if (isSlotTaken(bookings, date, serviceId, slotId)) {
      return { ok: false, error: "This slot was just booked by someone else. Please choose another slot." };
    }
    const slot = timeSlots.find((s) => s.id === slotId)!;
    const n = 2000 + bookings.length;
    const booking: Booking = {
      id: `BK-${n}`,
      customer,
      phone,
      serviceId,
      date,
      slotIds: [slotId],
      total: slot.price,
      paid: 0,
      status: "Pending",
      paymentType: "Full",
      orderId: `order_MANUAL${n}`,
      createdAt: fmtDate(new Date()),
    };
    setBookings((prev) => [booking, ...prev]);
    return { ok: true, booking };
  };

  return (
    <StoreCtx.Provider
      value={{
        today,
        bookings,
        createBooking,
        draft,
        openBooking: (d) => setDraft({ serviceId: services[0]!.id, date: fmtDate(today), ...d }),
        closeBooking: () => setDraft(null),
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
