import UpcomingBooking from "../components/my_bookings/UpcomingBooking";
import BookingHistory from "../components/my_bookings/BookingHistory";
import ShowLoginButton from "../components/shared/ShowLoginButton";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getBooking } from "../services/api.service";
import { useAuth } from "../services/auth.service";

export default function BookingsPage() {
    const { isAuthenticated } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    async function handleGetBooking() {
        setIsLoading(true);
        try {
            const response = await getBooking();
            const data = response?.data;
            setBookings(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch bookings:", err);
            setBookings([]);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (isAuthenticated) {
            handleGetBooking();
        } else {
            setBookings([]);
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="w-full px-5 pt-5">
                <ShowLoginButton
                    title="My Bookings"
                    badge="Sign In Required"
                    heading="Sign in to view your bookings"
                    description="Log in with your mobile number to track upcoming match slots, access QR passes, and check your turf reservation history."
                    buttonText="Sign In to View Bookings"
                    icon="calendar_month"
                    onLoginSuccess={handleGetBooking}
                />
            </div>
        );
    }

    return (
        <div className="w-full">
            {isLoading ? (
                <p className="px-5 py-6 font-['Hanken_Grotesk'] text-sm text-on-surface-variant">
                    Loading bookings...
                </p>
            ) : bookings.length === 0 ? (
                <div className="px-5 pt-5">
                    <section className="w-full rounded-xl border border-white/[0.08] bg-surface-container p-6 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-surface-container-low text-emerald-400">
                            <span className="material-symbols-outlined text-[28px]">
                                event_busy
                            </span>
                        </div>
                        <h3 className="font-['Space_Grotesk'] text-lg font-bold text-white">
                            No Bookings Found
                        </h3>
                        <p className="mt-1.5 font-['Hanken_Grotesk'] text-sm text-on-surface-variant">
                            You don't have any turf bookings scheduled yet.
                        </p>
                        <Link
                            to="/book"
                            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-[#052e16] transition hover:bg-emerald-300 shadow-lg shadow-emerald-400/10"
                        >
                            <span>Book a Slot Now</span>
                            <span className="material-symbols-outlined text-[16px]">
                                arrow_forward
                            </span>
                        </Link>
                    </section>
                </div>
            ) : (
                <>
                    <UpcomingBooking booking={bookings[0]} />
                    <BookingHistory bookings={bookings} isLoading={isLoading} />
                </>
            )}
        </div>
    );
}
