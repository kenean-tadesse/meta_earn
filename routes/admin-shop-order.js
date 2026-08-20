const express = require("express");
const router = express.Router();

const db = require("../config/db.js");
const auth = require("../middleware/auth");

// ============================================================
// ADMIN AUTHORIZATION
// ============================================================

function requireAdmin(req, res, next) {

    try {

        if (!req.user) {

            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });

        }

        const role = String(
            req.user.role_name ||
            req.user.role ||
            req.user.user_role ||
            req.user.roleName ||
            ""
        )
        .toLowerCase()
        .trim();

        const adminRoles = [
            "admin",
            "administrator",
            "super admin",
            "super_admin",
            "superadmin"
        ];

        if (!adminRoles.includes(role)) {

            return res.status(403).json({
                success: false,
                message: "Administrator access required"
            });

        }

        next();

    } catch (error) {

        console.error("ADMIN ORDER AUTH ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Administrator authorization failed"
        });

    }

}


// ============================================================
// GET ALL SHOP ORDERS
//
// GET /api/admin/shop/orders
// ============================================================

router.get(
    "/orders",
    auth,
    requireAdmin,
    async (req, res) => {

        try {

            const search =
                String(req.query.search || "")
                    .trim();

            const status =
                String(req.query.status || "")
                    .trim();

            let sql = `

                SELECT

                    o.id,
                    o.order_number,
                    o.user_id,

                    o.delivery_name,
                    o.delivery_phone,
                    o.delivery_address,
                    o.notes,

                    o.total_amount,
                    o.status,

                    o.created_at,
                    o.updated_at,

                    u.email,

                    u.username

                FROM shop_orders o

                LEFT JOIN users u
                    ON o.user_id = u.user_id

                WHERE 1 = 1

            `;

            const params = [];


            // =================================================
            // SEARCH
            // =================================================

            if (search) {

                sql += `

                    AND (

                        o.order_number LIKE ?

                        OR o.delivery_name LIKE ?

                        OR o.delivery_phone LIKE ?

                        OR o.delivery_address LIKE ?

                        OR u.email LIKE ?

                        OR u.username LIKE ?

                    )

                `;

                const keyword =
                    `%${search}%`;

                params.push(
                    keyword,
                    keyword,
                    keyword,
                    keyword,
                    keyword,
                    keyword
                );

            }


            // =================================================
            // STATUS FILTER
            // =================================================

            if (status) {

                sql += `
                    AND o.status = ?
                `;

                params.push(status);

            }


            sql += `

                ORDER BY
                    o.created_at DESC

            `;


            const [orders] =
                await db.query(
                    sql,
                    params
                );


            res.json({

                success: true,

                orders

            });

        } catch (error) {

            console.error(
                "ADMIN SHOP ORDERS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load shop orders",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// GET SINGLE ORDER
//
// GET /api/admin/shop/orders/:id
// ============================================================

router.get(
    "/orders/:id",
    auth,
    requireAdmin,
    async (req, res) => {

        try {

            const orderId =
                Number(req.params.id);


            if (
                !Number.isInteger(orderId) ||
                orderId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID"

                });

            }


            // =================================================
            // ORDER
            // =================================================

            const [orders] =
                await db.query(`

                    SELECT

                        o.id,
                        o.order_number,
                        o.user_id,

                        o.delivery_name,
                        o.delivery_phone,
                        o.delivery_address,
                        o.notes,

                        o.total_amount,
                        o.status,

                        o.created_at,
                        o.updated_at,

                        u.email,
                        u.username

                    FROM shop_orders o

                    LEFT JOIN users u
                        ON o.user_id = u.user_id

                    WHERE o.id = ?

                    LIMIT 1

                `, [
                    orderId
                ]);


            if (
                orders.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found"

                });

            }


            // =================================================
            // ORDER ITEMS
            // =================================================

            const [items] =
                await db.query(`

                    SELECT

                        oi.id,

                        oi.product_id,

                        oi.quantity,

                        oi.price,

                        oi.total,

                        p.name AS product_name,

                        p.image AS product_image

                    FROM shop_order_items oi

                    LEFT JOIN shop_products p
                        ON oi.product_id = p.id

                    WHERE oi.order_id = ?

                    ORDER BY oi.id ASC

                `, [
                    orderId
                ]);


            res.json({

                success: true,

                order: orders[0],

                items

            });

        } catch (error) {

            console.error(
                "ADMIN SINGLE ORDER ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load order",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ORDER STATISTICS
//
// GET /api/admin/shop/orders/statistics
// ============================================================

router.get(
    "/orders/statistics",
    auth,
    requireAdmin,
    async (req, res) => {

        try {

            const [total] =
                await db.query(`

                    SELECT COUNT(*) AS total

                    FROM shop_orders

                `);


            const [pending] =
                await db.query(`

                    SELECT COUNT(*) AS total

                    FROM shop_orders

                    WHERE status = 'pending'

                `);


            const [completed] =
                await db.query(`

                    SELECT COUNT(*) AS total

                    FROM shop_orders

                    WHERE status = 'completed'

                `);


            const [cancelled] =
                await db.query(`

                    SELECT COUNT(*) AS total

                    FROM shop_orders

                    WHERE status = 'cancelled'

                `);


            const [sales] =
                await db.query(`

                    SELECT

                        COALESCE(
                            SUM(total_amount),
                            0
                        ) AS total

                    FROM shop_orders

                    WHERE status != 'cancelled'

                `);


            res.json({

                success: true,

                statistics: {

                    total:
                        Number(
                            total[0].total || 0
                        ),

                    pending:
                        Number(
                            pending[0].total || 0
                        ),

                    completed:
                        Number(
                            completed[0].total || 0
                        ),

                    cancelled:
                        Number(
                            cancelled[0].total || 0
                        ),

                    sales:
                        Number(
                            sales[0].total || 0
                        )

                }

            });

        } catch (error) {

            console.error(
                "ADMIN ORDER STATISTICS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load order statistics",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// UPDATE ORDER STATUS
//
// PUT /api/admin/shop/orders/:id/status
// ============================================================

router.put(
    "/orders/:id/status",
    auth,
    requireAdmin,
    async (req, res) => {

        try {

            const orderId =
                Number(req.params.id);

            const status =
                String(
                    req.body.status || ""
                )
                .trim()
                .toLowerCase();


            if (
                !Number.isInteger(orderId) ||
                orderId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID"

                });

            }


            const allowedStatuses = [

                "pending",
                "processing",
                "completed",
                "cancelled",
                "shipped",
                "delivered"

            ];


            if (
                !allowedStatuses.includes(status)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order status"

                });

            }


            const [result] =
                await db.query(`

                    UPDATE shop_orders

                    SET
                        status = ?

                    WHERE id = ?

                `, [

                    status,
                    orderId

                ]);


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found"

                });

            }


            res.json({

                success: true,

                message:
                    "Order status updated successfully"

            });

        } catch (error) {

            console.error(
                "UPDATE ORDER STATUS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to update order status",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
