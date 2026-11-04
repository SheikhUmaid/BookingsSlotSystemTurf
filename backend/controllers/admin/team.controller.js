import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../../models/user.model.js";
import { getLicence } from "../../services/licence.service.js";
import { checkLimit, featureDeniedBody } from "../../middlewares/licence.middleware.js";
import {
    STAFF_AREAS,
    DEFAULT_STAFF_PERMISSIONS,
    sanitizePermissions,
    effectivePermissions,
} from "../../utils/permissions.js";

const TEAM_ROLES = ["admin", "staff"];

const toMember = (u, plan) => ({
    _id: u._id,
    name: u.name || "",
    phone: u.phone,
    email: u.email || "",
    role: u.role,
    permissions: u.role === "staff" ? effectivePermissions(u, plan) : STAFF_AREAS,
    assignedPermissions: u.role === "staff" ? u.permissions ?? null : null,
});

// ---------------------------------------------------------------------------
// GET /api/admin/team
// ---------------------------------------------------------------------------
export const getTeam = async (req, res) => {
    try {
        const { plan } = await getLicence();
        const users = await User.find({ role: { $in: TEAM_ROLES } })
            .select("name phone email role permissions")
            .sort({ role: 1, name: 1 })
            .lean();
        return res.status(200).json({
            members: users.map((u) => toMember(u, plan)),
            areas: STAFF_AREAS,
            defaultStaffPermissions: DEFAULT_STAFF_PERMISSIONS,
        });
    } catch (error) {
        console.error("Admin getTeam error:", error);
        return res.status(500).json({ message: "Failed to fetch team members." });
    }
};

// ---------------------------------------------------------------------------
// POST /api/admin/team
// Body: { name, phone, email?, password, role: "admin" | "staff", permissions? }
// ---------------------------------------------------------------------------
export const createTeamMember = async (req, res) => {
    try {
        const { name, phone, email, password, role, permissions } = req.body;

        if (!TEAM_ROLES.includes(role)) {
            return res.status(400).json({ message: "Role must be admin or staff." });
        }
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Name is required." });
        }
        if (!phone || typeof phone !== "string" || !/^\+?\d{7,15}$/.test(phone.trim())) {
            return res.status(400).json({ message: "A valid phone number is required." });
        }
        if (email !== undefined && email !== "" && (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email))) {
            return res.status(400).json({ message: "Email is invalid." });
        }
        if (!password || typeof password !== "string" || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters." });
        }

        const { plan } = await getLicence();

        // Plan checks — feature first, then the numeric limit.
        if (role === "staff" && plan?.features?.staffManagement !== true) {
            return res.status(403).json(featureDeniedBody("staffManagement", plan));
        }
        const limitKey = role === "staff" ? "maxStaff" : "maxAdmins";
        const denied = await checkLimit(limitKey, await User.countDocuments({ role }));
        if (denied) return res.status(403).json(denied);

        let assigned;
        if (role === "staff" && permissions !== undefined) {
            if (plan?.features?.roleBasedAccess !== true) {
                return res.status(403).json(featureDeniedBody("roleBasedAccess", plan));
            }
            assigned = sanitizePermissions(permissions);
            if (!assigned) return res.status(400).json({ message: "Permissions must be a list." });
        }

        const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
        const existing = await User.findOne({
            $or: [{ phone: phone.trim() }, ...(normalizedEmail ? [{ email: normalizedEmail }] : [])],
        }).lean();
        if (existing) {
            return res.status(409).json({ message: "A user with this phone number or email already exists." });
        }

        const user = await User.create({
            name: name.trim(),
            phone: phone.trim(),
            email: normalizedEmail,
            role,
            password: await bcrypt.hash(password, 10),
            ...(assigned ? { permissions: assigned } : {}),
        });

        return res.status(201).json({
            message: `${role === "staff" ? "Staff member" : "Admin"} "${user.name}" created.`,
            member: toMember(user.toObject(), plan),
        });
    } catch (error) {
        console.error("Admin createTeamMember error:", error);
        return res.status(500).json({ message: "Failed to create team member." });
    }
};

// ---------------------------------------------------------------------------
// PATCH /api/admin/team/:memberId/permissions   (requires roleBasedAccess)
// Body: { permissions: string[] }
// ---------------------------------------------------------------------------
export const updateMemberPermissions = async (req, res) => {
    try {
        const { memberId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: "Invalid member ID." });
        }
        const permissions = sanitizePermissions(req.body.permissions);
        if (!permissions) return res.status(400).json({ message: "Permissions must be a list." });

        const user = await User.findOne({ _id: memberId, role: "staff" });
        if (!user) return res.status(404).json({ message: "Staff member not found." });

        user.permissions = permissions;
        await user.save();

        const { plan } = await getLicence();
        return res.status(200).json({ message: "Permissions updated.", member: toMember(user.toObject(), plan) });
    } catch (error) {
        console.error("Admin updateMemberPermissions error:", error);
        return res.status(500).json({ message: "Failed to update permissions." });
    }
};

// ---------------------------------------------------------------------------
// DELETE /api/admin/team/:memberId
// Removing people is always allowed (it's the owner's choice, not a plan rule),
// except removing yourself or the last admin.
// ---------------------------------------------------------------------------
export const deleteTeamMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: "Invalid member ID." });
        }
        if (String(req.user._id) === memberId) {
            return res.status(400).json({ message: "You can't remove your own account." });
        }

        const user = await User.findOne({ _id: memberId, role: { $in: TEAM_ROLES } });
        if (!user) return res.status(404).json({ message: "Team member not found." });

        if (user.role === "admin" && (await User.countDocuments({ role: "admin" })) <= 1) {
            return res.status(400).json({ message: "At least one admin account is required." });
        }

        await User.deleteOne({ _id: memberId });
        return res.status(200).json({ message: `"${user.name || user.phone}" removed from the team.` });
    } catch (error) {
        console.error("Admin deleteTeamMember error:", error);
        return res.status(500).json({ message: "Failed to remove team member." });
    }
};
