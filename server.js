require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const referralRoutes = require("./routes/referral.js");
const db = require("./config/db.js");
const auth = require("./middleware/auth");
const app = express();
const router = express.Router();
app.use(express.static("public"));
// ===============================
// MIDDLEWARE FIRST
// ===============================
console.log("SERVER STARTED - NEW VERSION");
const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",

    // Admin Frontend
    "https://meta-earn-admin-1yum.onrender.com",

    // Other Client Frontend
    "https://meta-earn-full.onrender.com"
];

app.use(cors({
    origin: function (origin, callback) {

        // Allow requests without an origin
        // (Postman, server-to-server, etc.)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log("CORS BLOCKED ORIGIN:", origin);

        return callback(
            new Error("Not allowed by CORS")
        );
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ]
}));

// Explicitly handle preflight requests
app.options("*", cors({
    origin: allowedOrigins,
    credentials: true
}));
// Explicitly handle preflight requests
app.options("*", cors({
    origin: allowedOrigins,
    credentials: true
}));

// Handle preflight requests
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// REQUEST LOGGER
// ===============================

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// ===============================
// STATIC FILES
// ===============================

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===============================
// IMPORT ROUTES
// ===============================
const usersRoutes = require("./routes/users");
const levelRoutes = require("./routes/levels");
const adminRoutes = require("./routes/admin");

// ===============================
// API ROUTES
// ===============================

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/deposits", require("./routes/deposits"));
app.use("/api/withdrawals", require("./routes/withdrawals"));
app.use("/api/referral", require("./routes/referral.js"));

app.use("/api/levels", levelRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/referral", referralRoutes);
// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "OK",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// ===============================
// DATABASE CHECK
// ===============================

app.get("/api/database", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT NOW() AS server_time");

        res.json({
            success: true,
            database: "Connected",
            server_time: rows[0].server_time
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            database: "Disconnected",
            error: error.message
        });

    }
});

// ===============================
// 404 HANDLER
// ===============================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// ===============================
// GLOBAL ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {

    console.error("SERVER ERROR:", err);

    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === "development"
            ? err.message
            : undefined
    });

});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

async function startServer() {

    try {

        await db.query("SELECT 1");

        console.log("\n====================================");
        console.log("META_EARN SERVER STARTED");
        console.log("====================================");
        console.log("Database : Connected");
        console.log(`Port     : ${PORT}`);
        console.log(`URL      : http://localhost:${PORT}`);
        console.log("====================================\n");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {

        console.log("\n====================================");
        console.log("DATABASE CONNECTION FAILED");
        console.log(error.message);
        console.log("====================================\n");

        process.exit(1);
    }
}

startServer();
