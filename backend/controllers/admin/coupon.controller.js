import Coupon from "../../models/coupon.model.js";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// GET /api/admin/coupons
// ---------------------------------------------------------------------------
/**
 * Get all coupons in the system.
 */
export const getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
        return res.status(200).json({
            coupons,
            total: coupons.length,
        });
    } catch (error) {
        console.error("Admin getAllCoupons error:", error);
        return res.status(500).json({ message: "Failed to fetch coupons." });
    }
};

// ---------------------------------------------------------------------------
// GET /api/admin/coupons/:couponId
// ---------------------------------------------------------------------------
/**
 * Get a single coupon by ID.
 */
export const getCouponById = async (req, res) => {
    try {
        const { couponId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            return res.status(400).json({ message: "Invalid coupon ID format." });
        }

        const coupon = await Coupon.findById(couponId).lean();
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        return res.status(200).json({ coupon });
    } catch (error) {
        console.error("Admin getCouponById error:", error);
        return res.status(500).json({ message: "Failed to fetch coupon." });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/coupons
// ---------------------------------------------------------------------------
/**
 * Create a new coupon.
 * Body: { code, discount_percentage, valid_from, valid_until, usage_limit, active }
 */
export const createCoupon = async (req, res) => {
    try {
        const { code, discount_percentage, valid_from, valid_until, usage_limit, active = true } = req.body;

        // 1. Validate code
        if (!code || typeof code !== "string" || !/^[A-Z0-9]{3,20}$/i.test(code.trim())) {
            return res.status(400).json({ message: "Coupon code must be 3–20 alphanumeric characters." });
        }

        const normalizedCode = code.trim().toUpperCase();

        // 2. Validate discount percentage
        const discount = Number(discount_percentage);
        if (Number.isNaN(discount) || discount <= 0 || discount > 100) {
            return res.status(400).json({ message: "Discount must be between 1 and 100%." });
        }

        // 3. Validate dates
        if (!valid_from || !valid_until) {
            return res.status(400).json({ message: "Both valid from and valid until dates are required." });
        }

        const startDate = new Date(valid_from);
        const endDate = new Date(valid_until);

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return res.status(400).json({ message: "Invalid validity dates." });
        }

        if (endDate < startDate) {
            return res.status(400).json({ message: "Valid until date must be after or equal to valid from date." });
        }

        // 4. Validate usage limit
        let parsedLimit = null;
        if (usage_limit !== undefined && usage_limit !== null && usage_limit !== "") {
            const limitNum = Number(usage_limit);
            if (Number.isNaN(limitNum) || limitNum < 1) {
                return res.status(400).json({ message: "Usage limit must be a positive number if provided." });
            }
            parsedLimit = limitNum;
        }

        // 5. Check duplicate code
        const existing = await Coupon.findOne({ code: normalizedCode });
        if (existing) {
            return res.status(409).json({ message: `Coupon with code "${normalizedCode}" already exists.` });
        }

        // 6. Create coupon
        const newCoupon = new Coupon({
            code: normalizedCode,
            discount_percentage: discount,
            valid_from: startDate,
            valid_until: endDate,
            usage_limit: parsedLimit,
            active: Boolean(active),
            used_count: 0,
        });

        await newCoupon.save();

        return res.status(201).json({
            message: "Coupon created successfully.",
            coupon: newCoupon,
        });
    } catch (error) {
        console.error("Admin createCoupon error:", error);
        return res.status(500).json({ message: "Failed to create coupon." });
    }
};

// ---------------------------------------------------------------------------
// PUT / PATCH /api/admin/coupons/:couponId
// ---------------------------------------------------------------------------
/**
 * Update an existing coupon.
 */
export const updateCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const { code, discount_percentage, valid_from, valid_until, usage_limit, active } = req.body;

        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            return res.status(400).json({ message: "Invalid coupon ID format." });
        }

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        // Validate & update code if provided
        if (code !== undefined) {
            if (typeof code !== "string" || !/^[A-Z0-9]{3,20}$/i.test(code.trim())) {
                return res.status(400).json({ message: "Coupon code must be 3–20 alphanumeric characters." });
            }
            const normalizedCode = code.trim().toUpperCase();

            const duplicate = await Coupon.findOne({
                _id: { $ne: couponId },
                code: normalizedCode,
            });

            if (duplicate) {
                return res.status(409).json({ message: `Coupon with code "${normalizedCode}" already exists.` });
            }

            coupon.code = normalizedCode;
        }

        // Validate & update discount percentage
        if (discount_percentage !== undefined) {
            const discount = Number(discount_percentage);
            if (Number.isNaN(discount) || discount <= 0 || discount > 100) {
                return res.status(400).json({ message: "Discount must be between 1 and 100%." });
            }
            coupon.discount_percentage = discount;
        }

        // Validate & update dates
        let newStartDate = coupon.valid_from;
        let newEndDate = coupon.valid_until;

        if (valid_from !== undefined) {
            const d = new Date(valid_from);
            if (Number.isNaN(d.getTime())) {
                return res.status(400).json({ message: "Invalid valid from date." });
            }
            newStartDate = d;
            coupon.valid_from = d;
        }

        if (valid_until !== undefined) {
            const d = new Date(valid_until);
            if (Number.isNaN(d.getTime())) {
                return res.status(400).json({ message: "Invalid valid until date." });
            }
            newEndDate = d;
            coupon.valid_until = d;
        }

        if (newEndDate < newStartDate) {
            return res.status(400).json({ message: "Valid until date must be after or equal to valid from date." });
        }

        // Update usage limit
        if (usage_limit !== undefined) {
            if (usage_limit === null || usage_limit === "") {
                coupon.usage_limit = null;
            } else {
                const limitNum = Number(usage_limit);
                if (Number.isNaN(limitNum) || limitNum < 1) {
                    return res.status(400).json({ message: "Usage limit must be a positive number." });
                }
                coupon.usage_limit = limitNum;
            }
        }

        // Update active status
        if (active !== undefined) {
            coupon.active = Boolean(active);
        }

        await coupon.save();

        return res.status(200).json({
            message: "Coupon updated successfully.",
            coupon,
        });
    } catch (error) {
        console.error("Admin updateCoupon error:", error);
        return res.status(500).json({ message: "Failed to update coupon." });
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/coupons/:couponId/toggle
// ---------------------------------------------------------------------------
/**
 * Quick toggle active/inactive status.
 */
export const toggleCouponStatus = async (req, res) => {
    try {
        const { couponId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            return res.status(400).json({ message: "Invalid coupon ID format." });
        }

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        coupon.active = !coupon.active;
        await coupon.save();

        return res.status(200).json({
            message: `Coupon "${coupon.code}" ${coupon.active ? "activated" : "deactivated"}.`,
            coupon,
        });
    } catch (error) {
        console.error("Admin toggleCouponStatus error:", error);
        return res.status(500).json({ message: "Failed to toggle coupon status." });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/coupons/:couponId
// ---------------------------------------------------------------------------
/**
 * Delete a coupon.
 */
export const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            return res.status(400).json({ message: "Invalid coupon ID format." });
        }

        const coupon = await Coupon.findByIdAndDelete(couponId);
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        return res.status(200).json({
            message: `Coupon "${coupon.code}" deleted successfully.`,
        });
    } catch (error) {
        console.error("Admin deleteCoupon error:", error);
        return res.status(500).json({ message: "Failed to delete coupon." });
    }
};

