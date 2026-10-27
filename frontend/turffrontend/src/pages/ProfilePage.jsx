import ProfileFooter from "../components/profile/Footer";
import BasicInfoCard from "../components/profile/InfoCard";
import SettingsManagement from "../components/profile/SettingsManagement";
import ShowLoginButton from "../components/shared/ShowLoginButton";
import { logout, useAuth } from "../services/auth.service";

function ProfilePage() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="w-full">
            {!isAuthenticated ? (
                <div className="px-5 pt-5">
                    <ShowLoginButton
                        title="Basic Information"
                        badge="Sign In Required"
                        heading="Sign in to view your profile"
                        description="Sign in with your mobile number to view your verified player profile, manage team settings, and access booking receipts."
                        buttonText="Log In / Sign Up"
                        icon="person"
                    />
                </div>
            ) : (
                <BasicInfoCard />
            )}

            <SettingsManagement />
            <ProfileFooter onLogout={isAuthenticated ? logout : undefined} />
        </div>
    );
}

export default ProfilePage;

// export default ProfilePage;