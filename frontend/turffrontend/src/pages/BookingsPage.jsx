import UpcomingBooking from "../components/my_bookings/UpcomingBooking";
import BookingHistory from "../components/my_bookings/BookingHistory";
import { useState, useEffect } from "react";
import { getBooking } from "../services/api.service";



export default function BookingsPage() {



    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);


    async function handleGetBooking() {

        setIsLoading(true);
        try {
            let response = await getBooking();
            let data = response.data;
            setBookings(data);
        } catch (err) {
            console.log(err);
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        handleGetBooking();

    }, [])


    return (<>
        {
            isLoading ? <p className="px-4 py-6 text-sm text-on-surface-variant">
                Loading bookings...
            </p> : <>
                <UpcomingBooking
                    booking={bookings[0]}
                />

                <BookingHistory bookings={bookings} isLoading={isLoading} />
            </>
        }



    </>);
}