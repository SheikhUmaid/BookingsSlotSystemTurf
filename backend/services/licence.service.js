import Setting from "../models/setting.model.js";

/**
 * Licence service — the ONLY place TurfOS talks to the Subscription Registry
 * and the only place that reads plan data.
 *
 * Plan rules are never hardcoded: limits and feature flags are whatever the
 * registry last sent. The latest licence is persisted on the Setting document
 * (so it survives restarts / registry outages) and kept in memory for fast
 * lookups by middleware.
 *
 * Conventions:
 *  - hasFeature(key)  → true only when the registry sent `features[key] === true`.
 *  - getLimit(key)    → a number, or Infinity when the registry sent null/undefined/-1
 *                       for that limit (i.e. "unlimited").
 *  - plan === null    → no subscription; the account is blocked (see subscription.middleware).
 */

const REGISTRY_URL = process.env.REGISTRY_API_URL || "http://localhost:5001/api/registry/status";
const REGISTRY_TOKEN = process.env.DEPLOYMENT_API_KEY || process.env.REGISTRY_BEARER_TOKEN || "";
const REGISTRY_TIMEOUT_MS = 3000;
// How long the in-memory licence is considered fresh before a background refresh.
const CACHE_TTL_MS = Number(process.env.LICENCE_CACHE_TTL_MS || 5 * 60 * 1000);

/** @type {null | ReturnType<typeof toLicence>} */
let cache = null;
let cacheLoadedAt = 0;
let inflightRefresh = null;

const VALID_STATUSES = ["active", "inactive", "suspended"];

function normalisePlan(plan) {
    if (!plan || typeof plan !== "object") return null;
    return {
        code: typeof plan.code === "string" ? plan.code : null,
        name: typeof plan.name === "string" ? plan.name : plan.code ?? null,
        limits: plan.limits && typeof plan.limits === "object" ? { ...plan.limits } : {},
        features: plan.features && typeof plan.features === "object" ? { ...plan.features } : {},
    };
}

function toLicence(setting, { registryReachable = false } = {}) {
    const expiresAt = setting.subscriptionExpiresAt ? new Date(setting.subscriptionExpiresAt) : null;
    return {
        deploymentId: setting.deploymentId || "DEP-0001",
        status: setting.deploymentStatus || "active",
        bookingEnabled: setting.bookingEnabled ?? true,
        expiresAt,
        isExpired: Boolean(expiresAt && expiresAt.getTime() <= Date.now()),
        plan: normalisePlan(setting.plan),
        syncedAt: setting.licenceSyncedAt || null,
        registryReachable,
    };
}

async function fetchRegistry() {
    if (!REGISTRY_TOKEN) {
        console.warn("[Licence] DEPLOYMENT_API_KEY / REGISTRY_BEARER_TOKEN is not set — cannot query the registry.");
        return null;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REGISTRY_TIMEOUT_MS);
    try {
        const res = await fetch(REGISTRY_URL, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${REGISTRY_TOKEN}` },
            signal: controller.signal,
        });
        if (!res.ok) {
            console.warn(`[Licence] Registry returned HTTP ${res.status}`);
            return null;
        }
        const data = await res.json();
        return data && data.success ? data : null;
    } catch (err) {
        console.warn("[Licence] Unable to reach registry at", REGISTRY_URL, "-", err.message);
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Base for other registry endpoints, e.g. ".../api/registry/status" → ".../api/registry".
const REGISTRY_BASE = REGISTRY_URL.replace(/\/status\/?$/, "");

/**
 * Call another registry endpoint as this deployment.
 * Resolves to { ok, status, data }; never throws for network errors.
 */
export async function callRegistry(path, { method = "GET", body } = {}) {
    if (!REGISTRY_TOKEN) {
        return { ok: false, status: 503, data: { message: "This venue isn't connected to Zinth Labs yet." } };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REGISTRY_TIMEOUT_MS * 2);
    try {
        const res = await fetch(`${REGISTRY_BASE}${path}`, {
            method,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${REGISTRY_TOKEN}` },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        console.warn("[Licence] Registry call failed:", path, "-", err.message);
        return { ok: false, status: 503, data: { message: "Couldn't reach Zinth Labs. Please try again shortly." } };
    } finally {
        clearTimeout(timeoutId);
    }
}

async function loadSetting() {
    let setting = await Setting.findOne();
    if (!setting) setting = await Setting.create({});
    return setting;
}

/**
 * Query the registry and persist the result. Falls back to the stored licence
 * when the registry can't be reached. Concurrent callers share one request.
 */
export function refreshLicence() {
    if (inflightRefresh) return inflightRefresh;
    inflightRefresh = (async () => {
        const [registryData, setting] = await Promise.all([fetchRegistry(), loadSetting()]);

        if (registryData) {
            if (registryData.deploymentId) setting.deploymentId = registryData.deploymentId;
            setting.deploymentStatus = VALID_STATUSES.includes(registryData.status) ? registryData.status : "active";
            setting.bookingEnabled = typeof registryData.bookingEnabled === "boolean" ? registryData.bookingEnabled : true;
            if (registryData.expiresAt) setting.subscriptionExpiresAt = new Date(registryData.expiresAt);
            // Store the plan exactly as the registry sent it (null = no subscription).
            setting.plan = registryData.plan ?? null;
            setting.markModified("plan");
            setting.licenceSyncedAt = new Date();
            await setting.save();
        }

        cache = toLicence(setting, { registryReachable: Boolean(registryData) });
        cacheLoadedAt = Date.now();
        return cache;
    })().finally(() => {
        inflightRefresh = null;
    });
    return inflightRefresh;
}

/**
 * Current licence. Served from memory; loads from DB on first use, and when the
 * cache is older than CACHE_TTL_MS it refreshes from the registry in the
 * background (callers are never blocked on the registry after the first sync).
 */
export async function getLicence() {
    if (!cache) {
        const setting = await loadSetting();
        cache = toLicence(setting);
        cacheLoadedAt = Date.now();
        // Never synced with the registry yet: wait for the first answer.
        if (!cache.syncedAt) return refreshLicence();
    }
    if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
        refreshLicence().catch((err) => console.error("[Licence] background refresh failed:", err));
    }
    return cache;
}

/** Feature flag lookup. Anything the registry didn't explicitly enable is off. */
export async function hasFeature(key) {
    const licence = await getLicence();
    return licence.plan?.features?.[key] === true;
}

/** Numeric limit lookup. null / undefined / negative from the registry = unlimited. */
export async function getLimit(key) {
    const licence = await getLicence();
    return limitFromPlan(licence.plan, key);
}

export function limitFromPlan(plan, key) {
    if (!plan) return 0;
    const value = plan.limits?.[key];
    if (value === null || value === undefined) return Infinity;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return Infinity;
    return n;
}

/**
 * Is the account blocked from write operations?
 * Returns null when OK, otherwise { code, reason } describing why.
 */
export function blockedReason(licence) {
    if (licence.status !== "active") return { code: "SUBSCRIPTION_INACTIVE", reason: licence.status };
    if (licence.isExpired) return { code: "SUBSCRIPTION_INACTIVE", reason: "expired" };
    if (!licence.plan) return { code: "NO_PLAN", reason: "no_plan" };
    return null;
}
