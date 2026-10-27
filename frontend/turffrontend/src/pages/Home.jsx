import HomeHeader from "../components/home/HomeHeader";
import MemberGreeting from "../components/home/MemberGreeting";
import ActiveSessionBanner from "../components/home/ActiveSessionBanner";
import HeroBooking from "../components/home/HeroBooking";
import CuratedArenas from "../components/home/CuratedArenas";
import LivePitchRadar from "../components/home/LivePitchRadar";
import MatchFinder from "../components/home/MatchFinder";
import LastPlayedBar from "../components/home/LastPlayedBar";

// Placeholder session — connect to your API when available
const DEMO_SESSION = {
    time: "07:00 PM",
    pitch: "Pitch A",
    notice: "Warmup Bay opens in 42 minutes",
};

const DEMO_LAST = {
    when: "Friday",
    description: "Pitch A • 60 min Box Cricket",
};

function HomePage() {
    return (
        <div className="w-full min-h-screen bg-[#0b0d0e]">
            <HomeHeader />
            <MemberGreeting name="Alex" />
            <ActiveSessionBanner session={DEMO_SESSION} />
            <HeroBooking />
            <CuratedArenas />
            <LivePitchRadar />
            <MatchFinder />
            <LastPlayedBar lastSession={DEMO_LAST} />
        </div>
    );
}

export default HomePage;

// export default HomePage;