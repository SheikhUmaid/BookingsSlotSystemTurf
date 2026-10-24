import TurfBookingCard from "../components/booking/TurfBookingCard";
import SportSelection from "../components/booking/SelectSport";
import PitchEnclosure from "../components/booking/SelectPitch";
import DateSelector from "../components/booking/SelectDate";
import TimeSlotSelection from "../components/booking/SelectTimeSlot";
import PriceBreakdownModal from "../components/booking/PriceBreakdown";
import CheckoutBar from "../components/booking/CheckoutBar";
import CouponCode from "../components/booking/CouponCode";
import { useSports } from "../hooks/useSports";
import { useRef, useState } from "react";
import LoginModal from "../components/shared/LoginModal";
import toast from "react-hot-toast"
import { isLoggedIn } from "../services/auth.service";
import { createBooking, createOrder, verifyCoupon } from "../services/api.service";

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayCheckout() {
    if (window.Razorpay) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_URL}"]`);
        const script = existingScript || document.createElement("script");

        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));

        if (!existingScript) {
            script.src = RAZORPAY_CHECKOUT_URL;
            script.async = true;
            document.body.appendChild(script);
        }
    });
}


export default function BookPage() {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedSport, setSelectedSport] = useState(null);
    const { sports } = useSports();
    const [, setSelectedTimeSlots] = useState([]);
    const [basePrice, setBasePrice] = useState(0);
    const [price, setPrice] = useState(0)
    const [loginModalOpenState, setLoginModalOpenState] = useState(false)
    const serviceRef = useRef(null);
    const timeSlotRef = useRef(null);
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    // get today's iso date
    const today = new Date();
    const isoDate = today.toISOString().split("T")[0];

    const [date, setDate] = useState(isoDate);
    const [jsonData, setJsonData] = useState({
        date: isoDate,
        service: null,
        time_slots: [],
        coupon_code: ""
    });

    //TODO: on first click it doesn't add service ID (sport ID)
    const handleSportChange = (sportId) => {
        setSelectedSport(sportId);
        setAppliedCoupon(null);
        setJsonData((prev) => ({
            ...prev,
            service: sportId,
        }));
    };

    const handleDateChange = (newDate) => {
        setDate(newDate);
        setSelectedTimeSlots([]);
        setAppliedCoupon(null);

        setJsonData((prev) => ({
            ...prev,
            date: newDate,
            time_slots: [],
            coupon_code: ""
        }));
    };

    const handleTimeSlotChange = ({ time_slots, price }) => {
        setSelectedTimeSlots(time_slots);
        setBasePrice(price);
        setPrice(price);
        setAppliedCoupon(null);

        setJsonData((prev) => ({
            ...prev,
            time_slots,
            coupon_code: "",
        }));
    };

    async function onProceed() {
        if (jsonData.service === null) {
            //sroll to the component
            serviceRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            toast.error("Please select game")

            return;
        }
        if (!jsonData.time_slots?.length) {

            timeSlotRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            toast.error("Please select atleat one time slot")
            return;
        }

        if (!isLoggedIn()) {
            setLoginModalOpenState(true);
            return;
        }

        try {
            setIsProcessing(true);
            await loadRazorpayCheckout();

            const bookingResponse = await createBooking(jsonData);
            const bookingId = bookingResponse.data.booking?._id;

            if (!bookingId) {
                throw new Error("Booking was created without an ID.");
            }

            const orderResponse = await createOrder({
                bookingId,
                paymentType: "full",
            });
            const order = orderResponse.data;
            const checkout = new window.Razorpay({
                key: order.key_id,
                amount: order.amount,
                currency: order.currency,
                order_id: order.order_id,
                name: "Turf Booking",
                description: "Booking payment",
                handler: () => {
                    setIsProcessing(false);
                    toast.success("Payment submitted. Your booking will update once payment is confirmed.");
                },
                modal: {
                    ondismiss: () => setIsProcessing(false),
                },
            });

            checkout.on("payment.failed", (event) => {
                setIsProcessing(false);
                toast.error(event.error?.description || "Payment failed. Please try again.");
            });

            checkout.open();
        } catch (error) {
            setIsProcessing(false);
            toast.error(
                error.response?.data?.message || error.message || "Unable to start payment. Please try again."
            );
        }
    }


    async function applyCouponCode(coupon) {
        setCouponLoading(true);
        try {
            const res = await verifyCoupon(coupon);

            if (!res.data.active) {
                throw new Error(res.data.message || "This coupon is not active.");
            }

            setAppliedCoupon({ code: coupon });
            setPrice(basePrice - (basePrice * res.data.discount_percentage / 100));
            setJsonData((prev) => ({ ...prev, coupon_code: coupon }));
        } finally {
            setCouponLoading(false);
        }
    }
    return (

        <div className="min-h-screen bg-[#111315]">
            <TurfBookingCard />
            <div ref={serviceRef}>
                <SportSelection sports={sports} handleSportChange={handleSportChange} selectedSport={selectedSport} />
            </div>

            <PitchEnclosure onPitchChange={(pitch) => console.log("Selected pitch:", pitch)} />

            <DateSelector onDateChange={handleDateChange} />
            <div ref={timeSlotRef}>

                <TimeSlotSelection date={date} onSlotChange={(timeSlot) => {
                    handleTimeSlotChange(timeSlot);
                }} />
            </div>

            <CheckoutBar isProcessing={isProcessing} date={date} pitch="Pitch A" slotPrice={price} fee={0} onDetailsClick={() => setShowBreakdown(true)} onProceed={() => { onProceed(); }} />


            <CouponCode
                appliedCoupon={appliedCoupon}
                loading={couponLoading}
                onApply={applyCouponCode}
                onRemove={async () => {
                    setAppliedCoupon(null);
                    setPrice(basePrice);
                    setJsonData((prev) => ({ ...prev, coupon_code: "" }));
                }}
            />





            <div className="h-20"></div>

            <PriceBreakdownModal isOpen={showBreakdown} onClose={() => setShowBreakdown(false)} slotPrice={[price]} />

            <LoginModal isOpen={loginModalOpenState} onClose={() => setLoginModalOpenState(false)} />

        </div>


    );
}