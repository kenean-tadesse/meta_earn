const express = require("express");
const router = express.Router();
const db = require("../config/db.js");
const auth = require("../middleware/auth");


// ==============================
// CREATE WITHDRAWAL
// ==============================
router.post("/", auth, async (req, res) => {

    try {

        const { amount, bank_name, bank_account } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal amount"
            });
        }

        // Check user balance
        const [users] = await db.query(
            "SELECT balance FROM users WHERE id=?",
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const balance = Number(users[0].balance);

        if (balance < Number(amount)) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance"
            });
        }


        // Save withdrawal as pending
        await db.query(
            "INSERT INTO withdrawals (user_id, amount, bank_name, bank_account, status) VALUES (?, ?, ?, ?, 'pending')",
            [
                req.user.id,
                amount,
                bank_name,
                bank_account
            ]
        );

        // Subtract balance immediately
        

        const [updatedUser] = await db.query(
            "SELECT balance FROM users WHERE id=?",
            [req.user.id]
        );

        res.json({
            success: true,
            message: "Withdrawal submitted. Waiting for admin approval.",
        
        });


    } catch (error) {

        console.log("WITHDRAW ERROR:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// ==============================
// ADMIN APPROVE WITHDRAWAL
// ==============================
router.put("/approve/:id", auth, async (req, res) => {

    try {

        const withdrawalId = req.params.id;

        const [rows] = await db.query(
            "SELECT * FROM withdrawals WHERE id=?",
            [withdrawalId]
        );

        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Withdrawal not found"
            });

        }

        const withdrawal = rows[0];

        if (withdrawal.status === "approved") {

            return res.status(400).json({
                success: false,
                message: "Already approved"
            });

        }

        await db.query(
            "UPDATE withdrawals SET status='approved' WHERE id=?",
            [withdrawalId]
        );

        await db.query(
            "UPDATE users SET balance = balance - ? WHERE id=?",
            [withdrawal.amount, withdrawal.user_id]
        );

        res.json({
            success: true,
            message: "Withdrawal approved successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});
// status code
router.get("/history", auth, async (req, res) => {

    const [rows] = await db.query(
        "SELECT * FROM withdrawals WHERE user_id=? ORDER BY id DESC LIMIT 1",
        [req.user.id]
    );

    res.json({
        success: true,
        withdrawal: rows[0]
    });

});


// reject withdrawal
router.put("/reject/:id", auth, async (req, res) => {

    try {

        await db.query(
            "UPDATE withdrawals SET status='rejected' WHERE id=?",
            [req.params.id]
        );

        res.json({
            success: true,
            message: "Withdrawal rejected"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

router.get("/", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT w.*, u.username FROM withdrawals w LEFT JOIN users u ON w.user_id = u.id ORDER BY w.id DESC"
        );

        res.json({
            success: true,
            withdrawals: rows
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


module.exports = router;