const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();
const db = require("../config/db");

// REGISTER
router.get("/register", (req, res) => {
    res.send("Register route exists. Use POST request.");
});
router.post("/register", async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            referral_code
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const [existingUser] = await db.query(
            "SELECT id FROM users WHERE username=? OR email=?",
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Username or email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let referredBy = null;

        if (referral_code) {
            const [referrer] = await db.query(
                "SELECT id FROM users WHERE referral_code=?",
                [referral_code]
            );

            if (referrer.length > 0) {
                referredBy = referrer[0].id;
            }
        }

        const myReferralCode =
            "META" +
            Math.floor(100000 + Math.random() * 900000);

        await db.query(
            `INSERT INTO users (
                username,
                email,
                password,
                referral_code,
                referred_by
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                username,
                email,
                hashedPassword,
                myReferralCode,
                referredBy
            ]
        );

        res.status(201).json({
            success: true,
            message: "Account created successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password required"
            });
        }

        const [users] = await db.query(
            "SELECT * FROM users WHERE username=?",
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const user = users[0];

        const match = await bcrypt.compare(
            password,
            user.password
        );

        if (!match) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                vip_level: user.vip_level,
                referral_code: user.referral_code,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;