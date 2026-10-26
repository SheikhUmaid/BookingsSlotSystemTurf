import ProfileFooter from "../components/profile/Footer";
import BasicInfoCard from "../components/profile/InfoCard";
import SettingsManagement from "../components/profile/SettingsManagement";

function ProfilePage({}) {
    return ( <>
        <BasicInfoCard/>
        <SettingsManagement/>
        <ProfileFooter/>
    </> );
}

export default ProfilePage;