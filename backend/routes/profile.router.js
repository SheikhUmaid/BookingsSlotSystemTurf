
import { updateUser, getUser } from "../controllers/user.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import express from "express";



const router = express.Router()
router.use(authMiddleware)



router.patch('/',updateUser);
router.get('/', getUser)



export default router;