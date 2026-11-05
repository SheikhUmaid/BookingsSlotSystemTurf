import Coupon from "../models/coupon.model.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { customerCouponUses, perUserLimitMessage } from "../utils/coupons.js";



const createCoupon = async (req, res) => {

    try {
        const { code, discount_percentage, valid_from, valid_until, usage_limit } = req.body;
        
        // Validate the input data
        if (!code || typeof code !== "string") {
            return res.status(400).json({ message: "Invalid coupon code." });
        }
        if (typeof discount_percentage !== "number" || discount_percentage < 0 || discount_percentage > 100) {
            return res.status(400).json({ message: "Invalid discount percentage." });
        }
        if (!valid_from || !valid_until || new Date(valid_from) >= new Date(valid_until)) {
            return res.status(400).json({ message: "Invalid validity dates." });
        }
        if (usage_limit !== undefined && (typeof usage_limit !== "number" || usage_limit < 0)) {
            return res.status(400).json({ message: "Invalid usage limit." });
        }
        
        // Create a new coupon
        
        const newCoupon = new Coupon({
            code,
            discount_percentage,
            valid_from: new Date(valid_from),
            valid_until: new Date(valid_until),
            usage_limit: usage_limit || null, // null means unlimited usage
        });
        
        await newCoupon.save();
        
        res.status(201).json({ message: "Coupon created successfully.", coupon: newCoupon });
    }
    catch (error) {
        console.error("Error creating coupon:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};




/** User id from a valid bearer token, or null (this endpoint also works signed-out). */
async function optionalUserId(req) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("accessToken").lean();
        return user && user.accessToken === token ? user._id : null;
    } catch {
        return null;
    }
}

const verifyCoupon = async (req,res)=>{
    try{
        const {code} = req.params;

        if (!code || typeof code !== "string") {
            return res.status(400).json({ message: "Invalid coupon code." });
        }
        
        const coupon = await Coupon.findOne({ code }).lean();

        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        // If the customer is signed in, tell them now when they've used up their allowance
        // (the booking endpoint enforces this regardless).
        if (coupon.per_user_limit) {
            const userId = await optionalUserId(req);
            if (userId && (await customerCouponUses(coupon._id, userId)) >= coupon.per_user_limit) {
                return res.status(409).json({ message: perUserLimitMessage(coupon.per_user_limit) });
            }
        }

        return res.status(200).json({
            code: coupon.code,
            discount_percentage: coupon.discount_percentage,
            active: coupon.active,
            per_user_limit: coupon.per_user_limit ?? null,
        });

    }catch(err){
        console.error("Error verifying coupon:", err);
        res.status(500).json({ message: "Internal server error." });

    }
}

export { createCoupon, verifyCoupon };