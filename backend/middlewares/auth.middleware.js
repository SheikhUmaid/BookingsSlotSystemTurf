import User from "../models/user.model.js";
import jwt from "jsonwebtoken";


const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
        console.debug(token)
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        if (user.accessToken !== token) {
            return res.status(401).json({ message: "Invalid token" });
        }
        next();
    } catch (error) {
        res.status(401).json({ message: "Unauthorized", error: error.message });
    }
};



export default authMiddleware;