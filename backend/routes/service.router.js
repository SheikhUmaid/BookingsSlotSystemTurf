import {createService, getAllServices, deleteService} from "../controllers/service.controller.js";
import express from "express";
const router = express.Router();

router.post("/", createService);
router.get("/", getAllServices);
router.delete("/:serviceId", deleteService);    

export default router;