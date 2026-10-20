
import { NavLink } from "react-router-dom";
import { House, CircleDot, Tickets, UserRound } from "lucide-react";

const navItems = [
    { label: "Home", path: "/", icon: House },
    { label: "Book Turf", path: "/book", icon: CircleDot },
    { label: "Bookings", path: "/bookings", icon: Tickets },
    { label: "Profile", path: "/profile", icon: UserRound },
];

export default function BottomNavbar() {
    return (
        <nav
            aria-label="Bottom navigation"
            className="fixed bottom-0 left-1/2 z-50 w-[calc(100%)]  -translate-x-1/2  border border-white/10 bg-[#111315]  py-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
        >
            <div className="flex items-center justify-between">
                {navItems.map(({ label, path, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={path === "/"}
                        className={({ isActive }) =>
                            `flex min-w-[65px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 transition-colors ${isActive
                                ? "text-[#39e58c]"
                                : "text-[#a1a1aa] hover:text-white"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    size={19}
                                    strokeWidth={isActive ? 2.3 : 1.8}
                                />

                                <span
                                    className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"
                                        }`}
                                >
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
