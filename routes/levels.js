const express = require("express");
const router = express.Router();
const db = require("../config/db.js");

/* =====================================
   GET ALL MEMBERSHIP LEVELS
===================================== */
router.get("/", async (req, res) => {
    try {

        const [levels] = await db.query(
            "SELECT * FROM membership_levels ORDER BY id ASC"
        );

        res.json({
            success: true,
            levels
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
});

/* =====================================
   REQUEST VIP LEVEL CHANGE
===================================== */
router.post("/request", async (req, res) => {

    try {

        const { userId, levelId } = req.body;

        const [user] = await db.query(
            "SELECT membership_level_id, requested_level FROM users WHERE id=?",
            [userId]
        );

        if (user.length === 0) {
            return res.json({
                success: false,
                message: "User not found."
            });
        }

        // Already has a pending request
        if (user[0].requested_level !== null) {
            return res.json({
                success: false,
                message: "You already have a pending VIP request."
            });
        }

        // Already owns this VIP
        if (Number(user[0].membership_level_id) === Number(levelId)) {
            return res.json({
                success: false,
                message: "You already own this VIP."
            });
        }

        await db.query(
            "UPDATE users SET requested_level=? WHERE id=?",
            [levelId, userId]
        );

        res.json({
            success: true,
            message: "VIP request submitted successfully."
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Server error."
        });

    }

});

/* =====================================
   GET USER LEVEL
===================================== */
router.get("/user/:id", async (req, res) => {
    try {

        const [user] = await db.query(
            "SELECT id, username, membership_level_id, requested_level FROM users WHERE id = ?",
            [req.params.id]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: user[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
});
module.exports = router;

module.exports = router;