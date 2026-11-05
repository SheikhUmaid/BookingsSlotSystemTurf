import express from "express";
import {
    listMaintenance,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
} from "../../controllers/admin/maintenance.controller.js";

const router = express.Router();

router.get("/", listMaintenance);
router.post("/", createMaintenance);
router.patch("/:id", updateMaintenance);
router.delete("/:id", deleteMaintenance);

export default router;
