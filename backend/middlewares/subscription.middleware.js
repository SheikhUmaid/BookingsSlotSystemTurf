import Setting from "../models/setting.model.js";

/**
 * Middleware that blocks write operations (POST, PUT, PATCH, DELETE)
 * when the account/deployment status is not "active" (e.g. "inactive" or "suspended").
 *
 * Exemptions:
 * - GET and HEAD requests are read-only and always allowed.
 * - /api/admin/subscription/* routes are allowed so the admin can check status and make renewal payments.
 */
const subscriptionGuard = async (req, res, next) => {
    // Read-only methods are always allowed
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }

    // Allow subscription renewal / status routes so the admin can pay and unlock
    if (req.originalUrl && req.originalUrl.includes("/api/admin/subscription")) {
        return next();
    }

    try {
        let setting = await Setting.findOne().select("deploymentStatus subscriptionExpiresAt bookingEnabled");
        if (!setting) {
            return next();
        }

        const status = setting.deploymentStatus || "active";
        const isExpired = setting.subscriptionExpiresAt && new Date(setting.subscriptionExpiresAt).getTime() <= Date.now();

        if (status !== "active" || isExpired) {
            return res.status(403).json({
                success: false,
                code: "SUBSCRIPTION_INACTIVE",
                message: "Your account/subscription is inactive. Write operations are disabled until the subscription is renewed.",
                status: status === "active" && isExpired ? "expired" : status,
            });
        }

        next();
    } catch (err) {
        console.error("subscriptionGuard error:", err);
        next();
    }
};

export default subscriptionGuard;

