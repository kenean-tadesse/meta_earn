const db = require("../config/db");

async function payReferralCommission(userId, amount) {
    try {

        const [users] = await db.query(
            "SELECT referred_by FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0 || !users[0].referred_by) {
            return;
        }

        const referrerId =
        users[0].referred_by;

        const commission =
        Number(amount) * 0.10;

        await db.query(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            [
                commission,
                referrerId
            ]
        );

        await db.query(
            "INSERT INTO referrals (referrer_id, referred_user_id, commission) VALUES (?, ?, ?)",
            [
                referrerId,
                userId,
                commission
            ]
        );

    } catch (error) {

        console.log(
            "Referral Error:",
            error.message
        );

    }
}

module.exports = payReferralCommission;
