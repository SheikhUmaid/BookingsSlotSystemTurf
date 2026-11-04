import Pitch from "../../models/pitch.model.js";
import User from "../../models/user.model.js";
import { refreshLicence, limitFromPlan, callRegistry } from "../../services/licence.service.js";
import { effectivePermissions } from "../../utils/permissions.js";

const usageEntry = (plan, key, used) => {
    const max = limitFromPlan(plan, key);
    return { used, max: Number.isFinite(max) ? max : null, atLimit: used >= max, overLimit: used > max };
};

/**
 * GET /api/admin/subscription/status
 * Refreshes the licence from the central registry (falls back to the cached
 * licence if the registry is unreachable) and returns status, plan, usage
 * against plan limits and the caller's effective permissions.
 */
export const getSubscriptionStatus = async (req, res) => {
    try {
        const licence = await refreshLicence();
        const { plan } = licence;

        const [pitchCount, staffCount, adminCount] = await Promise.all([
            Pitch.countDocuments(),
            User.countDocuments({ role: "staff" }),
            User.countDocuments({ role: "admin" }),
        ]);

        const expiresAt = licence.expiresAt ?? new Date();
        const diffMs = expiresAt.getTime() - Date.now();

        return res.status(200).json({
            success: true,
            deploymentId: licence.deploymentId,
            status: licence.status,
            deploymentStatus: licence.status,
            bookingEnabled: licence.bookingEnabled,
            expiresAt: expiresAt.toISOString(),
            daysLeft: Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))),
            hoursLeft: Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60))),
            isExpired: diffMs <= 0,
            registryReachable: licence.registryReachable,
            syncedAt: licence.syncedAt,
            plan,
            usage: {
                maxPitches: usageEntry(plan, "maxPitches", pitchCount),
                maxStaff: usageEntry(plan, "maxStaff", staffCount),
                maxAdmins: usageEntry(plan, "maxAdmins", adminCount),
            },
            me: {
                id: req.user._id,
                role: req.user.role,
                permissions: effectivePermissions(req.user, plan),
            },
        });
    } catch (error) {
        console.error("Admin getSubscriptionStatus error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve subscription status",
            error: error.message,
        });
    }
};

/**
 * POST /api/admin/subscription/renew
 * Initiates or records a renewal payment
 */
export const renewSubscription = async (req, res) => {
    try {
        const { planId = "plan_monthly", amount = 2999 } = req.body;

        return res.status(200).json({
            success: true,
            message: "Subscription renewal intent created",
            planId,
            amount,
            currency: "INR",
            upiId: "zinthlabs@icici",
            merchantName: "Zinth Labs Turf OS",
        });
    } catch (error) {
        console.error("Admin renewSubscription error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to initiate renewal",
            error: error.message,
        });
    }
};


/**
 * GET /api/admin/subscription/plans
 * Plan options, Zinth Labs' UPI details and this venue's latest plan request,
 * straight from the registry.
 */
export const getPlanOptions = async (req, res) => {
    const { ok, status, data } = await callRegistry("/plans");
    if (!ok) {
        return res.status(status >= 500 ? 503 : status).json({
            success: false,
            message: data?.message || "Couldn't load plans from Zinth Labs.",
        });
    }
    return res.status(200).json(data);
};

/**
 * POST /api/admin/subscription/plan-request
 * Body: { planCode, paymentReference, note }
 * Tells Zinth Labs the venue has paid and wants this plan.
 */
export const requestPlanChange = async (req, res) => {
    const { planCode, paymentReference = "", note = "" } = req.body;

    if (!planCode || typeof planCode !== "string") {
        return res.status(400).json({ success: false, message: "Choose a plan first." });
    }

    const requestedBy = [req.user?.name, req.user?.phone || req.user?.email].filter(Boolean).join(", ");
    const fullNote = [note && String(note).trim(), requestedBy && `Sent by ${requestedBy}`]
        .filter(Boolean)
        .join(" — ");

    const { ok, status, data } = await callRegistry("/plan-requests", {
        method: "POST",
        body: { planCode, paymentReference: String(paymentReference).trim(), note: fullNote },
    });
    if (!ok) {
        return res.status(status >= 500 ? 503 : status).json({
            success: false,
            message: data?.message || "Couldn't notify Zinth Labs. Please try again.",
        });
    }
    return res.status(201).json(data);
};
