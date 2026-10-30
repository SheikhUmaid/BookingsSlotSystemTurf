import { adminLogin, sendOTP, verifyOTP } from "../controllers/user.controller.js";
import express from "express";
const router = express.Router();

router.post("/login", adminLogin);
router.post("/admin-login", adminLogin);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

export default router;