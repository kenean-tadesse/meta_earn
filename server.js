require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const referralRoutes = require("./routes/referral.js");
const db = require("./config/db.js");

const app = express();

console.log("SERVER STARTED - NEW VERSION");

// =====================================================
// CORS
// =====================================================

app.use(cors({
    origin: [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",

        // Client Frontend
        "https://meta-earn-full.onrender.com",

        // Admin Frontend
        "https://meta-earn-admin.onrender.com"
    ],

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

// =====================================================
// EXPRESS 5 PRE-FLIGHT FIX
// =====================================================

app.options(/.*/, cors());

// =====================================================
// BODY PARSERS
// =====================================================

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// =====================================================
// REQUEST LOGGER
// =====================================================

app.use((req, res, next) => {

    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
    );

    next();
});

// =====================================================
// STATIC FILES
// =====================================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

// =====================================================
// IMPORT ROUTES
// =====================================================

const usersRoutes =
    require("./routes/users");

const levelRoutes =
    require("./routes/levels");

const adminRoutes =
    require("./routes/admin");

    const adminShopRoutes =
    require("./routes/admin-shop");
// =====================================================
// API ROUTES
// =====================================================

// -----------------------------------------------------
// Authentication
// EXISTING ROUTE - NOT CHANGED
// -----------------------------------------------------

app.use(
    "/api/auth",
    require("./routes/auth")
);


// -----------------------------------------------------
// Users
// EXISTING ROUTE - NOT CHANGED
// -----------------------------------------------------

app.use(
    "/api/users",
    usersRoutes
);


// -----------------------------------------------------
// Tasks
// EXISTING ROUTE - NOT CHANGED
// -----------------------------------------------------

app.use(
    "/api/tasks",
    require("./routes/tasks")
);


// -----------------------------------------------------
// Deposits
// EXISTING ROUTE - NOT CHANGED
// -----------------------------------------------------

app.use(
    "/api/deposits",
    require("./routes/deposits")
);


// -----------------------------------------------------
// Withdrawals
// EXISTING ROUTE - NOT CHANGED
// -----------------------------------------------------

app.use(
    "/api/withdrawals",
    require("./routes/withdrawals")
);


// -----------------------------------------------------
// Referral
// EXISTING ROUTE - NOT CHANGED
// -----------------------------------------------------

app.use(
    "/api/referral",
    require("./routes/referral.js")
);


// -----------------------------------------------------
// Levels
// EXISTING ROUTE - NOT CHANGED
// -----------------------------------------------------

app.use(
    "/api/levels",
    levelRoutes
);


// -----------------------------------------------------
// Admin
// EXISTING ROUTE - NOT CHANGED
// -----------------------------------------------------

app.use(
    "/api/admin",
    adminRoutes
);

app.use(
    "/api/admin/shop",
    adminShopRoutes
);
// -----------------------------------------------------
// Referral Routes
// EXISTING ROUTE - NOT CHANGED
// -----------------------------------------------------

app.use(
    "/api/referral",
    referralRoutes
);


// =====================================================
// META EARN SHOP
// NEW MODULE
// =====================================================

app.use(
    "/api/shop",
    require("./routes/shop")
);


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            status: "OK",

            uptime:
                process.uptime(),

            memory:
                process.memoryUsage(),

            timestamp:
                new Date().toISOString()

        });

    }
);


// =====================================================
// DATABASE CHECK
// =====================================================

app.get(
    "/api/database",
    async (req, res) => {

        try {

            const [rows] =
                await db.query(
                    "SELECT NOW() AS server_time"
                );

            res.json({

                success: true,

                database:
                    "Connected",

                server_time:
                    rows[0].server_time

            });

        } catch (error) {

            console.error(
                "DATABASE CHECK ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                database:
                    "Disconnected",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "Route not found"

        });

    }
);


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "SERVER ERROR:",
            err
        );

        res.status(500).json({

            success: false,

            message:
                "Internal Server Error",

            error:
                process.env.NODE_ENV === "development"
                    ? err.message
                    : undefined

        });

    }
);


// =====================================================
// START SERVER
// =====================================================

const PORT =
    process.env.PORT || 5000;


async function startServer() {

    try {

        // -------------------------------------------------
        // DATABASE TEST
        // -------------------------------------------------

        await db.query("SELECT 1");


        console.log(
            "\n===================================="
        );

        console.log(
            "META_EARN SERVER STARTED"
        );

        console.log(
            "===================================="
        );


        console.log(
            "Database : Connected"
        );


        console.log(
            `Port     : ${PORT}`
        );


        console.log(
            `URL      : http://localhost:${PORT}`
        );


        console.log(
            "====================================\n"
        );


        // -------------------------------------------------
        // START EXPRESS SERVER
        // -------------------------------------------------

        app.listen(
            PORT,
            () => {

                console.log(
                    `Server running on port ${PORT}`
                );

            }
        );


    } catch (error) {

        console.log(
            "\n===================================="
        );

        console.log(
            "DATABASE CONNECTION FAILED"
        );

        console.log(
            error.message
        );

        console.log(
            "====================================\n"
        );

        process.exit(1);

    }

}


// =====================================================
// RUN SERVER
// =====================================================

startServer();
