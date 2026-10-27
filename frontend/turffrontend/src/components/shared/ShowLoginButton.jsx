import { useState } from "react";
import LoginModal from "./LoginModal";

export default function ShowLoginButton({
    title = "Authentication",
    badge = "Sign In Required",
    heading,
    description = "Sign in with your mobile number to access this section, view your details, and manage reservations.",
    buttonText = "Log In / Sign Up",
    icon = "lock",
    variant = "card",
    className = "",
    onLoginSuccess,
    isOpen: controlledIsOpen,
    onClose: controlledOnClose,
}) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

    const handleOpen = () => {
        if (controlledIsOpen === undefined) {
            setInternalIsOpen(true);
        }
    };

    const handleClose = () => {
        if (controlledOnClose) {
            controlledOnClose();
        } else {
            setInternalIsOpen(false);
        }
    };

    const handleSuccess = (userData) => {
        handleClose();
        onLoginSuccess?.(userData);
    };

    // Compact button-only variant
    if (variant === "button") {
        return (
            <>
                <button
                    type="button"
                    onClick={handleOpen}
                    className={`flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider text-[#052e16] transition-all hover:bg-emerald-300 active:scale-[0.99] shadow-lg shadow-emerald-400/10 ${className}`}
                >
                    <span className="material-symbols-outlined text-[18px]">
                        {icon}
                    </span>
                    <span>{buttonText}</span>
                </button>

                <LoginModal
                    isOpen={isModalOpen}
                    onClose={handleClose}
                    onSuccess={handleSuccess}
                />
            </>
        );
    }

    // Default card variant matching the arena/turf theme
    return (
        <>
            <section className={`w-full ${className}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-widest text-[#bccac0]">
                        {title}
                    </span>

                    {badge && (
                        <span className="font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-wider text-[#68dba9]">
                            {badge}
                        </span>
                    )}
                </div>

                <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-surface-container p-6 shadow-sm">
                    {/* Header badge & icon */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-surface-container-low text-emerald-400">
                            <span className="material-symbols-outlined text-[24px]">
                                {icon}
                            </span>
                        </div>

                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 font-['Space_Grotesk'] text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                            Strikers Yard
                        </span>
                    </div>

                    {/* Headline & description */}
                    <h3 className="mt-4 font-['Space_Grotesk'] text-xl font-bold tracking-tight text-white sm:text-2xl">
                        {heading || "Sign in to continue"}
                    </h3>

                    <p className="mt-2 font-['Hanken_Grotesk'] text-sm leading-relaxed text-on-surface-variant">
                        {description}
                    </p>

                    {/* Feature bullet list */}
                    <div className="my-5 space-y-2.5 border-y border-white/[0.06] py-3.5">
                        <div className="flex items-center gap-2.5 text-xs text-[#bccac0]">
                            <span className="material-symbols-outlined text-[17px] text-emerald-400">
                                verified_user
                            </span>
                            <span>Quick 6-digit OTP verification via mobile</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-[#bccac0]">
                            <span className="material-symbols-outlined text-[17px] text-emerald-400">
                                sports_soccer
                            </span>
                            <span>Access turf reservations, match slots &amp; QR passes</span>
                        </div>
                    </div>

                    {/* Action button */}
                    <button
                        type="button"
                        onClick={handleOpen}
                        className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 font-['Space_Grotesk'] text-sm font-bold uppercase tracking-wider text-[#052e16] transition-all hover:bg-emerald-300 active:scale-[0.99] shadow-lg shadow-emerald-400/10"
                    >
                        <span>{buttonText}</span>
                        <span className="material-symbols-outlined text-[18px]">
                            arrow_forward
                        </span>
                    </button>
                </div>
            </section>

            <LoginModal
                isOpen={isModalOpen}
                onClose={handleClose}
                onSuccess={handleSuccess}
            />
        </>
    );
}

// Named alias export
export { ShowLoginButton as LoginPrompt };

