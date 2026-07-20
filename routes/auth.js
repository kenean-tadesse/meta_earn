// ======================================================
// META_EARN ENTERPRISE AUTH ROUTES
// ======================================================

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

const db = require("../config/db.js");

console.log("AUTH ROUTE LOADED");


// ======================================================
// REGISTER
// POST /api/auth/register
// ======================================================

router.post("/register", async (req, res) => {

    try {

        // ==================================================
        // GET REGISTRATION DATA
        // ==================================================

        const {
            fullname,
            username,
            email,
            phone,
            password,
            referral_code
        } = req.body;


        // ==================================================
        // CLEAN DATA
        // ==================================================

        const cleanFullname =
            fullname
                ? fullname.trim()
                : "";

        const cleanUsername =
            username
                ? username.trim()
                : "";

        const cleanEmail =
            email
                ? email.trim().toLowerCase()
                : "";

        const cleanPhone =
            phone
                ? phone.trim()
                : "";

        const cleanPassword =
            password
                ? password
                : "";

        const cleanReferralCode =
            referral_code
                ? referral_code.trim()
                : "";


        // ==================================================
        // VALIDATION
        // ==================================================

        if (
            !cleanFullname ||
            !cleanUsername ||
            !cleanEmail ||
            !cleanPhone ||
            !cleanPassword
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill all required fields."

            });

        }


        // ==================================================
        // PHONE VALIDATION
        // ==================================================

        const phonePattern =
            /^[+]?[0-9\s()-]{9,20}$/;


        if (
            !phonePattern.test(cleanPhone)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid phone number."

            });

        }


        // ==================================================
        // PASSWORD VALIDATION
        // ==================================================

        if (
            cleanPassword.length < 6
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must be at least 6 characters."

            });

        }


        // ==================================================
        // CHECK USERNAME, EMAIL OR PHONE
        // ==================================================

        const [existing] =
            await db.query(

                `SELECT
                    id,
                    username,
                    email,
                    phone
                 FROM users
                 WHERE username=?
                    OR email=?
                    OR phone=?`,

                [
                    cleanUsername,
                    cleanEmail,
                    cleanPhone
                ]

            );


        // ==================================================
        // CHECK DUPLICATE ACCOUNT
        // ==================================================

        if (
            existing.length > 0
        ) {

            const existingUser =
                existing[0];


            if (
                existingUser.username ===
                cleanUsername
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Username already exists."

                });

            }


            if (
                existingUser.email ===
                cleanEmail
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Email already exists."

                });

            }


            if (
                existingUser.phone ===
                cleanPhone
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Phone number already exists."

                });

            }


            return res.status(409).json({

                success: false,

                message:
                    "Username, email or phone number already exists."

            });

        }


        // ==================================================
        // HASH PASSWORD
        // ==================================================

        const hashedPassword =
            await bcrypt.hash(

                cleanPassword,

                12

            );


        // ==================================================
        // REFERRAL
        // ==================================================

        console.log(

            "Referral received from frontend:",

            cleanReferralCode

        );


        let referredBy = null;


        if (
            cleanReferralCode !== ""
        ) {

            const [referrer] =
                await db.query(

                    `SELECT
                        referral_code
                     FROM users
                     WHERE referral_code=?`,

                    [
                        cleanReferralCode
                    ]

                );


            console.log(

                "Referrer found:",

                referrer

            );


            if (
                referrer.length > 0
            ) {

                referredBy =
                    referrer[0].referral_code;

            }

        }


        console.log(

            "Final referredBy:",

            referredBy

        );


        // ==================================================
        // GENERATE REFERRAL CODE
        // ==================================================

        const myReferralCode =

            "META" +

            Math.floor(

                100000 +

                Math.random() *

                900000

            );


        // ==================================================
        // CREATE USER ACCOUNT
        // ==================================================

        console.log(

            "Referral received:",

            cleanReferralCode

        );

        console.log(

            "Referred by:",

            referredBy

        );


        const [result] =

            await db.query(

                `INSERT INTO users
                (
                    fullname,
                    username,
                    email,
                    phone,
                    password,
                    referral_code,
                    referred_by,
                    role,
                    status,
                    balance,
                    vip_level
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'user',
                    'active',
                    0,
                    1
                )`,

                [
                    cleanFullname,
                    cleanUsername,
                    cleanEmail,
                    cleanPhone,
                    hashedPassword,
                    myReferralCode,
                    referredBy
                ]

            );


        const newUserId =

            result.insertId;


        // ==================================================
        // CREATE REFERRAL RECORD
        // ==================================================

        if (
            referredBy
        ) {


            // ==============================================
            // FIND REFERRER
            // ==============================================

            const [referrer] =

                await db.query(

                    `SELECT
                        id
                     FROM users
                     WHERE referral_code=?`,

                    [
                        referredBy
                    ]

                );


            if (
                referrer.length > 0
            ) {


                const referrerId =

                    referrer[0].id;


                // ==========================================
                // CREATE REFERRAL RECORD
                // ==========================================

                const [referral] =

                    await db.query(

                        `INSERT INTO referrals
                        (
                            referrer_id,
                            referred_user_id,
                            commission
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            100
                        )`,

                        [
                            referrerId,
                            newUserId
                        ]

                    );


                // ==========================================
                // CREATE PENDING COMMISSION
                // ==========================================

                await db.query(

                    `INSERT INTO referral_commissions
                    (
                        referral_id,
                        referred_user_id,
                        amount,
                        description,
                        status
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        100,
                        ?,
                        'Pending'
                    )`,

                    [
                        referral.insertId,

                        newUserId,

                        `Referral bonus for ${cleanUsername}`

                    ]

                );

            }

        }


        // ==================================================
        // REGISTRATION SUCCESS
        // ==================================================

        return res.status(201).json({

            success: true,

            message:
                "Registration completed successfully."

        });


    }

    catch (error) {


        console.error(

            "REGISTER ERROR:",

            error

        );


        return res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }

});



// ======================================================
// LOGIN
// POST /api/auth/login
// ======================================================
// Login supports:
// 1. Username
// 2. Email
// 3. Phone number
// ======================================================

router.post("/login", async (req, res) => {

    try {


        // ==================================================
        // GET LOGIN DATA
        // ==================================================

        const {
            username,
            password
        } = req.body;


        // ==================================================
        // CLEAN LOGIN INPUT
        // ==================================================

        const loginInput =

            username

                ? username.trim()

                : "";


        // ==================================================
        // VALIDATION
        // ==================================================

        if (
            !loginInput ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Username, email or phone number and password are required."

            });

        }


        // ==================================================
        // FIND USER
        // USERNAME OR EMAIL OR PHONE
        // ==================================================

        const [users] =

            await db.query(

                `SELECT
                    id,
                    fullname,
                    username,
                    email,
                    phone,
                    password,
                    role,
                    status,
                    balance,
                    vip_level,
                    referral_code
                 FROM users
                 WHERE username=?
                    OR email=?
                    OR phone=?`,

                [
                    loginInput,
                    loginInput,
                    loginInput
                ]

            );


        // ==================================================
        // USER NOT FOUND
        // ==================================================

        if (
            users.length === 0
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid username, email, phone number or password."

            });

        }


        // ==================================================
        // GET USER
        // ==================================================

        const user =

            users[0];


        // ==================================================
        // CHECK ACCOUNT STATUS
        // ==================================================

        if (
            user.status !== "active"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account has been disabled."

            });

        }


        // ==================================================
        // VERIFY PASSWORD
        // ==================================================

        const validPassword =

            await bcrypt.compare(

                password,

                user.password

            );


        if (
            !validPassword
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid username, email, phone number or password."

            });

        }


        // ==================================================
        // GENERATE JWT
        // ==================================================

        const token =

            jwt.sign(

                {

                    id:
                        user.id,

                    username:
                        user.username,

                    role:
                        user.role

                },

                process.env.JWT_SECRET ||

                    "MetaEarnSuperSecret2026",

                {

                    expiresIn:
                        "7d"

                }

            );


        // ==================================================
        // UPDATE LAST LOGIN
        // ==================================================

        await db.query(

            "UPDATE users SET last_login=NOW() WHERE id=?",

            [
                user.id
            ]

        );


        // ==================================================
        // LOGIN SUCCESS
        // ==================================================

        return res.json({

            success: true,

            message:
                "Login successful.",

            token,


            user: {

                id:
                    user.id,

                fullname:
                    user.fullname,

                username:
                    user.username,

                email:
                    user.email,

                phone:
                    user.phone,

                role:
                    user.role,

                balance:
                    user.balance,

                vip_level:
                    user.vip_level,

                referral_code:
                    user.referral_code

            }

        });


    }

    catch (error) {


        console.error(

            "LOGIN ERROR:",

            error

        );


        return res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }

});



// ======================================================
// VERIFY TOKEN
// GET /api/auth/verify
// ======================================================

router.get("/verify", async (req, res) => {

    try {


        const authHeader =

            req.headers.authorization;


        if (
            !authHeader
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "No token provided."

            });

        }


        const token =

            authHeader.replace(

                "Bearer ",

                ""

            );


        const decoded =

            jwt.verify(

                token,

                process.env.JWT_SECRET ||

                    "MetaEarnSuperSecret2026"

            );


        return res.json({

            success: true,

            user:
                decoded

        });


    }

    catch (error) {


        return res.status(401).json({

            success: false,

            message:
                "Invalid or expired token."

        });

    }

});



// ======================================================
// PROFILE
// GET /api/auth/profile
// ======================================================

router.get("/profile", async (req, res) => {

    try {


        const authHeader =

            req.headers.authorization;


        if (
            !authHeader
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized."

            });

        }


        const token =

            authHeader.replace(

                "Bearer ",

                ""

            );


        const decoded =

            jwt.verify(

                token,

                process.env.JWT_SECRET ||

                    "MetaEarnSuperSecret2026"

            );


        // ==================================================
        // GET USER PROFILE
        // ==================================================

        const [users] =

            await db.query(

                `SELECT
                    id,
                    fullname,
                    username,
                    email,
                    phone,
                    balance,
                    vip_level,
                    referral_code,
                    role,
                    status,
                    created_at,
                    last_login
                 FROM users
                 WHERE id=?`,

                [
                    decoded.id
                ]

            );


        if (
            users.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "User not found."

            });

        }


        return res.json({

            success: true,

            user:
                users[0]

        });


    }

    catch (error) {


        console.error(

            "PROFILE ERROR:",

            error

        );


        return res.status(401).json({

            success: false,

            message:
                "Invalid or expired token."

        });

    }

});



// ======================================================
// CHANGE PASSWORD
// PUT /api/auth/change-password
// ======================================================

router.put(

    "/change-password",

    async (req, res) => {

        try {


            const authHeader =

                req.headers.authorization;


            if (
                !authHeader
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Unauthorized."

                });

            }


            const token =

                authHeader.replace(

                    "Bearer ",

                    ""

                );


            const decoded =

                jwt.verify(

                    token,

                    process.env.JWT_SECRET ||

                        "MetaEarnSuperSecret2026"

                );


            const {

                currentPassword,

                newPassword

            } = req.body;


            // ============================================
            // VALIDATION
            // ============================================

            if (
                !currentPassword ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter both passwords."

                });

            }


            if (
                newPassword.length < 6
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must be at least 6 characters."

                });

            }


            // ============================================
            // GET CURRENT PASSWORD
            // ============================================

            const [users] =

                await db.query(

                    "SELECT password FROM users WHERE id=?",

                    [
                        decoded.id
                    ]

                );


            if (
                users.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            // ============================================
            // CHECK CURRENT PASSWORD
            // ============================================

            const match =

                await bcrypt.compare(

                    currentPassword,

                    users[0].password

                );


            if (
                !match
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Current password is incorrect."

                });

            }


            // ============================================
            // HASH NEW PASSWORD
            // ============================================

            const hash =

                await bcrypt.hash(

                    newPassword,

                    12

                );


            // ============================================
            // UPDATE PASSWORD
            // ============================================

            await db.query(

                "UPDATE users SET password=? WHERE id=?",

                [

                    hash,

                    decoded.id

                ]

            );


            return res.json({

                success: true,

                message:
                    "Password changed successfully."

            });


        }

        catch (error) {


            console.error(

                "CHANGE PASSWORD ERROR:",

                error

            );


            return res.status(500).json({

                success: false,

                message:
                    "Internal server error."

            });

        }

    }

);



// ======================================================
// LOGOUT
// POST /api/auth/logout
// ======================================================

router.post(

    "/logout",

    (req, res) => {


        return res.json({

            success: true,

            message:
                "Logout successful."

        });

    }

);



// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;