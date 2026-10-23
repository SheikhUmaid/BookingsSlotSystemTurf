import Coupon from "../models/coupon.model.js";



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




const verifyCoupon = async (req,res)=>{
    try{
        const {code} = req.params;

        if (!code || typeof code !== "string") {
            return res.status(400).json({ message: "Invalid coupon code." });
        }
        
        const data = await Coupon.findOne({ code }).select("-_id -__v -createdAt -updatedAt -valid_from -valid_until -usage_limit -used_count ");

        if (!data) {
            return res.status(404).json({ message: "Coupon not found." });
        }
        
        return res.status(200).json(data);

    }catch(err){
        console.error("Error verifying coupon:", err);
        res.status(500).json({ message: "Internal server error." });

    }
}

export { createCoupon, verifyCoupon };