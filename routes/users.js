// ==========================================
// ADMIN AUTHORIZATION
// ==========================================
const express = require("express");
const router = express.Router();

const db = require("../config/db.js");
const auth = require("../middleware/auth");
async function adminOnly(req, res, next) {

    try {

        const [rows] = await db.query(
            "SELECT role FROM users WHERE id=?",
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (rows[0].role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }

        next();

    } catch (err) {

        return res.status(500).json({
            success: false,
            error: err.message
        });

    }

}

function openEditor(user){

document.getElementById("userModal").style.display="flex";

document.getElementById("editUserId").value=user.id;

document.getElementById("editBalance").value=user.balance;

document.getElementById("editVIP").value=user.vip_level;

document.getElementById("editRole").value=user.role;

}

function closeModal(){

document.getElementById("userModal").style.display="none";

}

async function saveUser(){

const id=document.getElementById("editUserId").value;

const balance=document.getElementById("editBalance").value;

const vip=document.getElementById("editVIP").value;

const role=document.getElementById("editRole").value;

await fetch(API+"/"+id+"/balance",{

method:"PUT",

headers:{

"Authorization":"Bearer "+token,

"Content-Type":"application/json"

},

body:JSON.stringify({

balance

})

});

await fetch(API+"/"+id+"/vip",{

method:"PUT",

headers:{

"Authorization":"Bearer "+token,

"Content-Type":"application/json"

},

body:JSON.stringify({

vip_level:vip

})

});

await fetch(API+"/"+id+"/role",{

method:"PUT",

headers:{

"Authorization":"Bearer "+token,

"Content-Type":"application/json"

},

body:JSON.stringify({

role

})

});

closeModal();

loadUsers();

showToast("User updated successfully");

}

function showToast(message){

const toast=document.getElementById("toast");

toast.innerHTML=message;

toast.style.display="block";

setTimeout(()=>{

toast.style.display="none";

},3000);

}
router.get("/profile", auth, async (req, res) => {
    try {
const [rows] = await db.query(
`SELECT
id,
fullname,
username,
email,
balance,
vip_level,
referral_code,
role,
created_at
FROM users
WHERE id = ?`,
[req.user.id]
);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});
// ==========================================
// GET ALL USERS
// ==========================================

async function adminOnly(req, res, next) {
    try {
        console.log("===== ADMIN CHECK =====");
        console.log("req.user:", req.user);

        const [rows] = await db.query(
            "SELECT id, username, role FROM users WHERE id=?",
            [req.user.id]
        );

        console.log("Database rows:", rows);

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        console.log("Database role:", rows[0].role);

        if (rows[0].role !== "admin") {
            console.log("NOT ADMIN");
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }

        console.log("ADMIN VERIFIED");
        next();

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
}


// ==========================================
// UPDATE USER BALANCE
// ==========================================

router.put("/:id/balance", auth, adminOnly, async (req, res) => {

    try {

        const { balance } = req.body;

        await db.query(
            "UPDATE users SET balance=? WHERE id=?",
            [balance, req.params.id]
        );

        res.json({
            success: true,
            message: "Balance updated"
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


// ==========================================
// UPDATE VIP LEVEL
// ==========================================

router.put("/:id/vip", auth, adminOnly, async (req, res) => {

    try {

        const { vip_level } = req.body;

        await db.query(
            "UPDATE users SET vip_level=? WHERE id=?",
            [vip_level, req.params.id]
        );

        res.json({
            success: true,
            message: "VIP updated"
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


// ==========================================
// CHANGE USER ROLE
// ==========================================

router.put("/:id/role", auth, adminOnly, async (req, res) => {

    try {

        const { role } = req.body;

        await db.query(
            "UPDATE users SET role=? WHERE id=?",
            [role, req.params.id]
        );

        res.json({
            success: true,
            message: "Role updated"
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});


// ==========================================
// DELETE USER
// ==========================================

router.delete("/:id", auth, adminOnly, async (req, res) => {

    try {

        await db.query(
            "DELETE FROM users WHERE id=?",
            [req.params.id]
        );

        res.json({
            success: true,
            message: "User deleted"
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});
module.exports = router;