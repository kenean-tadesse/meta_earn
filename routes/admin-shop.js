const express = require("express");
const router = express.Router();

const db = require("../config/db.js");
const auth = require("../middleware/auth");



// ============================================================
// ADMIN AUTHENTICATION HELPER
// ============================================================

async function adminAuth(req, res, next) {

    try {

        // Use the existing authentication middleware.
        // This does NOT change your JWT/authentication system.

        auth(req, res, () => {

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

                    message:
                        "Administrator access required"

                });

            }

            next();

        });

    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Administrator authentication failed"

        });

    }

}

// ============================================================
// ADMIN AUTHORIZATION
// ============================================================

function requireAdmin(req, res, next) {

    const user = req.user;

    if (!user) {

        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });

    }

    const role =
        user.role ||
        user.role_name ||
        user.roleName;

    if (
        role !== "admin" &&
        role !== "Admin" &&
        role !== "ADMIN" &&
        role !== "Administrator"
    ) {

        return res.status(403).json({
            success: false,
            message: "Administrator access required"
        });

    }

    next();

}


// ============================================================
// DASHBOARD STATISTICS
// GET /api/admin/shop/stats
// ============================================================

router.get(
    "/stats",
    auth,
    requireAdmin,
    async (req, res) => {

        try {

            const [products] = await db.query(`
                SELECT COUNT(*) AS total
                FROM shop_products
            `);

            const [active] = await db.query(`
                SELECT COUNT(*) AS total
                FROM shop_products
                WHERE status = 'active'
            `);

            const [inactive] = await db.query(`
                SELECT COUNT(*) AS total
                FROM shop_products
                WHERE status = 'inactive'
            `);

            const [categories] = await db.query(`
                SELECT COUNT(*) AS total
                FROM shop_categories
            `);

            const [stock] = await db.query(`
                SELECT COALESCE(SUM(stock), 0) AS total
                FROM shop_products
                WHERE status = 'active'
            `);

            const [orders] = await db.query(`
                SELECT COUNT(*) AS total
                FROM shop_orders
            `);

            const [sales] = await db.query(`
                SELECT
                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS total
                FROM shop_orders
                WHERE status NOT IN ('cancelled')
            `);

            res.json({

                success: true,

                stats: {

                    products:
                        Number(products[0].total || 0),

                    active_products:
                        Number(active[0].total || 0),

                    inactive_products:
                        Number(inactive[0].total || 0),

                    categories:
                        Number(categories[0].total || 0),

                    stock:
                        Number(stock[0].total || 0),

                    orders:
                        Number(orders[0].total || 0),

                    sales:
                        Number(sales[0].total || 0)

                }

            });

        } catch (error) {

            console.error(
                "ADMIN SHOP STATS ERROR:",
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
// GET /api/admin/shop/categories
// ============================================================

router.get(
    "/categories",
    adminAuth,
    async (req, res) => {

        try {

            const [rows] = await db.query(`
                SELECT
                    id,
                    name,
                    description,
                    status,
                    created_at
                FROM shop_categories
                ORDER BY name ASC
            `);

            res.json({

                success: true,

                categories: rows

            });

        } catch (error) {

            console.error(
                "ADMIN SHOP CATEGORIES ERROR:",
                error
            );

            res.status(500).json({

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
// POST /api/admin/shop/categories
// ============================================================

router.post(
    "/categories",
    adminAuth,
    async (req, res) => {

        try {

            const {
                name,
                description
            } = req.body;

            if (
                !name ||
                !name.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Category name is required"

                });

            }

            const [existing] = await db.query(`
                SELECT id
                FROM shop_categories
                WHERE name = ?
                LIMIT 1
            `, [
                name.trim()
            ]);

            if (existing.length > 0) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Category already exists"

                });

            }

            const [result] = await db.query(`
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

                name.trim(),

                description
                    ? description.trim()
                    : null

            ]);

            res.status(201).json({

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

            res.status(500).json({

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
// PUT /api/admin/shop/categories/:id
// ============================================================

router.put(
    "/categories/:id",
    adminAuth,
    async (req, res) => {

        try {

            const categoryId =
                Number(req.params.id);

            const {
                name,
                description,
                status
            } = req.body;

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

            if (
                !name ||
                !name.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Category name is required"

                });

            }

            const validStatus =
                status === "inactive"
                    ? "inactive"
                    : "active";

            const [result] = await db.query(`
                UPDATE shop_categories

                SET
                    name = ?,
                    description = ?,
                    status = ?

                WHERE id = ?
            `, [

                name.trim(),

                description
                    ? description.trim()
                    : null,

                validStatus,

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

            res.json({

                success: true,

                message:
                    "Category updated successfully"

            });

        } catch (error) {

            console.error(
                "UPDATE CATEGORY ERROR:",
                error
            );

            res.status(500).json({

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
// GET /api/admin/shop/products
// ============================================================

router.get(
    "/products",
    adminAuth,
    async (req, res) => {

        try {

            const search =
                (req.query.search || "")
                    .trim();

            const status =
                req.query.status || "";

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

            res.json({

                success: true,

                products: rows

            });

        } catch (error) {

            console.error(
                "ADMIN SHOP PRODUCTS ERROR:",
                error
            );

            res.status(500).json({

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
// GET /api/admin/shop/products/:id
// ============================================================

router.get(
    "/products/:id",
    adminAuth,
    requireAdmin,
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

            if (
                rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found"

                });

            }

            res.json({

                success: true,

                product:
                    rows[0]

            });

        } catch (error) {

            console.error(
                "ADMIN SINGLE PRODUCT ERROR:",
                error
            );

            res.status(500).json({

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
// POST /api/admin/shop/products
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


            if (
                !name ||
                !name.trim()
            ) {

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
                !Number.isFinite(productPrice) ||
                productPrice < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product price"

                });

            }


            if (
                !Number.isInteger(productStock) ||
                productStock < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product stock"

                });

            }


            let categoryId =
                category_id
                    ? Number(category_id)
                    : null;


            if (
                categoryId !== null &&
                (
                    !Number.isInteger(categoryId) ||
                    categoryId <= 0
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid category"

                });

            }


            if (categoryId !== null) {

                const [category] =
                    await db.query(`

                        SELECT id

                        FROM shop_categories

                        WHERE id = ?

                        LIMIT 1

                    `, [
                        categoryId
                    ]);

                if (
                    category.length === 0
                ) {

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

                    name.trim(),

                    description
                        ? description.trim()
                        : null,

                    productPrice,

                    productStock,

                    image
                        ? image.trim()
                        : null,

                    productStatus

                ]);


            res.status(201).json({

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

            res.status(500).json({

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
// PUT /api/admin/shop/products/:id
// ============================================================

router.put(
    "/products/:id",
    adminAuth,
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);

            const {

                category_id,

                name,

                description,

                price,

                stock,

                image,

                status

            } = req.body;


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


            if (
                !name ||
                !name.trim()
            ) {

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
                !Number.isFinite(productPrice) ||
                productPrice < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product price"

                });

            }


            if (
                !Number.isInteger(productStock) ||
                productStock < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid product stock"

                });

            }


            let categoryId =
                category_id
                    ? Number(category_id)
                    : null;


            if (
                categoryId !== null &&
                (
                    !Number.isInteger(categoryId) ||
                    categoryId <= 0
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid category"

                });

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

                    name.trim(),

                    description
                        ? description.trim()
                        : null,

                    productPrice,

                    productStock,

                    image
                        ? image.trim()
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


            res.json({

                success: true,

                message:
                    "Product updated successfully"

            });

        } catch (error) {

            console.error(
                "UPDATE PRODUCT ERROR:",
                error
            );

            res.status(500).json({

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
// DELETE PRODUCT
// DELETE /api/admin/shop/products/:id
// ============================================================

router.delete(
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


            // ------------------------------------------------
            // IMPORTANT
            // ------------------------------------------------
            // We do NOT delete products that have already
            // been used in orders.
            // Instead, we deactivate them.
            // ------------------------------------------------

            const [orders] =
                await db.query(`

                    SELECT id

                    FROM shop_order_items

                    WHERE product_id = ?

                    LIMIT 1

                `, [
                    productId
                ]);


            if (
                orders.length > 0
            ) {

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


            res.json({

                success: true,

                message:
                    "Product deleted successfully"

            });

        } catch (error) {

            console.error(
                "DELETE PRODUCT ERROR:",
                error
            );

            res.status(500).json({

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
// UPDATE STOCK ONLY
// PUT /api/admin/shop/products/:id/stock
// ============================================================

router.put(
    "/products/:id/activate",
    adminAuth,
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);

            const stock =
                Number(req.body.stock);


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


            res.json({

                success: true,

                message:
                    "Stock updated successfully"

            });

        } catch (error) {

            console.error(
                "UPDATE STOCK ERROR:",
                error
            );

            res.status(500).json({

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
// UPDATE PRODUCT STATUS
// PUT /api/admin/shop/products/:id/status
// ============================================================

router.put(
    "/products/:id/status",
    auth,
    requireAdmin,
    async (req, res) => {

        try {

            const productId =
                Number(req.params.id);

            const status =
                req.body.status;


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


            res.json({

                success: true,

                message:
                    "Product status updated successfully"

            });

        } catch (error) {

            console.error(
                "UPDATE PRODUCT STATUS ERROR:",
                error
            );

            res.status(500).json({

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
// EXPORT
// ============================================================

module.exports = router;
