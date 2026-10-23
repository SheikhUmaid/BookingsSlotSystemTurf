import TurfBookingCard from "../components/booking/TurfBookingCard";
import SportSelection from "../components/booking/SelectSport";
import PitchEnclosure from "../components/booking/SelectPitch";
import DateSelector from "../components/booking/SelectDate";
import TimeSlotSelection from "../components/booking/SelectTimeSlot";
import PriceBreakdownModal from "../components/booking/PriceBreakdown";
import CheckoutBar from "../components/booking/CheckoutBar";
import { useSports } from "../hooks/useSports";
import { useRef, useState } from "react";
import LoginModal from "../components/shared/LoginModal";
import toast from "react-hot-toast"
import { isLoggedIn } from "../services/auth.service";


export default function BookPage() {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedSport, setSelectedSport] = useState(null);
    const { sports, loading, error } = useSports();
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
    const [price, setPrice] = useState(0)
    const [loginModalOpenState, setLoginModalOpenState] = useState(false)
    const serviceRef = useRef(null);
    const timeSlotRef = useRef(null);
    const [isLoggedInn, setIsLoggedIn] = useState(isLoggedIn())
    // get today's iso date
    const today = new Date();
    const isoDate = today.toISOString().split("T")[0];

    const [date, setDate] = useState(isoDate);
    const [jsonData, setJsonData] = useState({
        date: isoDate,
        service: null,
        time_slots: [],
    });

    //TODO: on first click it doesn't add service ID (sport ID)
    const handleSportChange = (sportId) => {
        setSelectedSport(sportId);

        setJsonData((prev) => ({
            ...prev,
            service: sportId,
        }));
    };

    const handleDateChange = (newDate) => {
        setDate(newDate);
        setSelectedTimeSlots([]);

        setJsonData((prev) => ({
            ...prev,
            date: newDate,
            time_slots: [],
        }));
    };

    const handleTimeSlotChange = ({ time_slots, price }) => {
        setSelectedTimeSlots(time_slots);
        setPrice(price);

        setJsonData((prev) => ({
            ...prev,
            time_slots,
        }));
    };

    function onProceed() {
        setIsLoggedIn(isLoggedIn());

        if (jsonData.service ===null) {
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

        if(!isLoggedInn){
            setLoginModalOpenState(!loginModalOpenState)
            return;
        }

        console.log("proceeeding...")
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

            <CheckoutBar date={date} pitch="Pitch A" slotPrice={price} fee={0} onDetailsClick={() => setShowBreakdown(true)} onProceed={()=>{onProceed();}} />

            <div className="h-16"></div>

            <PriceBreakdownModal isOpen={showBreakdown} onClose={() => setShowBreakdown(false)} slotPrice={[price]} />

            <LoginModal
        isOpen={loginModalOpenState}
        onClose={() => setLoginModalOpenState(false)}
        onSendOtp={async (phone) => {
          // Replace with your API request.
          // Example: await api.post("/auth/send-otp", { phone });
          console.log("Send OTP to:", phone);
        }}
        onVerifyOtp={async (phone, otp) => {
          // Replace with your API request.
          // Example: await api.post("/auth/verify-otp", { phone, otp });
          console.log("Verify:", phone, otp);
        }}
      />
        </div>


    );
}