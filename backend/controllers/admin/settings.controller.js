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
 * Body: { business_name, contact_phone, email, city, address, tagline, landmark, pincode,
 *         opening_hours, maps_url, latitude, longitude, allow_partial_payments,
 *         sms_confirmation, daily_summary_email }
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
            tagline,
            landmark,
            pincode,
            opening_hours,
            maps_url,
            latitude,
            longitude,
        } = req.body;

        // Coordinates: both or neither, within valid ranges.
        const toCoord = (v) => (v === "" || v === null ? null : Number(v));
        const lat = latitude !== undefined ? toCoord(latitude) : undefined;
        const lng = longitude !== undefined ? toCoord(longitude) : undefined;
        if (lat !== undefined && lat !== null && !(lat >= -90 && lat <= 90)) {
            return res.status(400).json({ message: "Latitude must be between -90 and 90." });
        }
        if (lng !== undefined && lng !== null && !(lng >= -180 && lng <= 180)) {
            return res.status(400).json({ message: "Longitude must be between -180 and 180." });
        }

        const mapsLink = maps_url !== undefined ? String(maps_url).trim() : undefined;
        if (mapsLink && !/^https:\/\//i.test(mapsLink)) {
            return res.status(400).json({ message: "Google Maps link must start with https://" });
        }

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
        if (tagline !== undefined) settings.tagline = String(tagline).trim();
        if (landmark !== undefined) settings.landmark = String(landmark).trim();
        if (pincode !== undefined) settings.pincode = String(pincode).trim();
        if (opening_hours !== undefined) settings.opening_hours = String(opening_hours).trim();
        if (mapsLink !== undefined) settings.maps_url = mapsLink;
        if (lat !== undefined) settings.latitude = lat;
        if (lng !== undefined) settings.longitude = lng;
        if ((settings.latitude == null) !== (settings.longitude == null)) {
            return res.status(400).json({ message: "Enter both latitude and longitude, or leave both empty." });
        }

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

