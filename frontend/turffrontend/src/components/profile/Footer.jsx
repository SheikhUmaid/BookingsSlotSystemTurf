
import { useState } from "react";

export default function ProfileFooter({ onLogout }) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    function handleLogout() {
        const confirmed = window.confirm(
            "End your current session on this device?"
        );

        if (!confirmed) return;

        if (onLogout) {
            onLogout();
            return;
        }

        setIsLoggingOut(true);

        // Placeholder behavior; connect your authentication logout API.
        setTimeout(() => {
            setIsLoggingOut(false);
            window.alert("Connect your logout handler to sign out.");
        }, 800);
    }

    return (
        <footer className="mt-8 flex w-full flex-col items-center px-5">
            {onLogout && (
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container py-3 font-['Space_Grotesk'] text-sm font-medium text-[#ffb4ab] transition-colors hover:bg-[#93000a] hover:text-[#ffdad6] disabled:opacity-60"
                >
                    <span
                        className={`material-symbols-outlined text-[18px] ${isLoggingOut ? "animate-spin" : ""
                            }`}
                    >
                        {isLoggingOut ? "refresh" : "logout"}
                    </span>

                    {isLoggingOut ? "Signing Out..." : "Log Out Session"}
                </button>
            )}

            <div className="mt-5 flex flex-col items-center gap-1 text-center">
                <div className="flex flex-wrap items-center justify-center gap-2 font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-widest text-[#bccac0]">
                    <span>Zinth Labs Pvt Ltd</span>
                    <span className="h-1 w-1 rounded-full bg-[#87948b]" />
                    <span>Arena Operating System</span>
                </div>

                <span className="font-['Space_Grotesk'] text-[11px] text-[#87948b]">
                    Build v2.4.1 (Clean Sheet Release)
                </span>
            </div>
        </footer>
    );
}
