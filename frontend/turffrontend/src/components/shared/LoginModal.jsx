
import { useEffect, useState } from "react";

export default function LoginModal({
    isOpen,
    onClose,
    onSendOTP,
    loading = false,
}) {
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setPhone("");
            setError("");
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        const normalizedPhone = phone.replace(/\D/g, "");

        if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
            setError("Enter a valid 10-digit mobile number.");
            return;
        }

        try {
            await onSendOTP?.(normalizedPhone);
        } catch {
            setError("Unable to send OTP. Please try again.");
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center
                       bg-black/75 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose?.();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="login-title"
                className="relative w-full max-w-md overflow-hidden
                           rounded-[24px] border border-white/15
                           bg-[#111315] p-6 shadow-2xl sm:p-8"
            >
                {/* Subtle solid-color accent */}
                <div
                    aria-hidden="true"
                    className="absolute right-0 top-0 h-1 w-24 bg-primary"
                />

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close login"
                    className="absolute right-4 top-4 flex h-9 w-9
                               items-center justify-center rounded-lg
                               border border-white/10 text-xl text-white/50
                               transition hover:bg-white/5 hover:text-white"
                >
                    ×
                </button>

                <div className="relative">
                    <div className="mb-5 flex justify-center">
                        <div className="flex h-14 w-14 items-center
                                        justify-center rounded-2xl
                                        border border-primary/30
                                        bg-primary/10">
                            <span className="material-symbols-outlined
                                             text-3xl text-primary">
                                sports_soccer
                            </span>
                        </div>
                    </div>

                    <h2
                        id="login-title"
                        className="text-center text-2xl font-bold
                                   tracking-tight text-white sm:text-3xl"
                    >
                        Welcome Back
                    </h2>

                    <p className="mt-2 text-center text-sm
                                  text-[#a9b8ae]">
                        Sign in to continue your booking
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8">
                        <label
                            htmlFor="login-phone"
                            className="mb-2 block text-sm font-medium
                                       text-primary"
                        >
                            Phone Number
                        </label>

                        <div className="flex overflow-hidden rounded-xl
                                        border border-white/15
                                        bg-[#191c1d] transition
                                        focus-within:border-primary
                                        focus-within:ring-1
                                        focus-within:ring-primary/30"
                        >
                            <span className="flex items-center border-r
                                             border-white/10 px-3
                                             text-sm text-[#a9b8ae]">
                                +91
                            </span>

                            <input
                                id="login-phone"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                maxLength={10}
                                value={phone}
                                onChange={(event) => {
                                    setPhone(
                                        event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 10)
                                    );
                                    setError("");
                                }}
                                placeholder="Enter phone number"
                                className="min-w-0 flex-1 bg-transparent
                                           px-3 py-4 text-sm text-white
                                           outline-none placeholder:text-white/30"
                            />
                        </div>

                        {error && (
                            <p role="alert" className="mt-2 text-xs text-red-400">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-5 flex w-full items-center
                                       justify-center gap-2 rounded-xl
                                       bg-primary px-5 py-4
                                       font-semibold text-[#102019]
                                       transition hover:brightness-110
                                       active:scale-[0.99]
                                       disabled:cursor-not-allowed
                                       disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <span className="h-4 w-4 animate-spin
                                                     rounded-full border-2
                                                     border-[#102019]/30
                                                     border-t-[#102019]" />
                                    Sending OTP...
                                </>
                            ) : (
                                <>
                                    Continue with OTP
                                    <span className="material-symbols-outlined">
                                        arrow_forward
                                    </span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 rounded-xl border border-white/10
                                    bg-white/[0.025] p-3">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined
                                             text-lg text-primary">
                                verified_user
                            </span>
                            <p className="text-xs leading-5 text-[#a9b8ae]">
                                We'll send a one-time password to your mobile
                                number to verify your account securely.
                            </p>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs
                                  leading-5 text-white/35">
                        By continuing, you agree to our Terms of Service
                        and Privacy Policy.
                    </p>
                </div>
            </section>
        </div>
    );
}
