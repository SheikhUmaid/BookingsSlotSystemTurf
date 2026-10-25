import BookingCard from "../components/my_bookings/UpcomingBooking";
import BookingHistory from "../components/my_bookings/BookingHistory";




export default function BookingsPage() {
    return (<>



            {/* Booking components */}
            <BookingCard
               
                onViewTicket={() => navigate("/my-bookings/ticket")}
                onDirections={() => window.open("YOUR_MAPS_URL", "_blank")}
                onShareSquad={() => {
                    // Implement your squad-sharing flow.
                }}
            />

            <BookingHistory/>
    </>);
}