/**
 * Admin-panel areas that can be granted to staff accounts.
 * Admins always have access to everything.
 *
 * Which of these a staff member gets:
 *  - plan.features.roleBasedAccess === true  → the permissions the admin assigned
 *  - otherwise                               → DEFAULT_STAFF_PERMISSIONS
 */
export const STAFF_AREAS = [
    "dashboard",
    "bookings",
    "calendar",
    "pricing",
    "services",
    "pitches",
    "coupons",
    "reports",
];

export const DEFAULT_STAFF_PERMISSIONS = ["dashboard", "bookings", "calendar"];

export function sanitizePermissions(input) {
    if (!Array.isArray(input)) return null;
    return [...new Set(input.filter((p) => STAFF_AREAS.includes(p)))];
}

/** Effective areas for a user given the current plan. */
export function effectivePermissions(user, plan) {
    if (!user) return [];
    if (user.role === "admin") return [...STAFF_AREAS];
    if (user.role !== "staff") return [];
    if (plan?.features?.roleBasedAccess === true && Array.isArray(user.permissions)) {
        return sanitizePermissions(user.permissions);
    }
    return [...DEFAULT_STAFF_PERMISSIONS];
}
