const express = require("express");
const router = express.Router();

const db = require("../config/db.js");
const auth = require("../middleware/auth");

// ============================================================
// ADMIN AUTHORIZATION
// ============================================================

function requireAdmin(req, res, next) {

    try {

        const user = req.user || {};

        const role =
            user.role_name ||
            user.role ||
            user.user_role ||
            user.roleName ||
            "";

        const normalizedRole =
            String(role)
                .toLowerCase()
                .trim();

        const adminRoles = [
            "admin",
            "administrator",
            "super admin",
            "super_admin",
            "superadmin"
        ];

        if (!adminRoles.includes(normalizedRole)) {

            return res.status(403).json({
                success: false,
                message: "Administrator access required"
            });

        }

        next();

    } catch (error) {

        console.error(
            "ADMIN AUTHORIZATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Administrator authorization failed"
        });

    }

}


// ============================================================
// ADMIN AUTH MIDDLEWARE
// ============================================================
//
// IMPORTANT:
// Authentication happens ONCE.
// We do NOT call auth() inside another auth() function.
//
// ============================================================

const adminAuth = [
    auth,
    requireAdmin
];


// ============================================================
// TEST ROUTE
// GET /api/admin/shop
// ============================================================

router.get("/", adminAuth, async (req, res) => {

    res.json({

        success: true,

        message:
            "Meta Earn Admin Shop API is working",

        routes: {

            categories:
                "/api/admin/shop/categories",

            products:
                "/api/admin/shop/products",

            statistics:
                "/api/admin/shop/statistics"

        }

    });

});


// ============================================================
// SHOP STATISTICS
//
// GET /api/admin/shop/statistics
//
// ============================================================

router.get(
    "/statistics",
    adminAuth,
    async (req, res) => {

        try {

            // ------------------------------------------------
            // TOTAL PRODUCTS
            // ------------------------------------------------

            const [products] =
                await db.query(`
                    SELECT COUNT(*) AS total
                    FROM shop_products
                `);


            // ------------------------------------------------
            // ACTIVE PRODUCTS
            // ------------------------------------------------

            const [activeProducts] =
                await db.query(`
                    SELECT COUNT(*) AS total
                    FROM shop_products
                    WHERE status = 'active'
                `);


            // ------------------------------------------------
            // INACTIVE PRODUCTS
            // ------------------------------------------------

            const [inactiveProducts] =
                await db.query(`
                    SELECT COUNT(*) AS total
                    FROM shop_products
                    WHERE status = 'inactive'
                `);


            // ------------------------------------------------
            // CATEGORIES
            // ------------------------------------------------

            const [categories] =
                await db.query(`
                    SELECT COUNT(*) AS total
                    FROM shop_categories
                `);


            // ------------------------------------------------
            // TOTAL STOCK
            // ------------------------------------------------

            const [stock] =
                await db.query(`
                    SELECT
                        COALESCE(
                            SUM(stock),
                            0
                        ) AS total
                    FROM shop_products
                    WHERE status = 'active'
                `);


            // ------------------------------------------------
            // ORDERS
            // ------------------------------------------------

            let orderCount = 0;

            try {

                const [orders] =
                    await db.query(`
                        SELECT COUNT(*) AS total
                        FROM shop_orders
                    `);

                orderCount =
                    Number(
                        orders[0]?.total || 0
                    );

            } catch (orderError) {

                console.warn(
                    "shop_orders table unavailable:",
                    orderError.message
                );

            }


            // ------------------------------------------------
            // SALES
            // ------------------------------------------------

            let salesTotal = 0;

            try {

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

                salesTotal =
                    Number(
                        sales[0]?.total || 0
                    );

            } catch (salesError) {

                console.warn(
                    "Sales calculation unavailable:",
                    salesError.message
                );

            }


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({

                success: true,

                statistics: {

                    products:
                        Number(
                            products[0]?.total || 0
                        ),

                    active_products:
                        Number(
                            activeProducts[0]?.total || 0
                        ),

                    inactive_products:
                        Number(
                            inactiveProducts[0]?.total || 0
                        ),

                    categories:
                        Number(
                            categories[0]?.total || 0
                        ),

                    stock:
                        Number(
                            stock[0]?.total || 0
                        ),

                    orders:
                        orderCount,

                    sales:
                        salesTotal

                }

            });

        } catch (error) {

            console.error(
                "ADMIN SHOP STATISTICS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load shop statistics",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ALSO SUPPORT /stats
// ============================================================
//
// This keeps compatibility with your old frontend/backend code.
//
// GET /api/admin/shop/stats
//
// ============================================================

router.get(
    "/stats",
    adminAuth,
    async (req, res) => {

        try {

            const [products] =
                await db.query(`
                    SELECT COUNT(*) AS total
                    FROM shop_products
                `);

            const [activeProducts] =
                await db.query(`
                    SELECT COUNT(*) AS total
                    FROM shop_products
                    WHERE status = 'active'
                `);

            const [inactiveProducts] =
                await db.query(`
                    SELECT COUNT(*) AS total
                    FROM shop_products
                    WHERE status = 'inactive'
                `);

            const [categories] =
                await db.query(`
                    SELECT COUNT(*) AS total
                    FROM shop_categories
                `);

            const [stock] =
                await db.query(`
                    SELECT
                        COALESCE(
                            SUM(stock),
                            0
                        ) AS total
                    FROM shop_products
                    WHERE status = 'active'
                `);

            res.json({

                success: true,

                statistics: {

                    products:
                        Number(
                            products[0]?.total || 0
                        ),

                    active_products:
                        Number(
                            activeProducts[0]?.total || 0
                        ),

                    inactive_products:
                        Number(
                            inactiveProducts[0]?.total || 0
                        ),

                    categories:
                        Number(
                            categories[0]?.total || 0
                        ),

                    stock:
                        Number(
                            stock[0]?.total || 0
                        ),

                    orders: 0,

                    sales: 0

                }

            });

        } catch (error) {

            console.error(
                "SHOP STATS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load shop statistics",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// GET ALL CATEGORIES
//
// GET /api/admin/shop/categories
//
// ============================================================

router.get(
    "/categories",
    adminAuth,
    async (req, res) => {

        try {

            const [rows] =
                await db.query(`

                    SELECT

                        id,

                        name,

                        description,

                        status,

                        created_at

                    FROM shop_categories

                    ORDER BY name ASC

                `);


            return res.json({

                success: true,

                categories: rows

            });

        } catch (error) {

            console.error(
                "ADMIN SHOP CATEGORIES ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load categories",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// CREATE CATEGORY
//
// POST /api/admin/shop/categories
//
// ============================================================

router.post(
    "/categories",
    adminAuth,
    async (req, res) => {

        try {

            const name =
                String(
                    req.body.name || ""
                ).trim();

            const description =
                req.body.description
                    ? String(
                        req.body.description
                    ).trim()
                    : null;


            if (!name) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Category name is required"

                });

            }


            const [existing] =
                await db.query(`

                    SELECT id

                    FROM shop_categories

                    WHERE name = ?

                    LIMIT 1

                `, [
                    name
                ]);


            if (existing.length > 0) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Category already exists"

                });

            }


            const [result] =
                await db.query(`

                    INSERT INTO shop_categories

                    (
                        name,
                        description,
                        status
                    )

                    VALUES

                    (
                        ?,
                        ?,
                        'active'
                    )

                `, [

                    name,

                    description

                ]);


            return res.status(201).json({

                success: true,

                message:
                    "Category created successfully",

                category_id:
                    result.insertId

            });

        } catch (error) {

            console.error(
                "CREATE CATEGORY ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to create category",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// UPDATE CATEGORY
//
// PUT /api/admin/shop/categories/:id
//
// ============================================================

router.put(
    "/categories/:id",
    adminAuth,
    async (req, res) => {

        try {

            const categoryId =
                Number(req.params.id);


            if (
                !Number.isInteger(categoryId) ||
                categoryId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid category ID"

                });

            }


            const name =
                String(
                    req.body.name || ""
                ).trim();

            const description =
                req.body.description
                    ? String(
                        req.body.description
                    ).trim()
                    : null;

            const status =
                req.body.status === "inactive"
                    ? "inactive"
                    : "active";


            if (!name) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Category name is required"

                });

            }


            const [result] =
                await db.query(`

                    UPDATE shop_categories

                    SET

                        name = ?,

                        description = ?,

                        status = ?

                    WHERE id = ?

                `, [

                    name,

                    description,

                    status,

                    categoryId

                ]);


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Category not found"

                });

            }


            return res.json({

                success: true,

                message:
                    "Category updated successfully"

            });

        } catch (error) {

            console.error(
                "UPDATE CATEGORY ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update category",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// GET ALL PRODUCTS
//
// GET /api/admin/shop/products
//
// ============================================================

router.get(
    "/products",
    adminAuth,
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


            let sql = `

                SELECT

                    p.id,

                    p.category_id,

                    p.name,

                    p.description,

                    p.price,

                    p.stock,

                    p.image,

                    p.status,

                    p.created_at,

                    p.updated_at,

                    c.name AS category_name

                FROM shop_products p

                LEFT JOIN shop_categories c

                    ON p.category_id = c.id

                WHERE 1 = 1

            `;


            const params = [];


            if (search) {

                sql += `

                    AND (

                        p.name LIKE ?

                        OR p.description LIKE ?

                        OR c.name LIKE ?

                    )

                `;


                const keyword =
                    `%${search}%`;


                params.push(

                    keyword,

                    keyword,

                    keyword

                );

            }


            if (
                status === "active" ||
                status === "inactive"
            ) {

                sql += `

                    AND p.status = ?

                `;

                params.push(status);

            }


            sql += `

                ORDER BY
                    p.created_at DESC

            `;


            const [rows] =
                await db.query(
                    sql,
                    params
                );


            return res.json({

                success: true,

                products: rows

            });

        } catch (error) {

            console.error(
                "ADMIN SHOP PRODUCTS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load products",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// GET SINGLE PRODUCT
//
// GET /api/admin/shop/products/:id
//
// ============================================================

router.get(
    "/products/:id",
    adminAuth,
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);


            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID"

                });

            }


            const [rows] =
                await db.query(`

                    SELECT

                        p.id,

                        p.category_id,

                        p.name,

                        p.description,

                        p.price,

                        p.stock,

                        p.image,

                        p.status,

                        p.created_at,

                        p.updated_at,

                        c.name AS category_name

                    FROM shop_products p

                    LEFT JOIN shop_categories c

                        ON p.category_id = c.id

                    WHERE p.id = ?

                    LIMIT 1

                `, [
                    productId
                ]);


            if (!rows.length) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found"

                });

            }


            return res.json({

                success: true,

                product: rows[0]

            });

        } catch (error) {

            console.error(
                "GET PRODUCT ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load product",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// CREATE PRODUCT
//
// POST /api/admin/shop/products
//
// ============================================================

router.post(
    "/products",
    adminAuth,
    async (req, res) => {

        try {

            const {

                category_id,

                name,

                description,

                price,

                stock,

                image,

                status

            } = req.body;


            const productName =
                String(
                    name || ""
                ).trim();


            if (!productName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product name is required"

                });

            }


            const productPrice =
                Number(price);

            const productStock =
                Number(stock);


            if (
                !Number.isFinite(
                    productPrice
                ) ||
                productPrice < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product price"

                });

            }


            if (
                !Number.isInteger(
                    productStock
                ) ||
                productStock < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product stock"

                });

            }


            let categoryId = null;


            if (
                category_id !== null &&
                category_id !== undefined &&
                category_id !== ""
            ) {

                categoryId =
                    Number(category_id);


                if (
                    !Number.isInteger(
                        categoryId
                    ) ||
                    categoryId <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid category"

                    });

                }


                const [category] =
                    await db.query(`

                        SELECT id

                        FROM shop_categories

                        WHERE id = ?

                        LIMIT 1

                    `, [
                        categoryId
                    ]);


                if (!category.length) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Category not found"

                    });

                }

            }


            const productStatus =
                status === "inactive"
                    ? "inactive"
                    : "active";


            const productDescription =
                description
                    ? String(
                        description
                    ).trim()
                    : null;


            const productImage =
                image
                    ? String(
                        image
                    ).trim()
                    : null;


            const [result] =
                await db.query(`

                    INSERT INTO shop_products

                    (

                        category_id,

                        name,

                        description,

                        price,

                        stock,

                        image,

                        status

                    )

                    VALUES

                    (

                        ?,

                        ?,

                        ?,

                        ?,

                        ?,

                        ?,

                        ?

                    )

                `, [

                    categoryId,

                    productName,

                    productDescription,

                    productPrice,

                    productStock,

                    productImage,

                    productStatus

                ]);


            return res.status(201).json({

                success: true,

                message:
                    "Product created successfully",

                product_id:
                    result.insertId

            });

        } catch (error) {

            console.error(
                "CREATE PRODUCT ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to create product",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// UPDATE PRODUCT
//
// PUT /api/admin/shop/products/:id
//
// ============================================================

router.put(
    "/products/:id",
    adminAuth,
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);


            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID"

                });

            }


            const {

                category_id,

                name,

                description,

                price,

                stock,

                image,

                status

            } = req.body;


            const productName =
                String(
                    name || ""
                ).trim();


            if (!productName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product name is required"

                });

            }


            const productPrice =
                Number(price);

            const productStock =
                Number(stock);


            if (
                !Number.isFinite(
                    productPrice
                ) ||
                productPrice < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product price"

                });

            }


            if (
                !Number.isInteger(
                    productStock
                ) ||
                productStock < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product stock"

                });

            }


            let categoryId = null;


            if (
                category_id !== null &&
                category_id !== undefined &&
                category_id !== ""
            ) {

                categoryId =
                    Number(category_id);


                if (
                    !Number.isInteger(
                        categoryId
                    ) ||
                    categoryId <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid category"

                    });

                }


                const [category] =
                    await db.query(`

                        SELECT id

                        FROM shop_categories

                        WHERE id = ?

                        LIMIT 1

                    `, [
                        categoryId
                    ]);


                if (!category.length) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Category not found"

                    });

                }

            }


            const productStatus =
                status === "inactive"
                    ? "inactive"
                    : "active";


            const [result] =
                await db.query(`

                    UPDATE shop_products

                    SET

                        category_id = ?,

                        name = ?,

                        description = ?,

                        price = ?,

                        stock = ?,

                        image = ?,

                        status = ?

                    WHERE id = ?

                `, [

                    categoryId,

                    productName,

                    description
                        ? String(
                            description
                        ).trim()
                        : null,

                    productPrice,

                    productStock,

                    image
                        ? String(
                            image
                        ).trim()
                        : null,

                    productStatus,

                    productId

                ]);


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found"

                });

            }


            return res.json({

                success: true,

                message:
                    "Product updated successfully"

            });

        } catch (error) {

            console.error(
                "UPDATE PRODUCT ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update product",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// UPDATE PRODUCT STATUS
//
// PUT /api/admin/shop/products/:id/status
//
// ============================================================

router.put(
    "/products/:id/status",
    adminAuth,
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);

            const status =
                req.body.status;


            if (
                !Number.isInteger(
                    productId
                ) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID"

                });

            }


            if (
                status !== "active" &&
                status !== "inactive"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Status must be active or inactive"

                });

            }


            const [result] =
                await db.query(`

                    UPDATE shop_products

                    SET status = ?

                    WHERE id = ?

                `, [

                    status,

                    productId

                ]);


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found"

                });

            }


            return res.json({

                success: true,

                message:
                    "Product status updated successfully"

            });

        } catch (error) {

            console.error(
                "UPDATE PRODUCT STATUS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update product status",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// UPDATE PRODUCT STOCK
//
// PUT /api/admin/shop/products/:id/stock
//
// ============================================================

router.put(
    "/products/:id/stock",
    adminAuth,
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);

            const stock =
                Number(req.body.stock);


            if (
                !Number.isInteger(
                    productId
                ) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID"

                });

            }


            if (
                !Number.isInteger(stock) ||
                stock < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Stock must be a non-negative integer"

                });

            }


            const [result] =
                await db.query(`

                    UPDATE shop_products

                    SET stock = ?

                    WHERE id = ?

                `, [

                    stock,

                    productId

                ]);


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found"

                });

            }


            return res.json({

                success: true,

                message:
                    "Stock updated successfully"

            });

        } catch (error) {

            console.error(
                "UPDATE STOCK ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update stock",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// DELETE PRODUCT
//
// DELETE /api/admin/shop/products/:id
//
// ============================================================

router.delete(
    "/products/:id",
    adminAuth,
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);


            if (
                !Number.isInteger(
                    productId
                ) ||
                productId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product ID"

                });

            }


            // ------------------------------------------------
            // Check if product is used in an order
            // ------------------------------------------------

            let usedInOrder = false;


            try {

                const [orders] =
                    await db.query(`

                        SELECT id

                        FROM shop_order_items

                        WHERE product_id = ?

                        LIMIT 1

                    `, [
                        productId
                    ]);


                usedInOrder =
                    orders.length > 0;

            } catch (orderError) {

                console.warn(
                    "Order-item check unavailable:",
                    orderError.message
                );

            }


            // ------------------------------------------------
            // If used in an order, deactivate instead
            // ------------------------------------------------

            if (usedInOrder) {

                await db.query(`

                    UPDATE shop_products

                    SET status = 'inactive'

                    WHERE id = ?

                `, [
                    productId
                ]);


                return res.json({

                    success: true,

                    message:
                        "Product has previous orders and was deactivated instead of deleted"

                });

            }


            // ------------------------------------------------
            // Delete
            // ------------------------------------------------

            const [result] =
                await db.query(`

                    DELETE FROM shop_products

                    WHERE id = ?

                `, [
                    productId
                ]);


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found"

                });

            }


            return res.json({

                success: true,

                message:
                    "Product deleted successfully"

            });

        } catch (error) {

            console.error(
                "DELETE PRODUCT ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to delete product",

                error:
                    error.message

            });

        }

    }
);

// ============================================================
// ADMIN SHOP ORDERS
// GET /api/admin/shop/orders
// ============================================================

router.get(
    "/orders",
    adminAuth,
    async (req, res) => {

        try {

            console.log("ADMIN SHOP ORDERS REQUEST");

            const search =
                String(req.query.search || "").trim();

            const status =
                String(req.query.status || "").trim();

            let sql = `
                SELECT

                    o.id,
                    o.user_id,

                    o.order_number,

                    o.total_amount,

                    o.status,

                    o.delivery_name,

                    o.delivery_phone,

                    o.delivery_address,

                    o.notes,

                    o.created_at,
                    o.updated_at,

                    u.email,

                    u.employee_no

                FROM shop_orders o

                LEFT JOIN users u
                    ON o.user_id = u.user_id

                WHERE 1 = 1
            `;

            const params = [];


            // ------------------------------------------------
            // SEARCH
            // ------------------------------------------------

            if (search) {

                sql += `
                    AND (
                        CAST(o.id AS CHAR) LIKE ?
                        OR o.order_number LIKE ?
                        OR o.delivery_name LIKE ?
                        OR o.delivery_phone LIKE ?
                        OR u.email LIKE ?
                        OR u.employee_no LIKE ?
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


            // ------------------------------------------------
            // STATUS FILTER
            // ------------------------------------------------

            const allowedStatuses = [
                "pending",
                "processing",
                "shipped",
                "delivered",
                "completed",
                "cancelled"
            ];

            if (
                allowedStatuses.includes(status)
            ) {

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


            // ------------------------------------------------
            // LOAD ITEMS FOR EACH ORDER
            // ------------------------------------------------

            for (
                const order of orders
            ) {

                const [items] =
                    await db.query(
                        `
                        SELECT

                            oi.id,

                            oi.product_id,

                            oi.quantity,

                            oi.price,

                            oi.total,

                            p.name,

                            p.image

                        FROM shop_order_items oi

                        LEFT JOIN shop_products p
                            ON oi.product_id = p.id

                        WHERE oi.order_id = ?

                        ORDER BY oi.id ASC
                        `,
                        [
                            order.id
                        ]
                    );


                order.items =
                    items || [];

            }


            // ------------------------------------------------
            // RESPONSE
            // ------------------------------------------------

            return res.json({

                success: true,

                orders: orders,

                count:
                    orders.length

            });


        } catch (error) {

            console.error(
                "ADMIN SHOP ORDERS ERROR:",
                error
            );

            return res.status(500).json({

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
// EXPORT
// ============================================================

module.exports = router;
