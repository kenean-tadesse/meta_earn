const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const db = require("../config/db.js");
const payReferralCommission = require("../utils/referralCommission");

// ==============================
// AUTH MIDDLEWARE
// ==============================
function auth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const token = authHeader.replace("Bearer ", "");

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "MetaEarnSuperSecret2026"
        );

        req.user = decoded;
        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });

    }
}

// ==============================
// GET USER VIP TASKS
// ==============================
router.get("/", auth, async (req, res) => {

    try {

        const [users] = await db.query(
            "SELECT vip_level FROM users WHERE id=?",
            [req.user.id]
        );

        if (users.length === 0) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        }

        const vipLevel = users[0].vip_level;

        const [tasks] = await db.query(
            `SELECT
                id,
                title,
                description,
                commission,
                required_vip,
                status
             FROM tasks
             WHERE status='active'
             AND required_vip<=?
             ORDER BY id ASC`,
            [vipLevel]
        );

        const [completedToday] = await db.query(
            `SELECT task_id
             FROM user_daily_tasks
             WHERE user_id = ?
               AND completed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
            [req.user.id]
        );

        const completedTasks = completedToday.map(row => row.task_id);

    res.json({
    success: true,
    vip_level: vipLevel,
    tasks,
    completedTasks
});

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Unable to load tasks"
        });

    }

});

// ==============================
// REQUEST VIP UPGRADE
// ==============================
router.post("/vip-request", auth, async (req, res) => {

    try {

        const { vip_level } = req.body;

        if (!vip_level) {

            return res.json({
                success: false,
                message: "Select a VIP level."
            });

        }

        const [user] = await db.query(
            "SELECT requested_level,vip_level FROM users WHERE id=?",
            [req.user.id]
        );

        if (user[0].requested_level != null) {

            return res.json({
                success: false,
                message: "You already have a pending VIP request."
            });

        }

        if (Number(user[0].vip_level) >= Number(vip_level)) {

            return res.json({
                success: false,
                message: "You already own this VIP."
            });

        }

        await db.query(
            `UPDATE users
             SET requested_level=?,
                 account_status='pending'
             WHERE id=?`,
            [vip_level, req.user.id]
        );

        res.json({

            success: true,
            message: "VIP request submitted successfully. Please wait for admin approval."

        });

    } catch (error) {
        console.error("VIP Request Error:");
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }

});
// ==============================
// COMPLETE TASK
// ==============================
router.post("/complete/:id", auth, async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
//
const [rows]=await db.query(
"SELECT task_status FROM users WHERE id=?",
[req.user.id]
);

if(rows[0].task_status==="inactive"){
    return res.status(403).json({
        success:false,
        message:"Your task access is inactive."
    });
}
        // Get task
        const [tasks] = await db.query(
            `SELECT * FROM tasks
             WHERE id=? AND status='active'`,
            [taskId]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        const task = tasks[0];

        // Get user
        const [users] = await db.query(
            `SELECT id, vip_level, balance
             FROM users
             WHERE id=?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const user = users[0];

        // Check VIP level
        if (user.vip_level < task.required_vip) {
            return res.status(403).json({
                success: false,
                message: "Your VIP level is too low."
            });
        }

        // Check today's completion
       // Check whether this user has completed this task in the last 24 hours
const [daily] = await db.query(
    `SELECT id
     FROM user_daily_tasks
     WHERE user_id = ?
       AND task_id = ?
       AND completed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
    [req.user.id, taskId]
);

if (daily.length > 0) {
    return res.json({
        success: false,
        message: "Task already completed. Try again tomorrow."
    });
}

// Save today's completion
await db.query(
    `INSERT INTO user_daily_tasks
    (user_id, task_id, completed, reward_paid, completed_at)
    VALUES (?, ?, 1, 1, NOW())`,
    [req.user.id, taskId]
);

        // Save order
        await db.query(
            `INSERT INTO orders
            (user_id, task_id, commission, status)
            VALUES (?, ?, ?, 'completed')`,
            [req.user.id, task.id, task.commission]
        );

        // Update balance
        await db.query(
            `UPDATE users
             SET balance = balance + ?
             WHERE id=?`,
            [task.commission, req.user.id]
        );

        await payReferralCommission(
            req.user.id,
            task.commission
        );

        const [wallet] = await db.query(
            "SELECT balance FROM users WHERE id=?",
            [req.user.id]
        );

        return res.json({
            success: true,
            reward: task.commission,
            balance: wallet[0].balance,
            message: "Task completed successfully."
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error."
        });
    }
});
// ==============================
// TELEGRAM TASK SUBMISSION
// ==============================
router.post("/telegram-submit", auth, async (req, res) => {
    try {

        const { username, members } = req.body;

        if (!username || !members) {
            return res.status(400).json({
                success: false,
                message: "Please provide Telegram username and member count."
            });
        }

        await db.query(
            `INSERT INTO telegram_tasks
            (user_id, username, members, status)
            VALUES (?, ?, ?, 'pending')`,
            [req.user.id, username, members]
        );

        res.json({
            success: true,
            message: "Telegram task submitted successfully. Waiting for admin approval."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error."
        });

    }
});


// ==============================
// FEEDBACK SUBMISSION
// ==============================
router.post("/feedback", auth, async (req, res) => {

    try {

        const { text } = req.body;

        if (!text || text.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Feedback is required."
            });
        }

        const [today] = await db.query(
            `SELECT id
             FROM feedback
             WHERE user_id=?
             AND DATE(created_at)=CURDATE()`,
            [req.user.id]
        );

        if (today.length >= 2) {
            return res.json({
                success: false,
                message: "You have reached today's feedback limit."
            });
        }

        await db.query(
            `INSERT INTO feedback
            (user_id,text,status)
            VALUES (?, ?, 'approved')`,
            [req.user.id, text]
        );

        await db.query(
            "UPDATE users SET balance=balance+10 WHERE id=?",
            [req.user.id]
        );

        const [wallet] = await db.query(
            "SELECT balance FROM users WHERE id=?",
            [req.user.id]
        );

        res.json({
            success: true,
            reward: 10,
            balance: wallet[0].balance,
            message: "Thank you! 10 ETB has been added to your wallet."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error."
        });

    }

});


// ==============================
// ORDER HISTORY
// ==============================
router.get("/orders/history", auth, async (req, res) => {

    try {

        const [orders] = await db.query(
            `SELECT
                orders.id,
                tasks.title,
                orders.commission,
                orders.status,
                orders.created_at
            FROM orders
            JOIN tasks
            ON tasks.id = orders.task_id
            WHERE orders.user_id=?
            ORDER BY orders.created_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            orders
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Unable to load order history."
        });

    }

});
// ==============================
// ADMIN CREATE TASK
// ==============================
router.post("/admin/create", auth, async (req, res) => {
    try {

        const [admin] = await db.query(
            "SELECT role FROM users WHERE id=?",
            [req.user.id]
        );

        if (admin.length === 0 || admin[0].role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access only."
            });
        }

        const {
            title,
            description,
            commission,
            required_vip
        } = req.body;

        await db.query(
            `INSERT INTO tasks
            (title, description, commission, required_vip, status)
            VALUES (?, ?, ?, ?, 'active')`,
            [
                title,
                description,
                commission,
                required_vip
            ]
        );

        res.json({
            success: true,
            message: "Task created successfully."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Unable to create task."
        });

    }
});


// ==============================
// ADMIN UPDATE TASK
// ==============================
router.put("/admin/update/:id", auth, async (req, res) => {

    try {

        const [admin] = await db.query(
            "SELECT role FROM users WHERE id=?",
            [req.user.id]
        );

        if (admin.length === 0 || admin[0].role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access only."
            });
        }

        const {
            title,
            description,
            commission,
            required_vip,
            status
        } = req.body;

        await db.query(
            `UPDATE tasks
             SET
             title=?,
             description=?,
             commission=?,
             required_vip=?,
             status=?
             WHERE id=?`,
            [
                title,
                description,
                commission,
                required_vip,
                status,
                req.params.id
            ]
        );

        res.json({
            success: true,
            message: "Task updated successfully."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Unable to update task."
        });

    }

});


// ==============================
// ADMIN DELETE TASK
// ==============================
router.delete("/admin/delete/:id", auth, async (req, res) => {

    try {

        const [admin] = await db.query(
            "SELECT role FROM users WHERE id=?",
            [req.user.id]
        );

        if (admin.length === 0 || admin[0].role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access only."
            });
        }

        await db.query(
            "DELETE FROM tasks WHERE id=?",
            [req.params.id]
        );

        res.json({
            success: true,
            message: "Task deleted successfully."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Unable to delete task."
        });

    }

});


// ==============================
// ADMIN TOGGLE TASK STATUS
// ==============================
router.put("/admin/toggle/:id", auth, async (req, res) => {

    try {

        const [admin] = await db.query(
            "SELECT role FROM users WHERE id=?",
            [req.user.id]
        );

        if (admin.length === 0 || admin[0].role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access only."
            });
        }
        const [rows] = await db.query(
            "SELECT status FROM tasks WHERE id=?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        const newStatus =
            rows[0].status === "active"
                ? "inactive"
                : "active";

        await db.query(
            "UPDATE tasks SET status=? WHERE id=?",
            [newStatus, req.params.id]
        );

        res.json({
            success: true,
            status: newStatus,
            message: "Task status updated."
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error."
        });

    }

});

// ==============================
// ADMIN GET ALL TASKS
// ==============================
router.get("/admin/all", auth, async (req, res) => {

    try {

        const [admin] = await db.query(
            "SELECT role FROM users WHERE id=?",
            [req.user.id]
        );

        if (admin.length === 0 || admin[0].role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access only."
            });
        }

        const [tasks] = await db.query(`
            SELECT
                id,
                title,
                description,
                commission,
                required_vip,
                status
            FROM tasks
            ORDER BY id DESC
        `);

        res.json({
            success: true,
            tasks
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Unable to load tasks."
        });

    }

});
// ==============================
// EXPORT ROUTER
// ==============================
module.exports = router;