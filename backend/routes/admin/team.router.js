import express from "express";
import {
    getTeam,
    createTeamMember,
    updateMemberPermissions,
    deleteTeamMember,
} from "../../controllers/admin/team.controller.js";
import { requireFeature } from "../../middlewares/licence.middleware.js";

const router = express.Router();

// GET /api/admin/team
router.get("/", getTeam);

// POST /api/admin/team — staffManagement + maxStaff / maxAdmins enforced in the controller
router.post("/", createTeamMember);

// PATCH /api/admin/team/:memberId/permissions
router.patch("/:memberId/permissions", requireFeature("roleBasedAccess"), updateMemberPermissions);

// DELETE /api/admin/team/:memberId
router.delete("/:memberId", deleteTeamMember);

export default router;
