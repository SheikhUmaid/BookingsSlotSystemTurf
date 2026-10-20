import TurfBookingCard from "../components/TurfBookingCard";
import SportSelection from "../components/SelectSport";
import PitchEnclosure from "../components/SelectPitch";
import DateSelector from "../components/SelectDate";
import TimeSlotSelection from "../components/SelectTimeSlot";
import PriceBreakdownModal from "../components/PriceBreakdown";
import CheckoutBar from "../components/CheckoutBar";
import { useSports } from "../hooks/useSports";
import { useState } from "react";
export default function BookPage() {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedSport, setSelectedSport] = useState(null);
    const { sports, loading, error } = useSports();
    const [jsonData, setJsonData] = useState({});

    







    //TODO: on first click it doesn't add service ID (sport ID)
    const handleSportChange = (sport) => {
        setJsonData((prev) => {
            prev.service = sport;
            return prev;
        })
        setSelectedSport(sport);
    };

    const handleDateChange = (date) => {
        console.log(date)
        setJsonData((prev) => {
            prev.date = date;
            return prev;
        })
    }



    return (
        <>
            <div className="min-h-screen bg-[#111315]">
                <TurfBookingCard />

                <SportSelection sports={sports} handleSportChange={handleSportChange} selectedSport={selectedSport} />

                <PitchEnclosure onPitchChange={(pitch) => console.log("Selected pitch:", pitch)} />

                <DateSelector onDateChange={handleDateChange} />

                <TimeSlotSelection onSlotChange={(timeSlot) => console.log("Selected time slot:", timeSlot)} />

                <CheckoutBar slotPrice={1400} fee={49} onDetailsClick={() => setShowBreakdown(true)} onProceed={() => {}}/>

                <div className="h-16"></div>
                
                <PriceBreakdownModal isOpen={showBreakdown} onClose={() => setShowBreakdown(false)} slotPrice={1400}/>
            </div></>
    );
}