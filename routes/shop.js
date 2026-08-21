const express = require("express");
const router = express.Router();

const db = require("../config/db.js");
const auth = require("../middleware/auth");

// ============================================================
// HELPER
// ============================================================

function getUserId(req) {
    return (
        req.user?.id ||
        req.user?.user_id ||
        req.user?.userId
    );
}


// ============================================================
// GET SHOP CATEGORIES
// GET /api/shop/categories
// ============================================================

router.get("/categories", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                id,
                name,
                description,
                status,
                created_at
            FROM shop_categories
            WHERE status = 'active'
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            categories: rows
        });

    } catch (error) {

        console.error("SHOP CATEGORIES ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load shop categories",
            error: error.message
        });

    }

});


// ============================================================
// GET SHOP PRODUCTS
// GET /api/shop/products
// ============================================================

router.get("/products", async (req, res) => {

    try {

        const [rows] = await db.query(`
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

            WHERE p.status = 'active'

            ORDER BY p.created_at DESC
        `);

        res.json({
            success: true,
            products: rows
        });

    } catch (error) {

        console.error("SHOP PRODUCTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load products",
            error: error.message
        });

    }

});


// ============================================================
// GET SINGLE PRODUCT
// GET /api/shop/products/:id
// ============================================================

router.get("/products/:id", async (req, res) => {

    try {

        const productId = Number(req.params.id);

        if (!Number.isInteger(productId) || productId <= 0) {

            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });

        }

        const [rows] = await db.query(`
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

            WHERE
                p.id = ?
                AND p.status = 'active'

            LIMIT 1
        `, [productId]);

        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        res.json({
            success: true,
            product: rows[0]
        });

    } catch (error) {

        console.error("SINGLE PRODUCT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load product",
            error: error.message
        });

    }

});


// ============================================================
// GET CART
// GET /api/shop/cart
// ============================================================

router.get(
    "/cart",
    auth,
    async (req, res) => {

        try {

            const userId = getUserId(req);

            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message: "User authentication required"
                });

            }


            // ------------------------------------------------
            // FIND USER CART
            // ------------------------------------------------

            let [carts] = await db.query(`
                SELECT
                    id,
                    user_id
                FROM shop_cart
                WHERE user_id = ?
                LIMIT 1
            `, [userId]);


            let cartId;


            // ------------------------------------------------
            // CREATE CART IF NEEDED
            // ------------------------------------------------

            if (carts.length === 0) {

                const [result] = await db.query(`
                    INSERT INTO shop_cart
                    (user_id)
                    VALUES (?)
                `, [userId]);

                cartId = result.insertId;

            } else {

                cartId = carts[0].id;

            }


            // ------------------------------------------------
            // GET CART ITEMS
            // ------------------------------------------------

            const [rows] = await db.query(`
                SELECT

                    ci.id AS cart_item_id,
                    ci.cart_id,
                    ci.product_id,
                    ci.quantity,

                    p.name,
                    p.description,
                    p.price,
                    p.stock,
                    p.image,
                    p.status,

                    (
                        p.price * ci.quantity
                    ) AS total,

                    c.name AS category_name

                FROM shop_cart_items ci

                INNER JOIN shop_products p
                    ON ci.product_id = p.id

                LEFT JOIN shop_categories c
                    ON p.category_id = c.id

                WHERE ci.cart_id = ?

                ORDER BY ci.created_at DESC
            `, [cartId]);


            // ------------------------------------------------
            // SUMMARY
            // ------------------------------------------------

            const subtotal = rows.reduce(
                (sum, item) =>
                    sum + Number(item.total || 0),
                0
            );

            const itemCount = rows.reduce(
                (sum, item) =>
                    sum + Number(item.quantity || 0),
                0
            );


            res.json({

                success: true,

                cart: rows,

                summary: {

                    item_count: itemCount,

                    subtotal: Number(
                        subtotal.toFixed(2)
                    ),

                    total: Number(
                        subtotal.toFixed(2)
                    )

                }

            });

        } catch (error) {

            console.error("GET CART ERROR:", error);

            res.status(500).json({
                success: false,
                message: "Failed to load cart",
                error: error.message
            });

        }

    }
);


// ============================================================
// ADD TO CART
// POST /api/shop/cart
// ============================================================

router.post(
    "/cart",
    auth,
    async (req, res) => {

        try {

            const userId = getUserId(req);

            const productId = Number(
                req.body.product_id
            );

            const quantity = Number(
                req.body.quantity || 1
            );


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message: "User authentication required"
                });

            }


            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID"
                });

            }


            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid quantity"
                });

            }


            // ------------------------------------------------
            // GET PRODUCT
            // ------------------------------------------------

            const [products] = await db.query(`
                SELECT
                    id,
                    name,
                    price,
                    stock,
                    status
                FROM shop_products
                WHERE id = ?
                LIMIT 1
            `, [productId]);


            if (products.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });

            }


            const product = products[0];


            if (product.status !== "active") {

                return res.status(400).json({
                    success: false,
                    message: "Product is not available"
                });

            }


            if (Number(product.stock) <= 0) {

                return res.status(400).json({
                    success: false,
                    message: "Product is out of stock"
                });

            }


            if (
                quantity >
                Number(product.stock)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Only ${product.stock} item(s) available`
                });

            }


            // ------------------------------------------------
            // FIND OR CREATE CART
            // ------------------------------------------------

            let [carts] = await db.query(`
                SELECT id
                FROM shop_cart
                WHERE user_id = ?
                LIMIT 1
            `, [userId]);


            let cartId;


            if (carts.length === 0) {

                const [cartResult] = await db.query(`
                    INSERT INTO shop_cart
                    (user_id)
                    VALUES (?)
                `, [userId]);

                cartId = cartResult.insertId;

            } else {

                cartId = carts[0].id;

            }


            // ------------------------------------------------
            // CHECK EXISTING ITEM
            // ------------------------------------------------

            const [existing] = await db.query(`
                SELECT
                    id,
                    quantity
                FROM shop_cart_items
                WHERE
                    cart_id = ?
                    AND product_id = ?
                LIMIT 1
            `, [
                cartId,
                productId
            ]);


            if (existing.length > 0) {

                const newQuantity =
                    Number(existing[0].quantity) +
                    quantity;


                if (
                    newQuantity >
                    Number(product.stock)
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            `Only ${product.stock} item(s) available`
                    });

                }


                await db.query(`
                    UPDATE shop_cart_items
                    SET quantity = ?
                    WHERE id = ?
                `, [
                    newQuantity,
                    existing[0].id
                ]);


                return res.json({
                    success: true,
                    message:
                        "Product quantity updated in cart"
                });

            }


            // ------------------------------------------------
            // INSERT NEW ITEM
            // ------------------------------------------------

            await db.query(`
                INSERT INTO shop_cart_items
                (
                    cart_id,
                    product_id,
                    quantity
                )
                VALUES (?, ?, ?)
            `, [
                cartId,
                productId,
                quantity
            ]);


            res.status(201).json({

                success: true,

                message:
                    "Product added to cart"

            });

        } catch (error) {

            console.error("ADD CART ERROR:", error);

            res.status(500).json({
                success: false,
                message:
                    "Failed to add product to cart",
                error: error.message
            });

        }

    }
);


// ============================================================
// UPDATE CART ITEM
// PUT /api/shop/cart/:id
// ============================================================

router.put(
    "/cart/:id",
    auth,
    async (req, res) => {

        try {

            const userId = getUserId(req);

            const cartItemId =
                Number(req.params.id);

            const quantity =
                Number(req.body.quantity);


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "User authentication required"
                });

            }


            if (
                !Number.isInteger(cartItemId) ||
                cartItemId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid cart item ID"
                });

            }


            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Quantity must be greater than zero"
                });

            }


            // ------------------------------------------------
            // GET ITEM
            // ------------------------------------------------

            const [rows] = await db.query(`
                SELECT

                    ci.id,
                    ci.quantity,

                    p.stock,
                    p.status

                FROM shop_cart_items ci

                INNER JOIN shop_cart c
                    ON ci.cart_id = c.id

                INNER JOIN shop_products p
                    ON ci.product_id = p.id

                WHERE
                    ci.id = ?
                    AND c.user_id = ?

                LIMIT 1
            `, [
                cartItemId,
                userId
            ]);


            if (rows.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Cart item not found"
                });

            }


            const item = rows[0];


            if (item.status !== "active") {

                return res.status(400).json({
                    success: false,
                    message:
                        "Product is no longer available"
                });

            }


            if (
                quantity >
                Number(item.stock)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Only ${item.stock} item(s) available`
                });

            }


            await db.query(`
                UPDATE shop_cart_items ci

                INNER JOIN shop_cart c
                    ON ci.cart_id = c.id

                SET ci.quantity = ?

                WHERE
                    ci.id = ?
                    AND c.user_id = ?
            `, [
                quantity,
                cartItemId,
                userId
            ]);


            res.json({
                success: true,
                message:
                    "Cart updated successfully"
            });

        } catch (error) {

            console.error(
                "UPDATE CART ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update cart",
                error: error.message
            });

        }

    }
);


// ============================================================
// REMOVE CART ITEM
// DELETE /api/shop/cart/:id
// ============================================================

router.delete(
    "/cart/:id",
    auth,
    async (req, res) => {

        try {

            const userId = getUserId(req);

            const cartItemId =
                Number(req.params.id);


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "User authentication required"
                });

            }


            if (
                !Number.isInteger(cartItemId) ||
                cartItemId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid cart item ID"
                });

            }


            const [result] = await db.query(`
                DELETE ci

                FROM shop_cart_items ci

                INNER JOIN shop_cart c
                    ON ci.cart_id = c.id

                WHERE
                    ci.id = ?
                    AND c.user_id = ?
            `, [
                cartItemId,
                userId
            ]);


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Cart item not found"
                });

            }


            res.json({
                success: true,
                message:
                    "Product removed from cart"
            });

        } catch (error) {

            console.error(
                "REMOVE CART ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to remove cart item",
                error: error.message
            });

        }

    }
);


// ============================================================
// CHECKOUT / CREATE SHOP ORDER
// POST /api/shop/orders
// ============================================================

router.post(
    "/orders",
    auth,
    async (req, res) => {

        let connection = null;

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "User authentication required"
                });

            }


            const {
                delivery_name,
                delivery_phone,
                delivery_address,
                notes
            } = req.body;


            // ------------------------------------------------
            // VALIDATE DELIVERY INFORMATION
            // ------------------------------------------------

            const cleanDeliveryName =
                String(
                    delivery_name || ""
                ).trim();

            const cleanDeliveryPhone =
                String(
                    delivery_phone || ""
                ).trim();

            const cleanDeliveryAddress =
                String(
                    delivery_address || ""
                ).trim();

            const cleanNotes =
                notes !== undefined &&
                notes !== null
                    ? String(notes).trim()
                    : null;


            if (!cleanDeliveryName) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Delivery name is required"
                });

            }


            if (!cleanDeliveryPhone) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Delivery phone is required"
                });

            }


            if (!cleanDeliveryAddress) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Delivery address is required"
                });

            }


            // ------------------------------------------------
            // OPEN TRANSACTION
            // ------------------------------------------------

            connection =
                await db.getConnection();

            await connection.beginTransaction();


            // ------------------------------------------------
            // LOCK USER ROW
            // ------------------------------------------------

            const [users] =
                await connection.query(`
                    SELECT
                        id,
                        fullname,
                        username,
                        phone,
                        balance
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    FOR UPDATE
                `, [
                    userId
                ]);


            if (users.length === 0) {

                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });

            }


            const user =
                users[0];


            const currentBalance =
                Number(
                    user.balance || 0
                );


            // ------------------------------------------------
            // LOAD CART
            // ------------------------------------------------

            const [cart] =
                await connection.query(`
                    SELECT

                        c.id AS cart_id,

                        ci.id AS cart_item_id,
                        ci.product_id,
                        ci.quantity,

                        p.name,
                        p.price,
                        p.stock,
                        p.status,
                        p.image

                    FROM shop_cart c

                    INNER JOIN shop_cart_items ci
                        ON ci.cart_id = c.id

                    INNER JOIN shop_products p
                        ON ci.product_id = p.id

                    WHERE c.user_id = ?

                    ORDER BY ci.id ASC

                    FOR UPDATE
                `, [
                    userId
                ]);


            if (cart.length === 0) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Your shopping cart is empty"
                });

            }


            // ------------------------------------------------
            // VALIDATE CART + CALCULATE TOTAL
            // ------------------------------------------------

            let totalAmount = 0;


            for (
                const item
                of cart
            ) {

                const quantity =
                    Number(
                        item.quantity
                    );

                const price =
                    Number(
                        item.price
                    );

                const stock =
                    Number(
                        item.stock
                    );


                if (
                    !Number.isInteger(quantity) ||
                    quantity <= 0
                ) {

                    await connection.rollback();

                    return res.status(400).json({
                        success: false,
                        message:
                            `Invalid quantity for ${item.name}`
                    });

                }


                if (
                    item.status !== "active"
                ) {

                    await connection.rollback();

                    return res.status(400).json({
                        success: false,
                        message:
                            `${item.name} is no longer available`
                    });

                }


                if (
                    stock <= 0
                ) {

                    await connection.rollback();

                    return res.status(400).json({
                        success: false,
                        message:
                            `${item.name} is out of stock`
                    });

                }


                if (
                    quantity > stock
                ) {

                    await connection.rollback();

                    return res.status(400).json({
                        success: false,
                        message:
                            `${item.name} has only ${stock} item(s) available`
                    });

                }


                totalAmount +=
                    price * quantity;

            }


            totalAmount =
                Number(
                    totalAmount.toFixed(2)
                );


            // ------------------------------------------------
            // CHECK BALANCE
            // ------------------------------------------------

            if (
                currentBalance <
                totalAmount
            ) {

                await connection.rollback();

                return res.status(400).json({

                    success: false,

                    message:
                        "Insufficient Meta Earn balance",

                    balance:
                        currentBalance,

                    required:
                        totalAmount,

                    shortage:
                        Number(
                            (
                                totalAmount -
                                currentBalance
                            ).toFixed(2)
                        )

                });

            }


            // ------------------------------------------------
            // GENERATE UNIQUE ORDER NUMBER
            // ------------------------------------------------

            const orderNumber =
                `ME-${Date.now()}-${userId}-${Math.floor(
                    1000 +
                    Math.random() * 9000
                )}`;


            // ------------------------------------------------
            // CREATE SHOP ORDER
            //
            // Uses the ACTUAL shop_orders columns:
            //
            // order_number
            // user_id
            // total_amount
            // status
            // delivery_name
            // delivery_phone
            // delivery_address
            // notes
            // ------------------------------------------------

            const [orderResult] =
                await connection.query(`
                    INSERT INTO shop_orders
                    (
                        order_number,
                        user_id,
                        total_amount,
                        status,
                        delivery_name,
                        delivery_phone,
                        delivery_address,
                        notes
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )
                `, [

                    orderNumber,

                    userId,

                    totalAmount,

                    "pending",

                    cleanDeliveryName,

                    cleanDeliveryPhone,

                    cleanDeliveryAddress,

                    cleanNotes

                ]);


            const orderId =
                orderResult.insertId;


            // ------------------------------------------------
            // CREATE ORDER ITEMS
            //
            // Uses the ACTUAL shop_order_items columns:
            //
            // order_id
            // product_id
            // quantity
            // price
            // total
            // ------------------------------------------------

            for (
                const item
                of cart
            ) {

                const quantity =
                    Number(
                        item.quantity
                    );

                const price =
                    Number(
                        item.price
                    );

                const itemTotal =
                    Number(
                        (
                            price *
                            quantity
                        ).toFixed(2)
                    );


                await connection.query(`
                    INSERT INTO shop_order_items
                    (
                        order_id,
                        product_id,
                        quantity,
                        price,
                        total
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )
                `, [

                    orderId,

                    item.product_id,

                    quantity,

                    price,

                    itemTotal

                ]);

            }


            // ------------------------------------------------
            // DEDUCT USER WALLET BALANCE
            //
            // This only modifies users.balance.
            // ------------------------------------------------

            const [balanceUpdate] =
                await connection.query(`
                    UPDATE users

                    SET
                        balance = balance - ?

                    WHERE
                        id = ?

                        AND balance >= ?
                `, [

                    totalAmount,

                    userId,

                    totalAmount

                ]);


            if (
                balanceUpdate.affectedRows !== 1
            ) {

                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        "Unable to deduct wallet balance"
                });

            }


            // ------------------------------------------------
            // REDUCE STOCK
            // ------------------------------------------------

            for (
                const item
                of cart
            ) {

                const quantity =
                    Number(
                        item.quantity
                    );


                const [stockUpdate] =
                    await connection.query(`
                        UPDATE shop_products

                        SET
                            stock = stock - ?

                        WHERE
                            id = ?

                            AND stock >= ?

                            AND status = 'active'
                    `, [

                        quantity,

                        item.product_id,

                        quantity

                    ]);


                if (
                    stockUpdate.affectedRows !== 1
                ) {

                    await connection.rollback();

                    return res.status(400).json({

                        success: false,

                        message:
                            `${item.name} stock changed before checkout completed. Please try again.`

                    });

                }

            }


            // ------------------------------------------------
            // CLEAR CART ITEMS
            // ------------------------------------------------

            const cartIds = [
                ...new Set(
                    cart.map(
                        item =>
                            item.cart_id
                    )
                )
            ];


            for (
                const cartId
                of cartIds
            ) {

                await connection.query(`
                    DELETE FROM shop_cart_items

                    WHERE cart_id = ?
                `, [
                    cartId
                ]);

            }


            // ------------------------------------------------
            // DELETE USER CART
            // ------------------------------------------------

            await connection.query(`
                DELETE FROM shop_cart

                WHERE user_id = ?
            `, [
                userId
            ]);


            // ------------------------------------------------
            // GET NEW BALANCE
            // ------------------------------------------------

            const [balanceRows] =
                await connection.query(`
                    SELECT
                        balance

                    FROM users

                    WHERE id = ?

                    LIMIT 1
                `, [
                    userId
                ]);


            const newBalance =
                Number(
                    balanceRows[0]?.balance || 0
                );


            // ------------------------------------------------
            // COMMIT
            // ------------------------------------------------

            await connection.commit();


            // ------------------------------------------------
            // SUCCESS RESPONSE
            // ------------------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    "Order placed successfully",

                order: {

                    id:
                        orderId,

                    order_number:
                        orderNumber,

                    user_id:
                        userId,

                    total_amount:
                        totalAmount,

                    status:
                        "pending"

                },

                wallet: {

                    previous_balance:
                        currentBalance,

                    amount_paid:
                        totalAmount,

                    remaining_balance:
                        newBalance

                }

            });


        } catch (error) {

            console.error(
                "===================================="
            );

            console.error(
                "SHOP CHECKOUT ERROR"
            );

            console.error(
                error
            );

            console.error(
                "===================================="
            );


            if (
                connection
            ) {

                try {

                    await connection.rollback();

                } catch (rollbackError) {

                    console.error(
                        "ROLLBACK ERROR:",
                        rollbackError
                    );

                }

            }


            return res.status(500).json({

                success: false,

                message:
                    "Checkout failed. No payment was completed.",

                error:
                    error.message,

                code:
                    error.code || null

            });


        } finally {

            if (
                connection
            ) {

                connection.release();

            }

        }

    }
);


// ============================================================
// GET USER SHOP ORDERS
// GET /api/shop/orders
// ============================================================

router.get(
    "/orders",
    auth,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "User authentication required"
                });

            }


            const [orders] =
                await db.query(`
                    SELECT
                        id,
                        user_id,
                        total_amount,
                        status,
                        delivery_name,
                        delivery_phone,
                        delivery_address,
                        notes,
                        created_at,
                        updated_at

                    FROM shop_orders

                    WHERE user_id = ?

                    ORDER BY
                        created_at DESC
                `, [userId]);


            res.json({

                success: true,

                orders

            });


        } catch (error) {

            console.error(
                "SHOP ORDERS ERROR:",
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
// GET SINGLE USER ORDER
// GET /api/shop/orders/:id
// ============================================================

router.get(
    "/orders/:id",
    auth,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);

            const orderId =
                Number(req.params.id);


            if (!userId) {

                return res.status(401).json({
                    success: false,
                    message:
                        "User authentication required"
                });

            }


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


            const [orders] =
                await db.query(`
                    SELECT

                        id,
                        user_id,
                        total_amount,
                        status,
                        delivery_name,
                        delivery_phone,
                        delivery_address,
                        notes,
                        created_at,
                        updated_at

                    FROM shop_orders

                    WHERE
                        id = ?
                        AND user_id = ?

                    LIMIT 1
                `, [
                    orderId,
                    userId
                ]);


            if (orders.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Order not found"
                });

            }


            const [items] =
                await db.query(`
                    SELECT

                        id,
                        order_id,
                        product_id,
                        product_name,
                        quantity,
                        unit_price,
                        subtotal,
                        created_at

                    FROM shop_order_items

                    WHERE order_id = ?

                    ORDER BY id ASC
                `, [orderId]);


            const [payments] =
                await db.query(`
                    SELECT

                        id,
                        order_id,
                        user_id,
                        amount,
                        payment_method,
                        status,
                        transaction_reference,
                        created_at

                    FROM shop_payments

                    WHERE
                        order_id = ?
                        AND user_id = ?

                    ORDER BY id DESC
                `, [
                    orderId,
                    userId
                ]);


            res.json({

                success: true,

                order:
                    orders[0],

                items,

                payments

            });


        } catch (error) {

            console.error(
                "SINGLE SHOP ORDER ERROR:",
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
// ADMIN SHOP MANAGEMENT
// ============================================================
// NEW CODE ONLY
// Existing customer shop/cart/order code above is unchanged.
// ============================================================


// ============================================================
// ADMIN AUTHENTICATION HELPER
// ============================================================

async function adminAuth(req, res, next) {

    try {

        // Use your existing authentication middleware
        // so the existing JWT system is not changed.

        auth(req, res, () => {

            const user = req.user || {};

            const role =
                user.role_name ||
                user.role ||
                user.user_role ||
                user.roleName ||
                "";

            const normalizedRole =
                String(role).toLowerCase().trim();

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
// ADMIN - GET ALL PRODUCTS
// GET /api/shop/admin/products
// ============================================================

router.get(
    "/admin/products",
    adminAuth,
    async (req, res) => {

        try {

            const search =
                String(
                    req.query.search || ""
                ).trim();

            const categoryId =
                req.query.category_id
                    ? Number(req.query.category_id)
                    : null;

            const status =
                req.query.status
                    ? String(req.query.status).trim()
                    : null;


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


            // ------------------------------------------------
            // SEARCH
            // ------------------------------------------------

            if (search) {

                sql += `

                    AND (
                        p.name LIKE ?
                        OR p.description LIKE ?
                    )

                `;

                const searchValue =
                    `%${search}%`;

                params.push(
                    searchValue,
                    searchValue
                );

            }


            // ------------------------------------------------
            // CATEGORY FILTER
            // ------------------------------------------------

            if (
                categoryId &&
                Number.isInteger(categoryId) &&
                categoryId > 0
            ) {

                sql += `
                    AND p.category_id = ?
                `;

                params.push(categoryId);

            }


            // ------------------------------------------------
            // STATUS FILTER
            // ------------------------------------------------

            if (
                status &&
                ["active", "inactive"].includes(status)
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

                products: rows,

                count:
                    rows.length

            });


        } catch (error) {

            console.error(
                "ADMIN PRODUCTS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load admin products",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - GET SINGLE PRODUCT
// GET /api/shop/admin/products/:id
// ============================================================

router.get(
    "/admin/products/:id",
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


            if (rows.length === 0) {

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
// ADMIN - CREATE PRODUCT
// POST /api/shop/admin/products
// ============================================================

router.post(
    "/admin/products",
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


            // ------------------------------------------------
            // VALIDATE NAME
            // ------------------------------------------------

            if (
                !name ||
                !String(name).trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product name is required"

                });

            }


            const productName =
                String(name).trim();


            // ------------------------------------------------
            // VALIDATE PRICE
            // ------------------------------------------------

            const productPrice =
                Number(price);


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


            // ------------------------------------------------
            // VALIDATE STOCK
            // ------------------------------------------------

            const productStock =
                Number(
                    stock === undefined
                        ? 0
                        : stock
                );


            if (
                !Number.isInteger(productStock) ||
                productStock < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Stock must be a non-negative integer"

                });

            }


            // ------------------------------------------------
            // CATEGORY
            // ------------------------------------------------

            let categoryId = null;


            if (
                category_id !== undefined &&
                category_id !== null &&
                category_id !== ""
            ) {

                categoryId =
                    Number(category_id);


                if (
                    !Number.isInteger(categoryId) ||
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


                if (category.length === 0) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Selected category does not exist"

                    });

                }

            }


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            const productStatus =
                ["active", "inactive"].includes(
                    String(status || "active")
                )
                    ? String(status || "active")
                    : "active";


            // ------------------------------------------------
            // IMAGE
            // ------------------------------------------------

            const productImage =
                image
                    ? String(image).trim()
                    : null;


            // ------------------------------------------------
            // INSERT
            // ------------------------------------------------

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

                    VALUES (?, ?, ?, ?, ?, ?, ?)

                `, [

                    categoryId,

                    productName,

                    description
                        ? String(description).trim()
                        : null,

                    productPrice,

                    productStock,

                    productImage,

                    productStatus

                ]);


            // ------------------------------------------------
            // RETURN CREATED PRODUCT
            // ------------------------------------------------

            const [products] =
                await db.query(`

                    SELECT

                        p.*,

                        c.name AS category_name

                    FROM shop_products p

                    LEFT JOIN shop_categories c
                        ON p.category_id = c.id

                    WHERE p.id = ?

                    LIMIT 1

                `, [
                    result.insertId
                ]);


            res.status(201).json({

                success: true,

                message:
                    "Product created successfully",

                product:
                    products[0]

            });


        } catch (error) {

            console.error(
                "ADMIN CREATE PRODUCT ERROR:",
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
// ADMIN - UPDATE PRODUCT
// PUT /api/shop/admin/products/:id
// ============================================================

router.put(
    "/admin/products/:id",
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


            const [existing] =
                await db.query(`

                    SELECT id

                    FROM shop_products

                    WHERE id = ?

                    LIMIT 1

                `, [
                    productId
                ]);


            if (existing.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found"

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


            // ------------------------------------------------
            // VALIDATE NAME
            // ------------------------------------------------

            if (
                !name ||
                !String(name).trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Product name is required"

                });

            }


            // ------------------------------------------------
            // PRICE
            // ------------------------------------------------

            const productPrice =
                Number(price);


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


            // ------------------------------------------------
            // STOCK
            // ------------------------------------------------

            const productStock =
                Number(stock);


            if (
                !Number.isInteger(productStock) ||
                productStock < 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Stock must be a non-negative integer"

                });

            }


            // ------------------------------------------------
            // CATEGORY
            // ------------------------------------------------

            let categoryId = null;


            if (
                category_id !== undefined &&
                category_id !== null &&
                category_id !== ""
            ) {

                categoryId =
                    Number(category_id);


                if (
                    !Number.isInteger(categoryId) ||
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


                if (category.length === 0) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Selected category does not exist"

                    });

                }

            }


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            const productStatus =
                ["active", "inactive"].includes(
                    String(status || "active")
                )
                    ? String(status || "active")
                    : "active";


            // ------------------------------------------------
            // UPDATE
            // ------------------------------------------------

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

                String(name).trim(),

                description
                    ? String(description).trim()
                    : null,

                productPrice,

                productStock,

                image
                    ? String(image).trim()
                    : null,

                productStatus,

                productId

            ]);


            // ------------------------------------------------
            // RETURN UPDATED PRODUCT
            // ------------------------------------------------

            const [products] =
                await db.query(`

                    SELECT

                        p.*,

                        c.name AS category_name

                    FROM shop_products p

                    LEFT JOIN shop_categories c
                        ON p.category_id = c.id

                    WHERE p.id = ?

                    LIMIT 1

                `, [
                    productId
                ]);


            res.json({

                success: true,

                message:
                    "Product updated successfully",

                product:
                    products[0]

            });


        } catch (error) {

            console.error(
                "ADMIN UPDATE PRODUCT ERROR:",
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
// ADMIN - DELETE PRODUCT
// DELETE /api/shop/admin/products/:id
// ============================================================

router.delete(
    "/admin/products/:id",
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
            // CHECK PRODUCT
            // ------------------------------------------------

            const [products] =
                await db.query(`

                    SELECT

                        id,

                        name

                    FROM shop_products

                    WHERE id = ?

                    LIMIT 1

                `, [
                    productId
                ]);


            if (products.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product not found"

                });

            }


            // ------------------------------------------------
            // IMPORTANT:
            // Soft delete instead of physical delete.
            //
            // This protects old order records.
            // ------------------------------------------------

            await db.query(`

                UPDATE shop_products

                SET status = 'inactive'

                WHERE id = ?

            `, [
                productId
            ]);


            res.json({

                success: true,

                message:
                    "Product deactivated successfully",

                product_id:
                    productId,

                product_name:
                    products[0].name

            });


        } catch (error) {

            console.error(
                "ADMIN DELETE PRODUCT ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to deactivate product",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - ACTIVATE PRODUCT
// PUT /api/shop/admin/products/:id/activate
// ============================================================

router.put(
    "/admin/products/:id/activate",
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


            const [result] =
                await db.query(`

                    UPDATE shop_products

                    SET status = 'active'

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
                    "Product activated successfully"

            });


        } catch (error) {

            console.error(
                "ADMIN ACTIVATE PRODUCT ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to activate product",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - GET ALL CATEGORIES
// GET /api/shop/admin/categories
// ============================================================

router.get(
    "/admin/categories",
    adminAuth,
    async (req, res) => {

        try {

            const [rows] =
                await db.query(`

                    SELECT

                        c.id,

                        c.name,

                        c.description,

                        c.status,

                        c.created_at,

                        COUNT(p.id) AS product_count

                    FROM shop_categories c

                    LEFT JOIN shop_products p
                        ON p.category_id = c.id

                    GROUP BY

                        c.id,
                        c.name,
                        c.description,
                        c.status,
                        c.created_at

                    ORDER BY
                        c.name ASC

                `);


            res.json({

                success: true,

                categories:
                    rows

            });


        } catch (error) {

            console.error(
                "ADMIN CATEGORIES ERROR:",
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
// ADMIN - CREATE CATEGORY
// POST /api/shop/admin/categories
// ============================================================

router.post(
    "/admin/categories",
    adminAuth,
    async (req, res) => {

        try {

            const {

                name,

                description,

                status

            } = req.body;


            if (
                !name ||
                !String(name).trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Category name is required"

                });

            }


            const categoryName =
                String(name).trim();


            const categoryStatus =
                ["active", "inactive"].includes(
                    String(status || "active")
                )
                    ? String(status || "active")
                    : "active";


            // ------------------------------------------------
            // DUPLICATE CHECK
            // ------------------------------------------------

            const [existing] =
                await db.query(`

                    SELECT id

                    FROM shop_categories

                    WHERE name = ?

                    LIMIT 1

                `, [
                    categoryName
                ]);


            if (existing.length > 0) {

                return res.status(409).json({

                    success: false,

                    message:
                        "A category with this name already exists"

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

                    VALUES (?, ?, ?)

                `, [

                    categoryName,

                    description
                        ? String(description).trim()
                        : null,

                    categoryStatus

                ]);


            const [categories] =
                await db.query(`

                    SELECT *

                    FROM shop_categories

                    WHERE id = ?

                    LIMIT 1

                `, [
                    result.insertId
                ]);


            res.status(201).json({

                success: true,

                message:
                    "Category created successfully",

                category:
                    categories[0]

            });


        } catch (error) {

            console.error(
                "ADMIN CREATE CATEGORY ERROR:",
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
// ADMIN - UPDATE CATEGORY
// PUT /api/shop/admin/categories/:id
// ============================================================

router.put(
    "/admin/categories/:id",
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


            const {

                name,

                description,

                status

            } = req.body;


            if (
                !name ||
                !String(name).trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Category name is required"

                });

            }


            const categoryName =
                String(name).trim();


            const categoryStatus =
                ["active", "inactive"].includes(
                    String(status || "active")
                )
                    ? String(status || "active")
                    : "active";


            const [result] =
                await db.query(`

                    UPDATE shop_categories

                    SET

                        name = ?,

                        description = ?,

                        status = ?

                    WHERE id = ?

                `, [

                    categoryName,

                    description
                        ? String(description).trim()
                        : null,

                    categoryStatus,

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


            const [categories] =
                await db.query(`

                    SELECT *

                    FROM shop_categories

                    WHERE id = ?

                    LIMIT 1

                `, [
                    categoryId
                ]);


            res.json({

                success: true,

                message:
                    "Category updated successfully",

                category:
                    categories[0]

            });


        } catch (error) {

            console.error(
                "ADMIN UPDATE CATEGORY ERROR:",
                error
            );


            // Duplicate category name
            if (
                error.code ===
                "ER_DUP_ENTRY"
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "A category with this name already exists"

                });

            }


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
// ADMIN - ACTIVATE / DEACTIVATE CATEGORY
// PUT /api/shop/admin/categories/:id/status
// ============================================================

router.put(
    "/admin/categories/:id/status",
    adminAuth,
    async (req, res) => {

        try {

            const categoryId =
                Number(req.params.id);

            const newStatus =
                String(
                    req.body.status || ""
                ).trim();


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
                !["active", "inactive"]
                    .includes(newStatus)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Status must be active or inactive"

                });

            }


            const [result] =
                await db.query(`

                    UPDATE shop_categories

                    SET status = ?

                    WHERE id = ?

                `, [

                    newStatus,

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
                    `Category ${newStatus} successfully`

            });


        } catch (error) {

            console.error(
                "ADMIN CATEGORY STATUS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to change category status",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - SHOP STATISTICS
// GET /api/shop/admin/statistics
// ============================================================

router.get(
    "/admin/statistics",
    adminAuth,
    async (req, res) => {

        try {

            const [[products]] =
                await db.query(`

                    SELECT

                        COUNT(*) AS total,

                        SUM(
                            status = 'active'
                        ) AS active,

                        SUM(
                            status = 'inactive'
                        ) AS inactive,

                        SUM(
                            stock = 0
                        ) AS out_of_stock,

                        COALESCE(
                            SUM(stock),
                            0
                        ) AS total_stock

                    FROM shop_products

                `);


            const [[categories]] =
                await db.query(`

                    SELECT

                        COUNT(*) AS total,

                        SUM(
                            status = 'active'
                        ) AS active,

                        SUM(
                            status = 'inactive'
                        ) AS inactive

                    FROM shop_categories

                `);


            const [[orders]] =
                await db.query(`

                    SELECT

                        COUNT(*) AS total_orders,

                        COALESCE(
                            SUM(total_amount),
                            0
                        ) AS total_sales

                    FROM shop_orders

                `);


            res.json({

                success: true,

                statistics: {

                    products: {

                        total:
                            Number(
                                products.total || 0
                            ),

                        active:
                            Number(
                                products.active || 0
                            ),

                        inactive:
                            Number(
                                products.inactive || 0
                            ),

                        out_of_stock:
                            Number(
                                products.out_of_stock || 0
                            ),

                        total_stock:
                            Number(
                                products.total_stock || 0
                            )

                    },

                    categories: {

                        total:
                            Number(
                                categories.total || 0
                            ),

                        active:
                            Number(
                                categories.active || 0
                            ),

                        inactive:
                            Number(
                                categories.inactive || 0
                            )

                    },

                    orders: {

                        total:
                            Number(
                                orders.total_orders || 0
                            ),

                        total_sales:
                            Number(
                                orders.total_sales || 0
                            )

                    }

                }

            });


        } catch (error) {

            console.error(
                "ADMIN SHOP STATISTICS ERROR:",
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
// EXPORT
// ============================================================

module.exports = router;
