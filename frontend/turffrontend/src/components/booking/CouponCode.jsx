
import { useState } from "react";

export default function CouponCode({
    onApply,
    onRemove,
    appliedCoupon = null,
    loading = false,
}) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");

    async function handleApply(e) {
        e.preventDefault();

        const couponCode = code.trim().toUpperCase();

        if (!couponCode) {
            setError("Enter a coupon code to continue.");
            return;
        }

        setError("");

        try {
            await onApply?.(couponCode);
        } catch (err) {
            setError(
                err.request.response?.data?.detail ||
                err.request.response?.data?.message ||
                "Invalid Coupon!"
            );
        }
    }

    async function handleRemove() {
        setError("");
        setCode("");
        await onRemove?.();
    }

    return (
        <div className="p-4">
            <section className="rounded-2xl border border-white/8 bg-surface-container-low p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-primary/[0.07] text-emerald-400">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="h-5 w-5"
                            aria-hidden="true"
                        >
                            <path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6Z" />
                            <path d="M13 5v2m0 3v2m0 3v2" />
                        </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white">
                            Have a coupon?
                        </h3>
                        <p className="mt-1 text-xs text-on-surface-variant">
                            Apply a code to save on your booking.
                        </p>
                    </div>
                </div>

                {appliedCoupon ? (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-400/25 bg-primary/6 p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-emerald-400">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-5 w-5"
                                aria-hidden="true"
                            >
                                <path d="m5 12 4 4L19 6" />
                            </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold tracking-wide text-emerald-400">
                                {appliedCoupon.code}
                            </p>
                            <p className="mt-1 text-xs text-on-surface-variant">
                                Coupon applied successfully
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={loading}
                            className="rounded-lg px-2 py-2 text-xs font-semibold text-on-surface-variant hover:bg-white/5 hover:text-white disabled:opacity-50"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleApply}>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value.toUpperCase());
                                    setError("");
                                }}
                                placeholder="Enter coupon code"
                                aria-label="Coupon code"
                                aria-invalid={Boolean(error)}
                                className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-surface px-3 text-sm font-semibold tracking-wider text-white outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-[#65736c] focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10 sm:px-4"
                            />

                            <button
                                type="submit"
                                disabled={loading || !code.trim()}
                                className="h-12 shrink-0 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary transition hover:bg-emerald-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {loading ? "Applying..." : "Apply"}
                            </button>
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="mt-2 text-xs leading-5 text-red-400"
                            >
                                {error}
                            </p>
                        )}
                    </form>
                )}
            </section>
        </div>
    );
}
