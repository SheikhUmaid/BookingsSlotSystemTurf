
export default function TicketQRModal({ onClose, booking }) {
    if (!booking) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 px-4 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="ticket-modal-title"
                className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-surface-container-high p-5 text-center shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Header */}
                <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Gate Check-in Pass
                    </span>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close ticket"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface"
                    >
                        <span className="material-symbols-outlined text-lg">
                            close
                        </span>
                    </button>
                </div>

                {/* QR Code placeholder */}
                <div className="flex items-center justify-center rounded-xl bg-white p-3 shadow-inner">
                    <svg
                        viewBox="0 0 100 100"
                        className="h-48 w-48 text-surface-dim"
                        fill="currentColor"
                        role="img"
                        aria-label="QR code placeholder"
                    >
                        <path d="M5 5h30v30H5V5zm4 4v22h22V9H9zm4 4h14v14H13V13zm52-8h30v30H65V5zm4 4v22h22V9H69zm4 4h14v14H73V13zM5 65h30v30H5V65zm4 4v22h22V69H9zm4 4h14v14H13V73zm52-8h8v8h-8v-8zm14 0h14v8H79v-8zm-14 14h8v8h-8v-8zm14 0h8v8h-8v-8zm8 8h6v6h-6v-6zm-22 6h8v8h-8v-8zm14 0h14v8H79v-8zM42 5h8v8h-8V5zm8 8h8v8h-8v-8zm-8 8h8v8h-8v-8zm16 8h8v8h-8v-8zm-16 16h8v8h-8v-8zm8 8h8v8h-8v-8zm8-8h8v8h-8v-8zm-16 16h8v8h-8v-8zm8 8h8v8h-8v-8zm-16 8h8v8h-8v-8z" />
                    </svg>
                </div>

                {/* Booking details */}
                <div className="flex w-full flex-col gap-1">
                    <h2
                        id="ticket-modal-title"
                        className="text-xl font-medium text-on-surface"
                    >
                        {booking.reference}
                    </h2>

                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {booking.pitch}
                    </span>

                    <span className="text-sm text-on-surface-variant">
                        {booking.date}
                    </span>

                    <span className="text-sm text-on-surface">
                        {booking.time}
                    </span>

                    <p className="pt-2 text-xs leading-relaxed text-on-surface-variant">
                        Present this code at the clubhouse entrance for check-in.
                    </p>
                </div>

                {/* Done */}
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-wide text-on-primary transition-colors hover:bg-primary-container"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
