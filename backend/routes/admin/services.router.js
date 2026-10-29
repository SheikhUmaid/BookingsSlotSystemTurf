import express from "express";
import {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
} from "../../controllers/admin/services.controller.js";

const router = express.Router();

// GET /api/admin/services
router.get("/", getAllServices);

// POST /api/admin/services
router.post("/", createService);

// GET /api/admin/services/:serviceId
router.get("/:serviceId", getServiceById);

// PUT / PATCH /api/admin/services/:serviceId
router.put("/:serviceId", updateService);
router.patch("/:serviceId", updateService);

// DELETE /api/admin/services/:serviceId
router.delete("/:serviceId", deleteService);

export default router;

