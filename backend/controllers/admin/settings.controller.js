import Setting from "../../models/setting.model.js";
import User from "../../models/user.model.js";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// GET /api/admin/settings
// ---------------------------------------------------------------------------
/**
 * Retrieve current business settings and preferences.
 */
export const getSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne().lean();
        if (!settings) {
            settings = await Setting.create({});
        }

        return res.status(200).json({ settings });
    } catch (error) {
        console.error("Admin getSettings error:", error);
        return res.status(500).json({ message: "Failed to fetch settings." });
    }
};

// ---------------------------------------------------------------------------
// PUT / PATCH /api/admin/settings
// ---------------------------------------------------------------------------
/**
 * Update business information and preferences.
 * Body: { business_name, contact_phone, email, city, address, allow_partial_payments, sms_confirmation, daily_summary_email }
 */
export const updateSettings = async (req, res) => {
    try {
        const {
            business_name,
            contact_phone,
            email,
            city,
            address,
            allow_partial_payments,
            sms_confirmation,
            daily_summary_email,
        } = req.body;

        let settings = await Setting.findOne();
        if (!settings) {
            settings = new Setting();
        }

        if (business_name !== undefined) settings.business_name = String(business_name).trim();
        if (contact_phone !== undefined) settings.contact_phone = String(contact_phone).trim();
        if (email !== undefined) settings.email = String(email).trim();
        if (city !== undefined) settings.city = String(city).trim();
        if (address !== undefined) settings.address = String(address).trim();
        if (allow_partial_payments !== undefined) settings.allow_partial_payments = Boolean(allow_partial_payments);
        if (sms_confirmation !== undefined) settings.sms_confirmation = Boolean(sms_confirmation);
        if (daily_summary_email !== undefined) settings.daily_summary_email = Boolean(daily_summary_email);

        await settings.save();

        return res.status(200).json({
            message: "Settings updated successfully.",
            settings,
        });
    } catch (error) {
        console.error("Admin updateSettings error:", error);
        return res.status(500).json({ message: "Failed to update settings." });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/settings/change-password
// ---------------------------------------------------------------------------
/**
 * Change the logged-in admin's password.
 * Body: { current_password, new_password }
 */
export const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password) {
            return res.status(400).json({ message: "Current password is required." });
        }

        if (!new_password || typeof new_password !== "string" || new_password.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long." });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Verify current password (supports both bcrypt hash and initial plaintext seed)
        let isMatch = false;
        if (user.password) {
            if (user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
                isMatch = await bcrypt.compare(current_password, user.password);
            } else {
                isMatch = user.password === current_password;
            }
        } else {
            isMatch = true;
        }

        if (!isMatch) {
            return res.status(400).json({ message: "Current password does not match." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({
            message: "Password changed successfully.",
        });
    } catch (error) {
        console.error("Admin changePassword error:", error);
        return res.status(500).json({ message: "Failed to change password." });
    }
};

