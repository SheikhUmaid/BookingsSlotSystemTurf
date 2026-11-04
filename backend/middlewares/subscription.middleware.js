import { getLicence, blockedReason } from "../services/licence.service.js";

/**
 * Middleware that blocks write operations (POST, PUT, PATCH, DELETE)
 * when the licence is not usable:
 *   - deployment status is not "active" (inactive / suspended), or
 *   - the subscription has expired, or
 *   - the registry reports no plan (plan === null).
 *
 * Exemptions:
 * - GET / HEAD / OPTIONS are read-only and always allowed.
 * - /api/admin/subscription/* so the admin can check status and renew.
 * - /api/auth/* so users can still sign in (login is not a data write).
 * - /api/payments/razorpay-webhook so payments already taken are still recorded.
 */
const EXEMPT_PREFIXES = ["/api/admin/subscription", "/api/auth/", "/api/payments/razorpay-webhook"];

const subscriptionGuard = async (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

    const url = req.originalUrl || "";
    if (EXEMPT_PREFIXES.some((p) => url.startsWith(p))) return next();

    try {
        const licence = await getLicence();
        const blocked = blockedReason(licence);
        if (!blocked) return next();

        return res.status(403).json({
            success: false,
            code: blocked.code,
            status: blocked.reason,
            message:
                blocked.code === "NO_PLAN"
                    ? "No active plan was found for this deployment. Write operations are disabled until a plan is assigned."
                    : "Your account/subscription is inactive. Write operations are disabled until the subscription is renewed.",
        });
    } catch (err) {
        console.error("subscriptionGuard error:", err);
        next();
    }
};

export default subscriptionGuard;
