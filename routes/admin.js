const express = require("express");
const router = express.Router();
const db = require("../config/db.js");

/* =========================
GET ALL USERS
========================= */
/* =========================
GET ALL USERS
========================= */
router.get("/users", async (req, res) => {
    try {

        const [users] = await db.query(`
            SELECT
                id,
                fullname,
                username,
                email,
                phone,
                balance,
                vip_level,
                referral_code,
                role,
                created_at,
                requested_level,
                account_status,
                task_status
            FROM users
            ORDER BY id DESC
        `);

        res.json({
            success: true,
            users
        });

    } catch (error) {

        console.error("GET USERS ERROR:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
});

/* =========================
GET VIP REQUESTS
========================= */
router.get("/level-requests", async (req, res) => {
try {

    const [requests] = await db.query(`
        SELECT
        id,
        username,
        vip_level AS current_level,
        requested_level
        FROM users
        WHERE requested_level IS NOT NULL
    `);

    res.json({
        success: true,
        requests
    });

} catch (error) {

    res.status(500).json({
        success: false,
        message: error.message
    });

}

});

/* =========================
APPROVE VIP REQUEST
========================= */
router.put("/levels/:id/approve", async (req, res) => {
    try {
        const userId = req.params.id;

        const [rows] = await db.query(
            "SELECT requested_level FROM users WHERE id=?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (rows[0].requested_level == null) {
            return res.status(400).json({
                success: false,
                message: "No pending VIP request."
            });
        }

        await db.query(
            `UPDATE users
             SET
                 vip_level = ?,
                               membership_level_id = ?,
                 requested_level = NULL,
                 account_status = 'approved'
             WHERE id = ?`,
            [
                rows[0].requested_level,
                rows[0].requested_level,
                userId
            ]
        );

        res.json({
            success: true,
            message: "VIP approved successfully."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/* =========================
REJECT VIP REQUEST
========================= */
router.put("/levels/:id/reject", async (req, res) => {
try {

    await db.query(`
        UPDATE users
         SET requested_level = NULL
         WHERE id=?`,
        [req.params.id]
    );

    res.json({
        success:true,
        message:"VIP request rejected"
    });

} catch(error){

    res.status(500).json({
        success:false,
        message:error.message
    });

}

});

/* =========================
TOGGLE TASK STATUS
========================= */
router.put("/tasks/:id/toggle", async (req, res) => {
try {

    const taskId = req.params.id;

    const [rows] = await db.query(
        "SELECT status FROM tasks WHERE id=?",
        [taskId]
    );

    if(rows.length === 0){
        return res.status(404).json({
            success:false,
            message:"Task not found"
        });
    }

    const newStatus =
        rows[0].status === "active"
        ? "inactive"
        : "active";

    await db.query(
        "UPDATE tasks SET status=? WHERE id=?",
        [newStatus, taskId]
    );

    res.json({
        success:true,
        status:newStatus,
        message:"Task updated"
    });

} catch(error){

    res.status(500).json({
        success:false,
        message:error.message
    });

}

});
/* =========================
GET REFERRAL STATS
========================= */
/* =========================
GET REFERRAL STATS
========================= */
router.get("/referrals/stats", async (req, res) => {

    try {

        const [total] = await db.query(`
            SELECT COUNT(*) total
            FROM users
            WHERE referred_by IS NOT NULL
        `);

        const [pending] = await db.query(`
            SELECT COUNT(*) total
            FROM referral_commissions
            WHERE status='Pending'
        `);

        const [paid] = await db.query(`
            SELECT COUNT(*) total
            FROM referral_commissions
            WHERE status='Paid'
        `);

        const [commission] = await db.query(`
            SELECT IFNULL(SUM(amount),0) total
            FROM referral_commissions
            WHERE status='Paid'
        `);

        res.json({

            success:true,

            total:total[0].total,

            approved:paid[0].total,

            pending:pending[0].total,

            rejected:0,

            commission:commission[0].total

        });

    } catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

});
/* =========================
GET ALL REFERRALS
========================= */

router.get("/referrals", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT

                u.id,
                u.fullname,
                u.username,
                u.created_at,

                IFNULL(rc.amount,0) AS commission,

                IFNULL(rc.status,'Pending') AS status

            FROM users u

            LEFT JOIN referrals r
                ON r.referred_user_id = u.id

            LEFT JOIN referral_commissions rc
                ON rc.referral_id = r.id

            WHERE u.referred_by IS NOT NULL

            ORDER BY u.created_at DESC
        `);

        const referrals = rows.map(row => ({

            id: row.id,

            fullname: row.fullname,

            username: row.username,

            commission: row.commission,

            status: row.status,

            created_at: row.created_at

        }));

        res.json({

            success: true,

            referrals

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

});
router.put("/referrals/:id/approve", async (req, res) => {

    try {

        const referredUserId = req.params.id;

        // Find referral
        const [referral] = await db.query(`
            SELECT *
            FROM referrals
            WHERE referred_user_id = ?
            LIMIT 1
        `, [referredUserId]);

        if (referral.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Referral record not found."

            });

        }

        // Find pending commission
        const [commission] = await db.query(`
            SELECT *
            FROM referral_commissions
            WHERE referral_id = ?
            AND status = 'Pending'
            LIMIT 1
        `, [referral[0].id]);

        if (commission.length === 0) {

            return res.status(400).json({

                success: false,

                message: "No pending commission found."

            });

        }

        // Add commission to wallet
        await db.query(`
            UPDATE users
            SET balance = balance + ?
            WHERE id = ?
        `, [

            commission[0].amount,

            referral[0].referrer_id

        ]);

        // Mark commission as Paid
        await db.query(`
            UPDATE referral_commissions
            SET status='Paid'
            WHERE id=?
        `, [

            commission[0].id

        ]);

        res.json({

            success: true,

            message: "Referral approved successfully."

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

});
router.put("/referrals/:id/reject", async (req, res) => {

    try {

        const referredUserId = req.params.id;

        // Find referral
        const [referral] = await db.query(`
            SELECT *
            FROM referrals
            WHERE referred_user_id = ?
            LIMIT 1
        `, [referredUserId]);

        if (referral.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Referral record not found."

            });

        }

        // Find pending commission
        const [commission] = await db.query(`
            SELECT *
            FROM referral_commissions
            WHERE referral_id = ?
            AND status = 'Pending'
            LIMIT 1
        `, [referral[0].id]);

        if (commission.length === 0) {

            return res.status(400).json({

                success: false,

                message: "No pending commission found."

            });

        }

        // Mark commission as Rejected
        await db.query(`
            UPDATE referral_commissions
            SET status='Rejected'
            WHERE id=?
        `, [

            commission[0].id

        ]);

        res.json({

            success: true,

            message: "Referral rejected successfully."

        });

    } catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

});

router.delete("/referrals/:id", async (req, res) => {

    try {

        await db.query(
            "UPDATE users SET referred_by=NULL WHERE id=?",
            [req.params.id]
        );

        res.json({
            success: true,
            message: "Referral removed."
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

});
/* =========================
   ACTIVATE / DEACTIVATE USER TASK ACCESS
========================= */

router.put("/users/:id/task-status", async (req, res) => {

    try {

        const userId = req.params.id;

        const { task_status } = req.body;


        // Validate status

        if (
            task_status !== "active" &&
            task_status !== "inactive"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Task status must be active or inactive."

            });

        }


        // Check user exists

        const [users] = await db.query(

            "SELECT id FROM users WHERE id=?",

            [userId]

        );


        if (users.length === 0) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }


        // Update task access

        await db.query(

            `
            UPDATE users
            SET task_status=?
            WHERE id=?
            `,

            [
                task_status,
                userId
            ]

        );


        res.json({

            success: true,

            task_status,

            message:

                task_status === "active"

                ? "Task access activated successfully."

                : "Task access deactivated successfully."

        });


    } catch (error) {


        console.error(

            "TASK STATUS UPDATE ERROR:",

            error

        );


        res.status(500).json({

            success: false,

            message:

                "Unable to update task access."

        });

    }

});

module.exports = router;
