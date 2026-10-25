
const bookings = [
    {
        id: 1,
        sport: "Box Cricket",
        date: "Sun, 15 Oct",
        time: "08:00 PM - 09:00 PM",
        pitch: "Cage B",
        price: 1199,
        icon: "sports_baseball",
        status: "Completed",
    },
    {
        id: 2,
        sport: "5v5 Football",
        date: "Wed, 11 Oct",
        time: "06:00 PM - 07:00 PM",
        pitch: "Pitch A",
        price: 1449,
        icon: "sports_soccer",
        status: "Completed",
    },
    {
        id: 3,
        sport: "Box Cricket",
        date: "Fri, 06 Oct",
        time: "07:00 PM - 08:00 PM",
        pitch: "Cage B",
        price: 1199,
        icon: "sports_baseball",
        status: "Completed",
    },
];

function HistoryBookingCard({ booking }) {
    return (
        <article className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-surface-container p-4 shadow-md">
            {/* Sport icon and booking details */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-on-surface-variant">
                    <span className="material-symbols-outlined text-xl">
                        {booking.icon}
                    </span>
                </div>

                <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-on-surface">
                            {booking.sport}
                        </span>

                        <span className="rounded bg-surface-container-low px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-on-surface-variant">
                            {booking.date}
                        </span>
                    </div>

                    <span className="text-xs leading-relaxed text-on-surface-variant">
                        {booking.time} • {booking.pitch}
                    </span>
                </div>
            </div>

            {/* Status and price */}
            <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="flex items-center gap-1 rounded bg-surface-container-highest px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <span className="material-symbols-outlined text-xs">
                        check_circle
                    </span>
                    {booking.status}
                </span>

                <span className="text-xs font-medium text-on-surface-variant">
                    ₹{booking.price.toLocaleString("en-IN")}
                </span>
            </div>
        </article>
    );
}

export default function BookingHistory() {
    return (
        <section
            id="history-container"
            className="flex w-full min-w-0 flex-col gap-3 px-4 pt-5"
        >
            {/* Section heading */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="h-3.5 w-1.5 shrink-0 rounded-full bg-on-surface-variant/40" />

                    <h2 className="text-xs uppercase tracking-wider text-on-surface-variant">
                        Archived Matches &amp; Streaks
                    </h2>
                </div>

                <span className="shrink-0 text-[10px] uppercase tracking-wider text-on-surface-variant">
                    {bookings.length + 1} Settled
                </span>
            </div>

            {/* Booking history list */}
            <div className="flex flex-col gap-3">
                {bookings.map((booking) => (
                    <HistoryBookingCard key={booking.id} booking={booking} />
                ))}
            </div>
        </section>
    );
}
