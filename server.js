require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const referralRoutes = require("./routes/referral.js");
const db = require("./config/db.js");
const auth = require("./middleware/auth");

const app = express();
const router = express.Router();


// ======================================================
// STATIC FILES
// ======================================================

app.use(express.static("public"));


// ======================================================
// MIDDLEWARE FIRST
// ======================================================

console.log("SERVER STARTED - NEW VERSION");


// ======================================================
// CORS CONFIGURATION
// ======================================================

const allowedOrigins = [

    // Local Development
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",

    // Client Frontend
    "https://meta-earn-full.onrender.com",

    // User Frontend
    "https://meta-earn-admin.onrender.com",

    // Admin Frontend
    "https://meta-earn-admin-1yum.onrender.com"
];


app.use(cors({

    origin: function (origin, callback) {

        // Allow requests with no origin
        // Example: Postman or server-to-server requests
        if (!origin) {

            return callback(null, true);

        }


        // Check if origin is allowed
        if (allowedOrigins.includes(origin)) {

            return callback(null, true);

        }


        // Log blocked origins
        console.log("CORS BLOCKED ORIGIN:", origin);


        // Do not crash the server
        return callback(null, false);

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


// IMPORTANT:
// DO NOT USE app.options("*", cors()) HERE
// Express 5 throws PathError for wildcard "*"


// ======================================================
// BODY PARSER
// ======================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ======================================================
// REQUEST LOGGER
// ======================================================

app.use((req, res, next) => {

    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
    );

    next();

});


// ======================================================
// STATIC FILES
// ======================================================

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


// ======================================================
// IMPORT ROUTES
// ======================================================

const usersRoutes = require("./routes/users");
const levelRoutes = require("./routes/levels");
const adminRoutes = require("./routes/admin");


// ======================================================
// API ROUTES
// ======================================================


// AUTH ROUTES
app.use(
    "/api/auth",
    require("./routes/auth")
);


// USERS ROUTES
app.use(
    "/api/users",
    require("./routes/users")
);


// TASK ROUTES
app.use(
    "/api/tasks",
    require("./routes/tasks")
);


// DEPOSIT ROUTES
app.use(
    "/api/deposits",
    require("./routes/deposits")
);


// WITHDRAWAL ROUTES
app.use(
    "/api/withdrawals",
    require("./routes/withdrawals")
);


// REFERRAL ROUTES
// Registered only once
app.use(
    "/api/referral",
    referralRoutes
);


// LEVEL ROUTES
app.use(
    "/api/levels",
    levelRoutes
);


// ADMIN ROUTES
app.use(
    "/api/admin",
    adminRoutes
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            status: "OK",

            uptime: process.uptime(),

            memory: process.memoryUsage(),

            timestamp: new Date().toISOString()

        });

    }
);


// ======================================================
// DATABASE CHECK
// ======================================================

app.get(
    "/api/database",
    async (req, res) => {

        try {

            const [rows] = await db.query(
                "SELECT NOW() AS server_time"
            );


            res.json({

                success: true,

                database: "Connected",

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

                database: "Disconnected",

                error: error.message

            });

        }

    }
);


// ======================================================
// 404 HANDLER
// ======================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message: "Route not found"

        });

    }
);


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

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


// ======================================================
// START SERVER
// ======================================================

const PORT =
    process.env.PORT || 5000;


async function startServer() {

    try {

        // Test database connection
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


        // Start Express server
        app.listen(
            PORT,
            () => {

                console.log(
                    `Server running on port ${PORT}`
                );

            }
        );

    }

    catch (error) {

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


startServer();
