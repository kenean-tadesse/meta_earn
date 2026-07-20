/* =========================================================
    META_EARN - DEPOSITS ROUTE (HTML COMPATIBLE VERSION)
========================================================= */

const express = require("express");
const router = express.Router();
const db = require("../config/db.js");

// ===============================
// CREATE DEPOSIT (FROM YOUR HTML)
// ===============================
router.post("/", async (req, res) => {
    try {
        const { username, amount, method } = req.body;

        // ===============================
        // VALIDATION
        // ===============================
        if (!username || !amount) {
            return res.status(400).json({
                success: false,
                message: "Username and amount are required"
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            });
        }

        // ===============================
        // CHECK USER EXISTS
        // ===============================
        const [users] = await db.query(
            "SELECT * FROM users WHERE username = ?",
            [username]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = users[0];

        // ===============================
        // INSERT DEPOSIT
        // ===============================
        const [result] = await db.query(
            "INSERT INTO deposits (user_id, username, amount, status, created_at) VALUES (?, ?, ?, 'pending', NOW())",
            [user.id, user.username, amount]
        );

        res.json({
            success: true,
            message: "Deposit submitted successfully",
            depositId: result.insertId,
            user: {
                id: user.id,
                username: user.username
            }
        });

    } catch (error) {
        console.error("Deposit Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// ===============================
// GET ALL DEPOSITS (ADMIN)
// ===============================
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT d.*, u.username FROM deposits d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC"
        );

        res.json({
            success: true,
            deposits: rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// ===============================
// APPROVE DEPOSIT
// ===============================
router.put("/approve/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            "SELECT * FROM deposits WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Deposit not found"
            });
        }

        const deposit = rows[0];

        if (deposit.status === "approved") {
            return res.status(400).json({
                success: false,
                message: "Already approved"
            });
        }

        // Update deposit
        await db.query(
            "UPDATE deposits SET status = 'approved' WHERE id = ?",
            [id]
        );

        // Add balance to user
        await db.query(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            [deposit.amount, deposit.user_id]
        );

        res.json({
            success: true,
            message: "Deposit approved and balance updated"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

// ===============================
// REJECT DEPOSIT
// ===============================
router.put("/reject/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            "SELECT * FROM deposits WHERE id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Deposit not found"
            });
        }

        await db.query(
            "UPDATE deposits SET status = 'rejected' WHERE id = ?",
            [id]
        );

        res.json({
            success: true,
            message: "Deposit rejected"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

module.exports = router;