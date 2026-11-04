import { getLicence, limitFromPlan } from "../services/licence.service.js";

// Display names only — which features a plan includes always comes from the registry.
const FEATURE_LABELS = {
    bookingPWA: "Online booking",
    onlinePayments: "Online payments",
    manualBookings: "Manual bookings",
    calendarManagement: "Calendar management",
    basicAnalytics: "Analytics",
    coupons: "Coupons",
    advancedAnalytics: "Advanced analytics",
    leaderboards: "Leaderboards",
    pitchWiseReports: "Pitch-wise reports",
    staffManagement: "Staff accounts",
    roleBasedAccess: "Roles & permissions",
    financialExports: "Financial exports",
};

const LIMIT_NOUNS = {
    maxPitches: ["pitch", "pitches"],
    maxStaff: ["staff account", "staff accounts"],
    maxAdmins: ["admin", "admins"],
};

export const featureLabel = (key) => FEATURE_LABELS[key] || key;

export function featureDeniedBody(key, plan) {
    const planName = plan?.name ? `Your ${plan.name} plan` : "Your plan";
    return {
        success: false,
        code: "FEATURE_NOT_IN_PLAN",
        feature: key,
        plan: plan?.code ?? null,
        message: `${planName} doesn't include ${featureLabel(key)}. Upgrade your plan to unlock it.`,
    };
}

/**
 * Reject the request with 403 unless the current plan enables `key`.
 * Usage: router.use(requireFeature("coupons"))
 */
export const requireFeature = (key) => async (req, res, next) => {
    try {
        const { plan } = await getLicence();
        if (plan?.features?.[key] === true) return next();
        return res.status(403).json(featureDeniedBody(key, plan));
    } catch (err) {
        console.error(`requireFeature(${key}) error:`, err);
        return res.status(500).json({ message: "Unable to verify your plan. Please try again." });
    }
};

/**
 * Throws-free capacity check for "create" endpoints.
 * Returns null when there is room, otherwise the JSON body for a 403.
 * Existing records over the limit (e.g. after a downgrade) are never touched —
 * we only refuse to add more.
 */
export async function checkLimit(key, currentCount) {
    const { plan } = await getLicence();
    const limit = limitFromPlan(plan, key);
    if (currentCount < limit) return null;
    const [one, many] = LIMIT_NOUNS[key] || ["item", "items"];
    return {
        success: false,
        code: "PLAN_LIMIT_REACHED",
        limit: key,
        max: limit,
        current: currentCount,
        message: `Your plan allows up to ${limit} ${limit === 1 ? one : many}. Upgrade to add more.`,
    };
}

/**
 * Middleware form of checkLimit. `countFn(req)` returns the current count.
 * Usage: router.post("/", requireLimit("maxPitches", () => Pitch.countDocuments()), createPitch)
 */
export const requireLimit = (key, countFn) => async (req, res, next) => {
    try {
        const denied = await checkLimit(key, await countFn(req));
        if (denied) return res.status(403).json(denied);
        next();
    } catch (err) {
        console.error(`requireLimit(${key}) error:`, err);
        return res.status(500).json({ message: "Unable to verify your plan limits. Please try again." });
    }
};

/** Blocks creating new bookings / payments when the registry has bookingEnabled=false. */
export const requireBookingEnabled = async (req, res, next) => {
    try {
        const licence = await getLicence();
        if (licence.bookingEnabled) return next();
        return res.status(403).json({
            success: false,
            code: "BOOKINGS_DISABLED",
            message: "Bookings are currently disabled for this venue.",
        });
    } catch (err) {
        console.error("requireBookingEnabled error:", err);
        return res.status(500).json({ message: "Unable to verify booking availability." });
    }
};
