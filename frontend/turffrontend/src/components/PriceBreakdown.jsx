import { useEffect } from 'react';

export default function PriceBreakdownModal({
    isOpen,
    onClose,
    slotPrice = 1400,
    floodlightFee = 30,
    convenienceFee = 19,
}) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.();
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const total = slotPrice + floodlightFee + convenienceFee;

    const formatPrice = (amount) =>
        `₹${amount.toLocaleString('en-IN')}`;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-200"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="w-full max-w-sm bg-surface-container-high border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="price-modal-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3
                        id="price-modal-title"
                        className="font-headline-sm text-sm font-bold text-white"
                    >
                        Rate Breakdown
                    </h3>

                    <button
                        type="button"
                        aria-label="Close price breakdown"
                        onClick={onClose}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            close
                        </span>
                    </button>
                </div>

                <div className="py-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-on-surface-variant">
                        <span>Base Slot Rate (60 mins)</span>
                        <span className="font-headline-sm font-semibold text-white">
                            {formatPrice(slotPrice)}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-on-surface-variant">
                        <span>Floodlights (Evening Session)</span>
                        <span className="font-headline-sm font-semibold text-white">
                            {formatPrice(floodlightFee)}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-on-surface-variant">
                        <span>Convenience Fee & GST (18%)</span>
                        <span className="font-headline-sm font-semibold text-white">
                            {formatPrice(convenienceFee)}
                        </span>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                        <span className="font-bold text-white text-sm">
                            Total Payable
                        </span>
                        <span className="font-headline-sm font-bold text-base text-primary">
                            {formatPrice(total)}
                        </span>
                    </div>
                </div>

                <div className="bg-surface-container-lowest p-3 rounded-lg text-[11px] text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-primary">
                        lock_clock
                    </span>
                    <span>Slot held for 10 minutes once you proceed.</span>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="w-full mt-4 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-xs font-bold transition-all"
                >
                    Close Breakdown
                </button>
            </div>
        </div>
    );
}