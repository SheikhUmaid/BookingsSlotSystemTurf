
import { useMemo } from "react";

export default function CheckoutBar({
    slotPrice = 1400,
    fee = 49,
    date = "",
    pitch = "",
    onDetailsClick,
    onProceed,
    isProcessing = false,
}) {
    const total = useMemo(() => slotPrice + fee, [slotPrice, fee]);

    const formatPrice = (price) =>
        `₹${price.toLocaleString("en-IN")}`;

    return (
        // <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#121416] border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
        <div className="fixed bottom-[62px] left-0 right-0 z-40 bg-[#121416] border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
            <div className="border-b border-white/10 px-4 py-2.5 max-w-xl mx-auto w-full">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-headline-lg text-2xl font-black tracking-tight text-white leading-none">
                                {formatPrice(total)}
                            </span>

                            <button
                                type="button"
                                onClick={onDetailsClick}
                                className="text-[11px] text-on-surface-variant hover:text-white underline underline-offset-2 flex items-center gap-0.5"
                            >
                                <span>Details</span>
                                <span className="material-symbols-outlined text-[12px]">
                                    info
                                </span>
                            </button>
                        </div>

                        <p className="text-[11px] text-primary font-medium truncate mt-1">
                            {date} • {pitch}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onProceed}
                        disabled={isProcessing}
                        className="shrink-0 px-5 py-2.5 rounded-xl bg-primary hover:bg-[#3ec470] active:scale-95 text-on-primary font-headline-sm text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-80"
                    >
                        <span>
                            {isProcessing ? "Securing Slot..." : "Proceed to Payment"}
                        </span>

                        <span className="material-symbols-outlined text-[16px]">
                            arrow_forward
                        </span>
                    </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 pt-1.5 mt-1.5 border-t border-white/5">
                    <span className="material-symbols-outlined text-[13px] text-primary">
                        verified_user
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                        Free cancellation up to 4 hrs before kick-off
                    </span>
                </div>
            </div>
        </div>
    );
}
