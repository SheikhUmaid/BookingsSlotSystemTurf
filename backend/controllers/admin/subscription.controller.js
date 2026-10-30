import Setting from "../../models/setting.model.js";

/**
 * GET /api/admin/subscription/status
 * Fetches current subscription/deployment status from the central registry
 * at localhost:5001/api/registry/status with the configured bearer token.
 * Falls back gracefully to local cached Setting or mock status if the registry service is offline.
 */
export const getSubscriptionStatus = async (req, res) => {
    try {
        const registryUrl = process.env.REGISTRY_API_URL || "http://localhost:5001/api/registry/status";
        const registryToken = process.env.REGISTRY_BEARER_TOKEN || "zln_live_95ec7bb6740ae02c447a00a29fbcb281b794d65835b88d4c3e27301782975484";

        let registryData = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const registryResponse = await fetch(registryUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${registryToken}`,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (registryResponse.ok) {
                registryData = await registryResponse.json();
            } else {
                console.warn(`[Registry] Service returned status ${registryResponse.status}`);
            }
        } catch (fetchErr) {
            console.warn("[Registry] Unable to reach central registry at", registryUrl, fetchErr.message);
        }

        // Get local settings document
        let setting = await Setting.findOne();
        if (!setting) {
            setting = new Setting();
        }

        // If registry gave a response, update our local cache
        if (registryData && registryData.success) {
            setting.deploymentId = registryData.deploymentId || setting.deploymentId || "DEP-0001";
            setting.deploymentStatus = ["active", "inactive", "suspended"].includes(registryData.status)
                ? registryData.status
                : "active";
            setting.bookingEnabled = typeof registryData.bookingEnabled === "boolean" ? registryData.bookingEnabled : true;
            if (registryData.expiresAt) {
                setting.subscriptionExpiresAt = new Date(registryData.expiresAt);
            }
            await setting.save();
        }

        const expiresAt = setting.subscriptionExpiresAt ? new Date(setting.subscriptionExpiresAt) : new Date("2026-11-29T00:00:00.000Z");
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const hoursLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

        return res.status(200).json({
            success: true,
            deploymentId: setting.deploymentId || "DEP-0001",
            status: setting.deploymentStatus || "active",
            deploymentStatus: setting.deploymentStatus || "active",
            bookingEnabled: setting.bookingEnabled ?? true,
            expiresAt: expiresAt.toISOString(),
            daysLeft,
            hoursLeft,
            isExpired: diffMs <= 0,
            registryReachable: Boolean(registryData && registryData.success),
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

