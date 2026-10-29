/**
 * Admin role guard middleware.
 * Must be used AFTER authMiddleware so that req.user is already populated.
 *
 * Usage in a router:
 *   router.use(authMiddleware, adminMiddleware);
 */
const adminMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication required." });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Forbidden: admin access required.",
        });
    }

    next();
};

export default adminMiddleware;

