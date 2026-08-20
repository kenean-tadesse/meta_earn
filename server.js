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


// =====================================================
// CORS OPTIONS
// =====================================================

const corsOptions = {

    origin: function (origin, callback) {

        // Allow requests without Origin
        // Postman, server-side requests, etc.

        if (!origin) {

            return callback(null, true);

        }


        if (allowedOrigins.includes(origin)) {

            return callback(null, true);

        }


        console.log(
            "CORS BLOCKED:",
            origin
        );


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
        "PATCH",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ]

};


// =====================================================
// GLOBAL CORS
// =====================================================

app.use(
    cors(corsOptions)
);


// =====================================================
// EXPRESS 5 PREFLIGHT
// =====================================================
//
// IMPORTANT:
//
// DO NOT USE:
//
// app.options("*", ...)
// app.options("/*", ...)
//
// Express 5 / path-to-regexp can reject wildcard
// patterns.
//
// cors middleware already handles preflight requests.
// Therefore no explicit wildcard OPTIONS route is needed.
//
// =====================================================


// =====================================================
// BODY PARSERS
// =====================================================

app.use(
    express.json({
        limit: "10mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
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

let authRoutes;
let usersRoutes;
let tasksRoutes;
let depositsRoutes;
let withdrawalsRoutes;
let referralRoutes;
let levelRoutes;
let adminRoutes;
let adminShopRoutes;
let adminShopOrdersRoutes;
let shopRoutes;


// =====================================================
// AUTH
// =====================================================

try {

    authRoutes =
        require("./routes/auth");

    console.log(
        "AUTH ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "AUTH ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


// =====================================================
// USERS
// =====================================================

try {

    usersRoutes =
        require("./routes/users");

    console.log(
        "USERS ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "USERS ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


// =====================================================
// TASKS
// =====================================================

try {

    tasksRoutes =
        require("./routes/tasks");

    console.log(
        "TASKS ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "TASKS ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


// =====================================================
// DEPOSITS
// =====================================================

try {

    depositsRoutes =
        require("./routes/deposits");

    console.log(
        "DEPOSITS ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "DEPOSITS ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


// =====================================================
// WITHDRAWALS
// =====================================================

try {

    withdrawalsRoutes =
        require("./routes/withdrawals");

    console.log(
        "WITHDRAWALS ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "WITHDRAWALS ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


// =====================================================
// REFERRAL
// =====================================================

try {

    referralRoutes =
        require("./routes/referral.js");

    console.log(
        "REFERRAL ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "REFERRAL ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


// =====================================================
// LEVELS
// =====================================================

try {

    levelRoutes =
        require("./routes/levels");

    console.log(
        "LEVELS ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "LEVELS ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


// =====================================================
// ADMIN
// =====================================================

try {

    adminRoutes =
        require("./routes/admin");

    console.log(
        "ADMIN ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "ADMIN ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


// =====================================================
// ADMIN SHOP
// =====================================================

try {

    adminShopRoutes =
        require("./routes/admin-shop");

    console.log(
        "ADMIN SHOP ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "ADMIN SHOP ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


// =====================================================
// ADMIN SHOP ORDERS
// =====================================================
//
// Kept for compatibility with your existing project.
//
// However, your admin-shop.js already contains:
//
// GET /orders
//
// Therefore we will NOT mount this second route file
// unless you specifically need its separate routes.
//
// =====================================================

try {

    adminShopOrdersRoutes =
        require("./routes/admin-shop-orders.js");

    console.log(
        "ADMIN SHOP ORDERS ROUTE LOADED"
    );

} catch (error) {

    console.warn(
        "ADMIN SHOP ORDERS ROUTE NOT LOADED:",
        error.message
    );

    adminShopOrdersRoutes = null;

}


// =====================================================
// PUBLIC SHOP
// =====================================================

try {

    shopRoutes =
        require("./routes/shop");

    console.log(
        "SHOP ROUTE LOADED"
    );

} catch (error) {

    console.error(
        "SHOP ROUTE LOAD ERROR:",
        error
    );

    throw error;

}


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


// =====================================================
// ADMIN SHOP
// =====================================================
//
// IMPORTANT:
//
// admin-shop.js contains:
//
// GET    /
// GET    /statistics
// GET    /stats
// GET    /categories
// POST   /categories
// PUT    /categories/:id
// GET    /products
// GET    /products/:id
// POST   /products
// PUT    /products/:id
// PUT    /products/:id/status
// PUT    /products/:id/stock
// DELETE /products/:id
// GET    /orders
//
// Therefore mounting:
//
// /api/admin/shop
//
// creates:
//
// /api/admin/shop
// /api/admin/shop/statistics
// /api/admin/shop/stats
// /api/admin/shop/categories
// /api/admin/shop/products
// /api/admin/shop/orders
//
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
    "ADMIN SHOP ROUTES MOUNTED"
);


// =====================================================
// OPTIONAL OLD ADMIN SHOP ORDERS ROUTE
// =====================================================
//
// IMPORTANT:
//
// We do NOT mount this because admin-shop.js already
// provides:
//
// GET /api/admin/shop/orders
//
// Mounting another router here can cause duplicate
// functionality or different authentication/query logic.
//
// If admin-shop-orders.js contains unique routes that
// you still need, we can merge them later safely.
//
// =====================================================


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

        return res.json({

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


            return res.json({

                success: true,

                database:
                    "Connected",

                server_time:
                    rows[0]?.server_time || null

            });

        }

        catch (error) {

            console.error(
                "DATABASE CHECK ERROR:",
                error
            );


            return res.status(500).json({

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
// ADMIN SHOP DEBUG ROUTE
// =====================================================
//
// This route is intentionally outside admin authentication
// so you can confirm the server itself is receiving the
// request.
//
// GET /api/admin/shop-test
//
// =====================================================

app.get(
    "/api/admin/shop-test",
    (req, res) => {

        return res.json({

            success: true,

            message:
                "ADMIN SHOP SERVER IS RUNNING",

            route:
                "/api/admin/shop",

            shop_routes: {

                root:
                    "GET /api/admin/shop",

                statistics:
                    "GET /api/admin/shop/statistics",

                stats:
                    "GET /api/admin/shop/stats",

                categories:
                    "GET /api/admin/shop/categories",

                products:
                    "GET /api/admin/shop/products",

                orders:
                    "GET /api/admin/shop/orders"

            }

        });

    }
);


// =====================================================
// API ROUTE DEBUG
// =====================================================

app.get(
    "/api/routes",
    (req, res) => {

        return res.json({

            success: true,

            routes: [

                "/api/health",

                "/api/database",

                "/api/auth",

                "/api/users",

                "/api/tasks",

                "/api/deposits",

                "/api/withdrawals",

                "/api/referral",

                "/api/levels",

                "/api/admin",

                "/api/admin/shop",

                "/api/admin/shop/statistics",

                "/api/admin/shop/stats",

                "/api/admin/shop/categories",

                "/api/admin/shop/products",

                "/api/admin/shop/orders",

                "/api/shop"

            ]

        });

    }
);


// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    (req, res) => {

        console.log(
            "===================================="
        );

        console.log(
            "404 ROUTE"
        );

        console.log(
            "METHOD:",
            req.method
        );

        console.log(
            "PATH:",
            req.originalUrl
        );

        console.log(
            "===================================="
        );


        return res.status(404).json({

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
            "METHOD:",
            req.method
        );

        console.error(
            "PATH:",
            req.originalUrl
        );

        console.error(
            err
        );

        console.error(
            "===================================="
        );


        if (res.headersSent) {

            return next(err);

        }


        return res.status(500).json({

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
            "HOST:",
            process.env.DB_HOST ||
            process.env.MYSQL_HOST ||
            "unknown"
        );

        console.log(
            "PORT:",
            process.env.DB_PORT ||
            process.env.MYSQL_PORT ||
            "unknown"
        );

        console.log(
            "USER:",
            process.env.DB_USER ||
            process.env.MYSQL_USER ||
            "unknown"
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


        // -------------------------------------------------
        // START EXPRESS
        // -------------------------------------------------

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
                    "===================================="
                );

                console.log(
                    "ADMIN SHOP:"
                );

                console.log(
                    "GET /api/admin/shop"
                );

                console.log(
                    "GET /api/admin/shop/statistics"
                );

                console.log(
                    "GET /api/admin/shop/stats"
                );

                console.log(
                    "GET /api/admin/shop/categories"
                );

                console.log(
                    "GET /api/admin/shop/products"
                );

                console.log(
                    "GET /api/admin/shop/orders"
                );

                console.log(
                    "===================================="
                );

                console.log(
                    "DEBUG:"
                );

                console.log(
                    "GET /api/admin/shop-test"
                );

                console.log(
                    "GET /api/routes"
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
// RUN SERVER
// =====================================================

startServer();
