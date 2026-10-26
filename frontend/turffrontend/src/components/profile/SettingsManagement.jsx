
const settingsItems = [
    {
        id: "payment-methods",
        icon: "account_balance_wallet",
        title: "Saved Payment Methods",
        description: "GooglePay UPI, HDFC Visa ending 4120",
        href: "#payment-methods",
    },
    {
        id: "notifications",
        icon: "notifications_active",
        title: "Match Notifications",
        description: "Floodlight 30m reminders, flash slots",
        href: "#notifications",
    },
    {
        id: "squads",
        icon: "groups",
        title: "Team & Squad",
        description: "Downtown Strikers FC • 6 active",
        href: "#squads",
        badge: "Captain",
    },
    {
        id: "invoices",
        icon: "receipt_long",
        title: "Booking Invoices & Tax Bills",
        description: "GST compliant automated receipts",
        href: "#invoices",
    },
    {
        id: "rules-support",
        icon: "format_image_left",
        title: "Help & Arena Regulations",
        description: "Cleat policy, cancellation schedule",
        href: "#rules-support",
    },
];

export default function SettingsManagement({ onSelect }) {
    return (
        <section className="mt-5 w-full px-5">
            <span className="mb-3 block font-['Space_Grotesk'] text-[11px] font-semibold uppercase tracking-widest text-[#bccac0]">
                Settings &amp; Management
            </span>

            <div className="overflow-hidden rounded-lg bg-surface-container shadow-sm">
                {settingsItems.map((item, index) => (
                    <a
                        key={item.id}
                        href={item.href}
                        onClick={(event) => {
                            if (onSelect) {
                                event.preventDefault();
                                onSelect(item.id);
                            }
                        }}
                        className={`flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-surface-container-high ${index !== settingsItems.length - 1
                                ? "border-b border-surface-container-high/60"
                                : ""
                            }`}
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface">
                                <span className="material-symbols-outlined text-[18px]">
                                    {item.icon}
                                </span>
                            </span>

                            <div className="flex min-w-0 flex-col">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-['Hanken_Grotesk'] text-[15px] text-on-surface">
                                        {item.title}
                                    </span>

                                    {item.badge && (
                                        <span className="rounded bg-[#68dba9]/20 px-1.5 py-0.5 font-['Space_Grotesk'] text-[10px] uppercase text-[#68dba9]">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>

                                <span className="mt-0.5 wrap-break-word font-['Hanken_Grotesk'] text-[13px] leading-5 text-[#bccac0]">
                                    {item.description}
                                </span>
                            </div>
                        </div>

                        <span className="material-symbols-outlined shrink-0 text-[20px] text-[#87948b]">
                            chevron_right
                        </span>
                    </a>
                ))}
            </div>
        </section>
    );
}
