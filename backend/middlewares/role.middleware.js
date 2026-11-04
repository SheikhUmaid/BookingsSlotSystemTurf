import { getLicence } from "../services/licence.service.js";
import { effectivePermissions } from "../utils/permissions.js";
import { featureDeniedBody } from "./licence.middleware.js";

/**
 * Admin-panel access guard that also admits staff accounts.
 * Must run AFTER authMiddleware.
 *
 *   allowStaff("coupons")                    → staff need the "coupons" permission
 *   allowStaff((req) => ["calendar", ...])   → area(s) decided per request; any match admits
 *   allowStaff("pitches", { readAll: true }) → any staff may GET (reference data)
 *
 * Staff are only admitted while the plan enables staffManagement. Their
 * accounts are never deleted on downgrade — they simply can't sign in / act.
 */
export const allowStaff = (area, { readAll = false } = {}) => async (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Authentication required." });
    if (user.role === "admin") return next();
    if (user.role !== "staff") {
        return res.status(403).json({ message: "Forbidden: admin access required." });
    }

    try {
        const { plan } = await getLicence();
        if (plan?.features?.staffManagement !== true) {
            return res.status(403).json(featureDeniedBody("staffManagement", plan));
        }

        if (readAll && req.method === "GET") return next();

        const needed = [].concat(typeof area === "function" ? area(req) : area);
        const granted = effectivePermissions(user, plan);
        if (needed.some((a) => granted.includes(a))) return next();

        return res.status(403).json({
            success: false,
            code: "PERMISSION_DENIED",
            message: "You don't have permission to access this section. Ask an admin for access.",
        });
    } catch (err) {
        console.error("allowStaff error:", err);
        return res.status(500).json({ message: "Unable to verify permissions." });
    }
};
