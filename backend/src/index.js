import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import { dirname, join } from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";

import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Handle __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
    const frontendPath = join(__dirname, "../frontend/dist");
    app.use(express.static(frontendPath));

    // Regex catch-all route (fixes pathToRegexpError)
    app.get(/.*/, (req, res) => {
        res.sendFile(join(frontendPath, "index.html"));
    });
}

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
    connectDB()
        .then(() => console.log("Database connected successfully."))
        .catch((err) => console.error("Database connection failed:", err));
});


// import express from "express";
// import dotenv from "dotenv";
// import cookieParser from "cookie-parser";
// import cors from "cors";

// import path from "path";

// import authRoutes from "./routes/auth.route.js";
// import messageRoutes from "./routes/message.route.js";

// import { connectDB } from "./lib/db.js";
// import { app,server } from "./lib/socket.js";

// dotenv.config();


// const PORT = process.env.PORT;
// const __dirname = path.resolve();

// app.use(express.json());
// app.use(cookieParser());
// app.use(cors({
//     origin: "http://localhost:5173",
//     credentials: true,
// }));

// app.use("/api/auth", authRoutes);
// app.use("/api/messages", messageRoutes);

// if (process.env.NODE_ENV === "production") {
//     app.use(express.static(path.join(__dirname, "../frontend/dist")));

//     app.get("*", (req, res) => {
//         res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
//     });
// };

// server.listen(PORT, () => {
//     console.log("server is running on port: " + PORT);
//     connectDB()
// });
