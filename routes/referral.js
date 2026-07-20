const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

// ===============================
// GET MY REFERRAL LINK
// ===============================
router.get("/my-link", auth, async (req, res) => {
    try {

        const userId = req.user.id;

        const [rows] = await db.query(
            "SELECT referral_code FROM users WHERE id = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        let referralCode = rows[0].referral_code;

        // Generate referral code if missing
        if (!referralCode) {

            referralCode =
                "ME" +
                Math.random().toString(36).substring(2, 8).toUpperCase();

            await db.query(
                "UPDATE users SET referral_code=? WHERE id=?",
                [referralCode, userId]
            );
        }

const BASE_URL =
process.env.CLIENT_URL ||
"http://localhost:5500/public/client";

const link =
`${BASE_URL}/index.html?ref=${referralCode}`;

        res.json({
            success: true,
            code: referralCode,
            link
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// ===============================
// REFERRAL STATS
// ===============================
// ===============================
// REFERRAL STATS
// ===============================
router.get("/stats", auth, async (req, res) => {

    try {

        const userId = req.user.id;

        // user balance
        const [user] = await db.query(
            `
            SELECT balance, referral_code
            FROM users
            WHERE id=?
            `,
            [userId]
        );

        // direct referrals
        const [direct] = await db.query(
            `
            SELECT COUNT(*) total
            FROM users
            WHERE referred_by=?
            `,
            [user[0].referral_code]
        );

        // total commission (Paid + Pending)
        const [earning] = await db.query(
            `
            SELECT IFNULL(SUM(rc.amount),0) total
            FROM referral_commissions rc
            JOIN referrals r
            ON rc.referral_id=r.id
            WHERE r.referrer_id=?
            `,
            [userId]
        );

        // paid commission only
        const [walletCommission] = await db.query(
            `
            SELECT IFNULL(SUM(rc.amount),0) total
            FROM referral_commissions rc
            JOIN referrals r
            ON rc.referral_id=r.id
            WHERE
            r.referrer_id=?
            AND rc.status='Paid'
            `,
            [userId]
        );

        res.json({

            success:true,

            wallet:user[0].balance,

            earnings:earning[0].total,

            commission:walletCommission[0].total,

            direct:direct[0].total,

            team:direct[0].total

        });

    } catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

});

// ===============================
// REFERRAL LIST
// ===============================
// ===============================
// REFERRAL LIST
// ===============================
router.get("/list", auth, async (req, res) => {

    try {

        const userId = req.user.id;

        const [user] = await db.query(
            "SELECT referral_code FROM users WHERE id=?",
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success:false,
                message:"User not found"
            });
        }

        const referralCode = user[0].referral_code;

        const [rows] = await db.query(

        `
        SELECT
            fullname,
            username,
            created_at
        FROM users
        WHERE referred_by=?
        ORDER BY created_at DESC
        `,
        [referralCode]

        );

        const referrals = rows.map(r => ({
            fullname:r.fullname,
            username:r.username,
            created_at:r.created_at,
            commission:0,
            status:"Active"
        }));

        res.json({
            success:true,
            referrals
        });

    } catch(err){

        console.error("REFERRAL LIST ERROR:");
        console.error(err);

        res.status(500).json({
            success:false,
            message:err.message
        });

    }

});
module.exports = router;