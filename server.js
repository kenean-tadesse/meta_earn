require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./config/db.js");

const app = express();

console.log("====================================");
console.log("META EARN SERVER INITIALIZING");
console.log("====================================");


// =====================================================
// CORS
// =====================================================

const allowedOrigins = [

    // LOCAL FRONTEND
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",

    // MAIN CLIENT
    "https://meta-earn-full.onrender.com",

    // ADMIN CLIENTS
    "https://meta-earn-admin.onrender.com",
    "https://meta-earn-admin-1yum.onrender.com"
];


app.use(
    cors({

        origin: function (origin, callback) {

            // Allow requests without Origin
            // such as Postman/server-side requests

            if (!origin) {

                return callback(null, true);

            }


            if (
                allowedOrigins.includes(origin)
            ) {

                return callback(
                    null,
                    true
                );

            }


            console.log(
                "CORS BLOCKED:",
                origin
            );


            return callback(
                new Error(
                    "Not allowed by CORS"
                )
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

    })
);


// =====================================================
// EXPRESS 5 PREFLIGHT
// =====================================================

app.options(
    /.*/,
    cors({
        origin: allowedOrigins,
        credentials: true
    })
);


// =====================================================
// BODY PARSERS
// =====================================================

app.use(
    express.json()
);


app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// REQUEST LOGGER
// =====================================================

app.use(
    (req, res, next) => {

        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
        );

        next();

    }
);


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

const authRoutes =
    require("./routes/auth");

console.log(
    "AUTH ROUTE LOADED"
);


const usersRoutes =
    require("./routes/users");

console.log(
    "USERS ROUTE LOADED"
);


const tasksRoutes =
    require("./routes/tasks");

console.log(
    "TASKS ROUTE LOADED"
);


const depositsRoutes =
    require("./routes/deposits");

console.log(
    "DEPOSITS ROUTE LOADED"
);


const withdrawalsRoutes =
    require("./routes/withdrawals");

console.log(
    "WITHDRAWALS ROUTE LOADED"
);


const referralRoutes =
    require("./routes/referral.js");

console.log(
    "REFERRAL ROUTE LOADED"
);


const levelRoutes =
    require("./routes/levels");

console.log(
    "LEVELS ROUTE LOADED"
);


const adminRoutes =
    require("./routes/admin");

console.log(
    "ADMIN ROUTE LOADED"
);


// =====================================================
// ADMIN SHOP ROUTE
// =====================================================

const adminShopRoutes =
    require("./routes/admin-shop");

console.log(
    "ADMIN SHOP ROUTE LOADED"
);
const adminShopOrdersRoutes =
    require("./routes/admin-shop-orders.js");

console.log(
    "ADMIN SHOP ORDERS ROUTE LOADED"
);

// =====================================================
// PUBLIC SHOP ROUTE
// =====================================================

const shopRoutes =
    require("./routes/shop");

console.log(
    "SHOP ROUTE LOADED"
);


// =====================================================
// API ROUTES
// =====================================================


// -----------------------------------------------------
// AUTH
// -----------------------------------------------------

app.use(
    "/api/auth",
    authRoutes
);


// -----------------------------------------------------
// USERS
// -----------------------------------------------------

app.use(
    "/api/users",
    usersRoutes
);


// -----------------------------------------------------
// TASKS
// -----------------------------------------------------

app.use(
    "/api/tasks",
    tasksRoutes
);


// -----------------------------------------------------
// DEPOSITS
// -----------------------------------------------------

app.use(
    "/api/deposits",
    depositsRoutes
);


// -----------------------------------------------------
// WITHDRAWALS
// -----------------------------------------------------

app.use(
    "/api/withdrawals",
    withdrawalsRoutes
);


// -----------------------------------------------------
// REFERRAL
// -----------------------------------------------------

app.use(
    "/api/referral",
    referralRoutes
);


// -----------------------------------------------------
// LEVELS
// -----------------------------------------------------

app.use(
    "/api/levels",
    levelRoutes
);


// -----------------------------------------------------
// ADMIN
// -----------------------------------------------------

app.use(
    "/api/admin",
    adminRoutes
);
app.use(
    "/api/admin/shop",
    adminShopOrdersRoutes
);

// =====================================================
// ADMIN SHOP
// =====================================================

console.log(
    "===================================="
);

console.log(
    "MOUNTING ADMIN SHOP ROUTES"
);

console.log(
    "/api/admin/shop"
);

console.log(
    "===================================="
);


app.use(
    "/api/admin/shop",
    adminShopRoutes
);


console.log(
    "✅ ADMIN SHOP ROUTES MOUNTED"
);


// -----------------------------------------------------
// PUBLIC SHOP
// -----------------------------------------------------

app.use(
    "/api/shop",
    shopRoutes
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

            message:
                "Meta Earn API is running",

            uptime:
                process.uptime(),

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

        }

        catch (error) {

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
// ROUTE DEBUG
// =====================================================

app.get(
    "/api/admin/shop-test",
    (req, res) => {

        res.json({

            success: true,

            message:
                "ADMIN SHOP ROUTE IS MOUNTED",

            route:
                "/api/admin/shop"

        });

    }
);


// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    (req, res) => {

        console.log(
            "404 ROUTE:",
            req.method,
            req.originalUrl
        );


        res.status(404).json({

            success: false,

            message:
                "Route not found",

            method:
                req.method,

            path:
                req.originalUrl

        });

    }
);


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "===================================="
        );

        console.error(
            "SERVER ERROR"
        );

        console.error(
            err
        );

        console.error(
            "===================================="
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

        await db.query(
            "SELECT 1"
        );


        console.log(
            "===================================="
        );

        console.log(
            "DATABASE CONNECTION SUCCESSFUL"
        );

        console.log(
            "DATABASE:",
            process.env.DB_NAME ||
            process.env.MYSQL_DATABASE ||
            "unknown"
        );

        console.log(
            "===================================="
        );


        app.listen(
            PORT,
            () => {

                console.log(
                    "===================================="
                );

                console.log(
                    "META EARN SERVER STARTED"
                );

                console.log(
                    `PORT: ${PORT}`
                );

                console.log(
                    `LOCAL: http://localhost:${PORT}`
                );

                console.log(
                    "ADMIN SHOP:"
                );

                console.log(
                    "/api/admin/shop"
                );

                console.log(
                    "===================================="
                );

            }
        );

    }

    catch (error) {

        console.error(
            "===================================="
        );

        console.error(
            "DATABASE CONNECTION FAILED"
        );

        console.error(
            error
        );

        console.error(
            "===================================="
        );

        process.exit(1);

    }

}


// =====================================================
// RUN
// =====================================================

startServer();
