import app from "./app.js"
import connectDB from "./config/db.config.js";
import { refreshLicence } from "./services/licence.service.js";

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    // Sync the licence/plan from the registry at boot (falls back to the stored licence).
    refreshLicence().catch((err) => console.error("[Licence] initial refresh failed:", err));
    app.listen(PORT,'0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
});




