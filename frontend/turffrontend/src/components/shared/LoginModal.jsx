import { useEffect, useRef, useState } from "react";
import { sendOtp, verifyOTP } from "../../services/api.service";
export default function LoginModal({
    isOpen,
    onClose,
}) {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState("phone");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [countdown, setCountdown] = useState(0);
    
    const phoneRef = useRef(null);
    const otpRef = useRef(null);
    const [verifyOtpToken, setVerifyOtpToken] = useState("")
    
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            (step === "phone" ? phoneRef : otpRef).current?.focus();
        }, 100);

        return () => clearTimeout(timer);
    }, [isOpen, step]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !loading) onClose?.();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, loading, onClose]);

    useEffect(() => {
        if (countdown <= 0) return;

        const timer = setTimeout(
            () => setCountdown((value) => value - 1),
            1000
        );

        return () => clearTimeout(timer);
    }, [countdown]);

    if (!isOpen) return null;

    const cleanPhone = phone.replace(/\D/g, "");

    async function handleSendOtp(event) {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            setError("Enter a valid 10-digit Indian mobile number.");
            return;
        }

        setLoading(true);

        try {
            // if (!onSendOtp) {
            //     throw new Error("OTP service is not connected yet.");
            // }

            // await onSendOtp(`+91${cleanPhone}`);

            let res = await sendOtp(cleanPhone);
            if (res.status != 200){
                setError("Something went wrong!");
                return;
            }
            setVerifyOtpToken(res.data.token)

            

            setStep("otp");
            setOtp("");
            setCountdown(30);
            setMessage("Verification code sent successfully.");
        } catch (err) {
            setError(err.message || "Unable to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp(event) {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!/^\d{6}$/.test(otp)) {
            setError("Enter the complete 6-digit verification code.");
            return;
        }

        setLoading(true);

        try {
          

            // await onVerifyOtp(`+91${cleanPhone}`, otp);
            console.log(verifyOtpToken)
            let res = await verifyOTP(verifyOtpToken, otp)
            localStorage.setItem("access_token", res.data.accessToken)
            localStorage.setItem("is_logged_in", true)
            onClose?.();
        } catch (err) {
            setError(JSON.parse(err.request.response).message || "Incorrect OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function handleChangeNumber() {
        setStep("phone");
        setOtp("");
        setError("");
        setMessage("");
        setCountdown(0);
    }

    function handlePhoneChange(event) {
        setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
        setError("");
    }

    function handleOtpChange(event) {
        setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
        setError("");
    }

    return (
        <div
            className="fixed inset-0 z-100 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) {
                    onClose?.();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="phone-login-title"
                className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-white/9 bg-surface text-on-surface shadow-2xl sm:rounded-3xl"
            >
                {/* Modal header */}
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-7">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-400">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                className="h-5 w-5"
                                aria-hidden="true"
                            >
                                <path d="M7 2.75h10a2 2 0 0 1 2 2v14.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4.75a2 2 0 0 1 2-2Z" />
                                <path d="M10 18h4" />
                            </svg>
                        </div>

                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                                Strikers Yard
                            </p>
                            <p className="mt-0.5 text-xs text-on-surface-variant">
                                Secure sign in
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close login"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 text-on-surface-variant transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-40"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                            aria-hidden="true"
                        >
                            <path d="m18 6-12 12M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-5 pb-6 pt-7 sm:px-7 sm:pb-7 sm:pt-8">
                    {/* Intro */}
                    <div className="mb-7">
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-surface-container-low text-emerald-400">
                            {step === "phone" ? (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className="h-7 w-7"
                                    aria-hidden="true"
                                >
                                    <rect x="6.5" y="2.5" width="11" height="19" rx="2.2" />
                                    <path d="M10 18.2h4" />
                                </svg>
                            ) : (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className="h-7 w-7"
                                    aria-hidden="true"
                                >
                                    <rect x="3" y="5" width="18" height="14" rx="3" />
                                    <path d="m7 9 5 4 5-4" />
                                    <path d="M8 2.5h8" />
                                </svg>
                            )}
                        </div>

                        <h2
                            id="phone-login-title"
                            className="text-[27px] font-bold leading-tight tracking-[-0.045em] text-white sm:text-3xl"
                        >
                            {step === "phone" ? "Welcome back." : "Check your phone."}
                        </h2>

                        <p className="mt-2 max-w-sm text-sm leading-6 text-[#a6b3ab]">
                            {step === "phone"
                                ? "Enter your mobile number to continue to your bookings."
                                : "We've sent a one-time verification code to your mobile number."}
                        </p>
                    </div>

                    {/* Step indicator */}
                    <div className="mb-6 flex items-center gap-2">
                        <div
                            className={`h-1 flex-1 rounded-full ${step === "phone" ? "bg-emerald-400" : "bg-emerald-400"
                                }`}
                        />
                        <div
                            className={`h-1 flex-1 rounded-full transition-colors ${step === "otp" ? "bg-emerald-400" : "bg-[#282a2c]"
                                }`}
                        />
                        <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-[#a6b3ab]">
                            {step === "phone" ? "Step 1 of 2" : "Step 2 of 2"}
                        </span>
                    </div>

                    {step === "phone" ? (
                        <form onSubmit={handleSendOtp}>
                            <label
                                htmlFor="login-phone"
                                className="mb-2 block text-xs font-semibold text-[#cbd5ce]"
                            >
                                Mobile number
                            </label>

                            <div className="flex h-[58px] items-center overflow-hidden rounded-xl border border-white/[0.12] bg-[#1a1c1e] transition focus-within:border-emerald-400/70 focus-within:ring-2 focus-within:ring-emerald-400/10">
                                <span className="flex h-full items-center gap-2 border-r border-white/[0.09] px-3.5 text-sm font-semibold text-white sm:px-4">
                                    <span className="text-base">🇮🇳</span>
                                    +91
                                </span>

                                <input
                                    ref={phoneRef}
                                    id="login-phone"
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel-national"
                                    placeholder="10-digit mobile number"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    maxLength={10}
                                    aria-describedby={error ? "login-error" : "phone-hint"}
                                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-base tracking-wide text-white outline-none placeholder:text-[#65736c] focus:ring-0 sm:px-4"
                                />
                            </div>

                            <p
                                id="phone-hint"
                                className="mt-3 flex items-center gap-2 text-xs leading-5 text-[#899991]"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    className="h-4 w-4 shrink-0 text-emerald-400"
                                    aria-hidden="true"
                                >
                                    <rect x="5" y="10" width="14" height="11" rx="2" />
                                    <path d="M8 10V7a4 4 0 1 1 8 0v3" />
                                </svg>
                                We'll send you a one-time verification code.
                            </p>

                            {error && (
                                <p
                                    id="login-error"
                                    role="alert"
                                    className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.07] px-3 py-2.5 text-xs text-red-300"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-7 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-[#052e16] transition hover:bg-emerald-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#052e16]/30 border-t-[#052e16]" />
                                        Sending code...
                                    </>
                                ) : (
                                    <>
                                        Continue with phone
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        >
                                            <path d="M5 12h14m-6-6 6 6-6 6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp}>
                            <div className="mb-5 flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#1a1c1e] px-3.5 py-3">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#899991]">
                                        Verification sent to
                                    </p>
                                    <p className="mt-1 text-sm font-semibold tracking-wide text-white">
                                        +91 {cleanPhone}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleChangeNumber}
                                    className="rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-400/[0.08]"
                                >
                                    Edit
                                </button>
                            </div>

                            <label
                                htmlFor="login-otp"
                                className="mb-2 block text-xs font-semibold text-[#cbd5ce]"
                            >
                                6-digit verification code
                            </label>

                            <input
                                ref={otpRef}
                                id="login-otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                placeholder="— — — — — —"
                                value={otp}
                                onChange={handleOtpChange}
                                aria-describedby={error ? "login-error" : undefined}
                                className="h-[62px] w-full rounded-xl border border-white/[0.12] bg-[#1a1c1e] px-3 text-center font-mono text-2xl tracking-[0.45em] text-white outline-none transition placeholder:text-[#65736c] placeholder:tracking-[0.18em] focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/10"
                            />

                            {error && (
                                <p
                                    id="login-error"
                                    role="alert"
                                    className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.07] px-3 py-2.5 text-xs text-red-300"
                                >
                                    {error}
                                </p>
                            )}

                            {message && !error && (
                                <p
                                    role="status"
                                    className="mt-3 text-xs text-emerald-400"
                                >
                                    {message}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-[#052e16] transition hover:bg-emerald-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#052e16]/30 border-t-[#052e16]" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify & sign in"
                                )}
                            </button>

                            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-xs text-[#899991]">
                                <span>Didn't receive the code?</span>
                                {countdown > 0 ? (
                                    <span className="font-medium text-[#a6b3ab]">
                                        Resend in {countdown}s
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={handleSendOtp}
                                        className="font-semibold text-emerald-400 transition hover:text-emerald-300 disabled:opacity-50"
                                    >
                                        Resend code
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleChangeNumber}
                                className="mt-4 w-full rounded-lg py-2 text-xs font-medium text-[#a6b3ab] transition hover:text-white disabled:opacity-50"
                            >
                                Use a different number
                            </button>
                        </form>
                    )}

                    {/* Trust footer */}
                    <div className="mt-7 border-t border-white/[0.07] pt-5">
                        <div className="flex items-start justify-center gap-2.5 text-center">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                                aria-hidden="true"
                            >
                                <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                                <path d="m9 12 2 2 4-4" />
                            </svg>
                            <p className="text-[11px] leading-5 text-[#899991]">
                                Secure phone verification. Your number stays protected.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
