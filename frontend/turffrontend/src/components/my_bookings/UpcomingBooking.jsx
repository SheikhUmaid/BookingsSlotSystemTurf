
import { useState } from "react";
import TicketQRModal from "./TicketQRModal";

export default function UpcomingBooking() {
    const [showQR, setShowQR] = useState(false);

    const booking = {
        status: "Confirmed",
        sport: "5v5 Football",
        price: 1449,
        pitch: "Pitch A (Main Cage)",
        facility: "Pro FIFA Turf • Floodlit Apex",
        reference: "#SY-8824",
        date: "Thu, 19 Oct 2023",
        time: "07:00 PM - 08:00 PM",
        location: "Strikers Yard Downtown Arena Pitch",
        image:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuCd7-AZ52XPVXBpoSexcVVphhCQhIPv4i32Qm3Xu7bgh9eT_q_jC_gBlZiK_ov5m3cnfjoGQey1wj0IEKFKGTyxbXxJiCFkQuQ_5B4kVWUPPAqht86K6xgzadjNGJyPj6FgLHoGmkHS1WqcF-VikQUBt-wb68OnIZSIFZCOL6laZ_evfxufqjkBp51m_TgROLb22aotILp43wOS609xAiuYTDeEG6quYyUtlVqCoVV8TQiflydaR90LBw",
    };

    const shareBooking = async () => {
        const message = `${booking.sport} confirmed at ${booking.pitch}. ${booking.date}, ${booking.time}. Ref: ${booking.reference}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Strikers Yard Squad Pass",
                    text: message,
                    url: window.location.href,
                });
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Sharing failed:", error);
                }
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(
                `${message}\n${window.location.href}`
            );
            alert("Booking details copied!");
        } catch {
            alert(message);
        }
    };

    const openDirections = () => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            booking.location
        )}`;

        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <>
            <section className="w-full min-w-0 px-4 pt-3 pb-2 flex flex-col gap-4">
                {/* Section heading */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-4 shrink-0 rounded-full bg-primary" />
                        <span className="text-xs uppercase tracking-wider text-on-surface-variant">
                            Immediate Match Session
                        </span>
                    </div>

                    <span className="flex items-center gap-1 text-xs uppercase tracking-wider text-primary shrink-0">
                        <span className="material-symbols-outlined text-sm">
                            sync
                        </span>
                        <span>Live Slot Active</span>
                    </span>
                </div>

                {/* Main booking card */}
                <article className="relative w-full min-w-0 overflow-hidden rounded-xl bg-surface-container shadow-xl">
                    {/* Turf image */}
                    <div
                        className="relative h-36 w-full bg-cover bg-center"
                        style={{
                            backgroundImage: `url("${booking.image}")`,
                        }}
                    >
                        <div className="absolute inset-0 bg-linear-to-t from-surface-container via-surface-container/60 to-transparent" />

                        {/* Status and sport */}
                        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-container-lowest/90 px-2.5 py-2 text-xs uppercase tracking-wide text-primary">
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                    {booking.status}
                                </span>

                                <span className="rounded-md bg-surface-container-lowest/90 px-2.5 py-2 text-xs uppercase tracking-wide text-on-surface">
                                    {booking.sport}
                                </span>
                            </div>

                            <span className="shrink-0 rounded-md bg-surface-container-lowest/90 px-2.5 py-2 text-sm font-medium text-on-surface">
                                ₹{booking.price.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>

                    {/* Card content: consistent inner spacing */}
                    <div className="relative flex flex-col gap-4 p-4">
                        {/* Pitch and reference */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-medium leading-snug text-on-surface">
                                    {booking.pitch}
                                </h2>

                                <div className="mt-1 flex items-start gap-1.5 text-sm text-on-surface-variant">
                                    <span className="material-symbols-outlined text-base text-primary">
                                        stadium
                                    </span>
                                    <span>{booking.facility}</span>
                                </div>
                            </div>

                            <div className="shrink-0 text-right">
                                <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">
                                    Booking Ref
                                </span>
                                <span className="mt-1 block text-xs font-bold tracking-wider text-primary">
                                    {booking.reference}
                                </span>
                            </div>
                        </div>

                        {/* Date and time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg bg-surface-container-low p-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
                                    <span className="material-symbols-outlined text-xl">
                                        calendar_month
                                    </span>
                                </div>

                                <div className="min-w-0">
                                    <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">
                                        Match Date
                                    </span>
                                    <span className="mt-1 block text-sm font-medium leading-snug text-on-surface wrap-break-word">
                                        {booking.date}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
                                    <span className="material-symbols-outlined text-xl">
                                        schedule
                                    </span>
                                </div>

                                <div className="min-w-0">
                                    <span className="block text-[10px] uppercase tracking-wider text-on-surface-variant">
                                        Slot Timing
                                    </span>
                                    <span className="mt-1 block text-sm font-medium leading-snug text-on-surface">
                                        {booking.time}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Primary action */}
                        <button
                            type="button"
                            onClick={() => setShowQR(true)}
                            className="flex w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-3 text-on-primary transition-colors hover:bg-primary-container active:scale-[0.99]"
                        >
                            <span
                                className="material-symbols-outlined text-xl"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                qr_code_2
                            </span>
                            <span className="text-sm font-medium uppercase tracking-wide">
                                View Ticket / QR Pass
                            </span>
                        </button>

                        {/* Secondary actions */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={openDirections}
                                className="flex min-w-0 items-center justify-center gap-2 rounded-lg bg-surface-container-high px-2 py-3 text-on-surface transition-colors hover:bg-surface-bright"
                            >
                                <span className="material-symbols-outlined text-lg text-primary">
                                    near_me
                                </span>
                                <span className="text-xs uppercase tracking-wide">
                                    Directions
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={shareBooking}
                                className="flex min-w-0 items-center justify-center gap-2 rounded-lg bg-surface-container-high px-2 py-3 text-on-surface transition-colors hover:bg-surface-bright"
                            >
                                <span className="material-symbols-outlined text-lg text-primary">
                                    ios_share
                                </span>
                                <span className="text-xs uppercase tracking-wide">
                                    Share Squad
                                </span>
                            </button>
                        </div>
                    </div>
                </article>
            </section>

            {showQR && (
                <TicketQRModal
                    booking={booking}
                    onClose={() => setShowQR(false)}
                />
            )}
        </>
    );
}
