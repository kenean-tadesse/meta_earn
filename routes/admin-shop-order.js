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

        console.error(
            "ADMIN ORDER AUTH ERROR:",
            error
        );

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
                String(
                    req.query.search || ""
                ).trim();

            const status =
                String(
                    req.query.status || ""
                ).trim();


            /*
            ========================================================
            IMPORTANT

            We deliberately do NOT join users here.

            This prevents the route from failing if your users
            table uses `id` instead of `user_id`.

            We first load the orders safely.
            ========================================================
            */

            let sql = `

                SELECT

                    o.*

                FROM shop_orders o

                WHERE 1 = 1

            `;

            const params = [];


            // ====================================================
            // SEARCH
            // ====================================================

            if (search) {

                sql += `

                    AND (

                        o.order_number LIKE ?

                        OR o.delivery_name LIKE ?

                        OR o.delivery_phone LIKE ?

                        OR o.delivery_address LIKE ?

                    )

                `;

                const keyword =
                    `%${search}%`;

                params.push(
                    keyword,
                    keyword,
                    keyword,
                    keyword
                );

            }


            // ====================================================
            // STATUS FILTER
            // ====================================================

            if (status) {

                sql += `

                    AND o.status = ?

                `;

                params.push(status);

            }


            // ====================================================
            // ORDER
            // ====================================================

            sql += `

                ORDER BY
                    o.created_at DESC

            `;


            console.log(
                "ADMIN SHOP SQL:",
                sql
            );


            const [orders] =
                await db.query(
                    sql,
                    params
                );


            // ====================================================
            // ADD USER INFORMATION SAFELY
            // ====================================================

            /*
                We attempt to load user information separately.

                If the user table structure is different, the orders
                themselves will still load.
            */

            for (
                const order of orders
            ) {

                order.username =
                    order.delivery_name ||
                    `User #${order.user_id || "-"}`;

                order.email =
                    "";

                order.user_name =
                    order.delivery_name ||
                    order.username;

                order.user_email =
                    "";

                order.phone =
                    order.delivery_phone || "";

                order.phone_number =
                    order.delivery_phone || "";

                order.shipping_address =
                    order.delivery_address || "";

            }


            // ====================================================
            // TRY TO LOAD USER INFORMATION
            // ====================================================

            try {

                /*
                    Detect which user primary column exists.
                */

                const [columns] =
                    await db.query(`

                        SHOW COLUMNS
                        FROM users

                    `);


                const columnNames =
                    columns.map(
                        column =>
                            column.Field
                    );


                let userIdColumn = null;


                if (
                    columnNames.includes("id")
                ) {

                    userIdColumn = "id";

                }
                else if (
                    columnNames.includes("user_id")
                ) {

                    userIdColumn = "user_id";

                }


                if (userIdColumn) {

                    const userIds =
                        orders
                        .map(
                            order =>
                                Number(
                                    order.user_id
                                )
                        )
                        .filter(
                            id =>
                                Number.isInteger(id) &&
                                id > 0
                        );


                    if (
                        userIds.length > 0
                    ) {

                        const uniqueIds =
                            [
                                ...new Set(
                                    userIds
                                )
                            ];


                        const placeholders =
                            uniqueIds
                            .map(
                                () => "?"
                            )
                            .join(",");


                        /*
                            Detect available user fields.
                        */

                        const usernameColumn =
                            columnNames.includes(
                                "username"
                            )
                            ? "username"
                            : null;


                        const emailColumn =
                            columnNames.includes(
                                "email"
                            )
                            ? "email"
                            : null;


                        let userSelect = `

                            ${userIdColumn}
                            AS detected_user_id

                        `;


                        if (
                            usernameColumn
                        ) {

                            userSelect += `,

                                username

                            `;

                        }


                        if (
                            emailColumn
                        ) {

                            userSelect += `,

                                email

                            `;

                        }


                        const [users] =
                            await db.query(

                                `

                                SELECT
                                    ${userSelect}

                                FROM users

                                WHERE
                                    ${userIdColumn}
                                    IN (${placeholders})

                                `,

                                uniqueIds

                            );


                        const userMap =
                            new Map();


                        users.forEach(
                            user => {

                                userMap.set(
                                    Number(
                                        user.detected_user_id
                                    ),
                                    user
                                );

                            }
                        );


                        orders.forEach(
                            order => {

                                const user =
                                    userMap.get(
                                        Number(
                                            order.user_id
                                        )
                                    );


                                if (!user) {

                                    return;

                                }


                                if (
                                    user.username
                                ) {

                                    order.username =
                                        user.username;

                                    order.user_name =
                                        user.username;

                                }


                                if (
                                    user.email
                                ) {

                                    order.email =
                                        user.email;

                                    order.user_email =
                                        user.email;

                                }

                            }
                        );

                    }

                }

            } catch (userError) {

                /*
                    Do not allow a users-table problem to break
                    the shop orders page.
                */

                console.warn(
                    "USER INFORMATION LOAD WARNING:",
                    userError.message
                );

            }


            // ====================================================
            // RESPONSE
            // ====================================================

            return res.json({

                success: true,

                orders: orders,

                count:
                    orders.length

            });


        } catch (error) {

            console.error(
                "===================================="
            );

            console.error(
                "ADMIN SHOP ORDERS DATABASE ERROR"
            );

            console.error(
                error
            );

            console.error(
                "SQL ERROR MESSAGE:",
                error.message
            );

            console.error(
                "SQL ERROR CODE:",
                error.code
            );

            console.error(
                "===================================="
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load shop orders",

                error:
                    error.message,

                code:
                    error.code || null

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
                Number(
                    req.params.id
                );


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


            // ====================================================
            // ORDER
            // ====================================================

            const [orders] =
                await db.query(`

                    SELECT *

                    FROM shop_orders

                    WHERE id = ?

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


            const order =
                orders[0];


            // ====================================================
            // NORMALIZE CUSTOMER INFORMATION
            // ====================================================

            order.username =
                order.delivery_name ||
                `User #${order.user_id || "-"}`;

            order.user_name =
                order.delivery_name ||
                order.username;

            order.email =
                "";

            order.user_email =
                "";

            order.phone =
                order.delivery_phone || "";

            order.phone_number =
                order.delivery_phone || "";

            order.shipping_address =
                order.delivery_address || "";


            // ====================================================
            // LOAD USER
            // ====================================================

            try {

                const [columns] =
                    await db.query(`

                        SHOW COLUMNS
                        FROM users

                    `);


                const columnNames =
                    columns.map(
                        c => c.Field
                    );


                let userIdColumn = null;


                if (
                    columnNames.includes("id")
                ) {

                    userIdColumn = "id";

                }
                else if (
                    columnNames.includes("user_id")
                ) {

                    userIdColumn = "user_id";

                }


                if (userIdColumn) {

                    const [users] =
                        await db.query(

                            `

                            SELECT *

                            FROM users

                            WHERE
                                ${userIdColumn} = ?

                            LIMIT 1

                            `,

                            [
                                order.user_id
                            ]

                        );


                    if (
                        users.length > 0
                    ) {

                        const user =
                            users[0];


                        if (
                            user.username
                        ) {

                            order.username =
                                user.username;

                            order.user_name =
                                user.username;

                        }


                        if (
                            user.email
                        ) {

                            order.email =
                                user.email;

                            order.user_email =
                                user.email;

                        }


                        if (
                            user.phone
                        ) {

                            order.phone =
                                user.phone;

                        }

                        else if (
                            user.phone_number
                        ) {

                            order.phone =
                                user.phone_number;

                        }

                    }

                }

            } catch (userError) {

                console.warn(
                    "USER DETAIL WARNING:",
                    userError.message
                );

            }


            // ====================================================
            // ORDER ITEMS
            // ====================================================

            let items = [];


            try {

                const [itemRows] =
                    await db.query(`

                        SELECT

                            oi.*,

                            p.name
                                AS product_name,

                            p.image
                                AS product_image

                        FROM shop_order_items oi

                        LEFT JOIN shop_products p
                            ON oi.product_id = p.id

                        WHERE
                            oi.order_id = ?

                        ORDER BY
                            oi.id ASC

                    `, [
                        orderId
                    ]);


                items =
                    itemRows || [];

            } catch (itemError) {

                console.warn(
                    "ORDER ITEMS WARNING:",
                    itemError.message
                );

                items = [];

            }


            // ====================================================
            // RESPONSE
            // ====================================================

            return res.json({

                success: true,

                order: order,

                items: items

            });


        } catch (error) {

            console.error(
                "ADMIN SINGLE ORDER ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load order",

                error:
                    error.message,

                code:
                    error.code || null

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

            const [rows] =
                await db.query(`

                    SELECT

                        COUNT(*) AS total,

                        SUM(
                            CASE
                                WHEN status = 'pending'
                                THEN 1
                                ELSE 0
                            END
                        ) AS pending,

                        SUM(
                            CASE
                                WHEN status = 'processing'
                                THEN 1
                                ELSE 0
                            END
                        ) AS processing,

                        SUM(
                            CASE
                                WHEN status = 'completed'
                                THEN 1
                                ELSE 0
                            END
                        ) AS completed,

                        SUM(
                            CASE
                                WHEN status = 'cancelled'
                                THEN 1
                                ELSE 0
                            END
                        ) AS cancelled,

                        COALESCE(
                            SUM(
                                CASE
                                    WHEN status != 'cancelled'
                                    THEN total_amount
                                    ELSE 0
                                END
                            ),
                            0
                        ) AS sales

                    FROM shop_orders

                `);


            const stats =
                rows[0] || {};


            return res.json({

                success: true,

                statistics: {

                    total:
                        Number(
                            stats.total || 0
                        ),

                    pending:
                        Number(
                            stats.pending || 0
                        ),

                    processing:
                        Number(
                            stats.processing || 0
                        ),

                    completed:
                        Number(
                            stats.completed || 0
                        ),

                    cancelled:
                        Number(
                            stats.cancelled || 0
                        ),

                    sales:
                        Number(
                            stats.sales || 0
                        )

                }

            });


        } catch (error) {

            console.error(
                "ADMIN ORDER STATISTICS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load order statistics",

                error:
                    error.message,

                code:
                    error.code || null

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
                Number(
                    req.params.id
                );


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
                !allowedStatuses.includes(
                    status
                )
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
                        status = ?,
                        updated_at = NOW()

                    WHERE
                        id = ?

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


            return res.json({

                success: true,

                message:
                    "Order status updated successfully",

                order_id:
                    orderId,

                status:
                    status

            });


        } catch (error) {

            console.error(
                "UPDATE ORDER STATUS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to update order status",

                error:
                    error.message,

                code:
                    error.code || null

            });

        }

    }
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
