import app from "./app.js"
import connectDB from "./config/db.config.js";

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT,'0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
});




