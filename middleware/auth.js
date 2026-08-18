// ======================================================
// META EARN - JWT AUTH MIDDLEWARE
// ======================================================

const jwt = require("jsonwebtoken");

// ======================================================
// JWT SECRET
// ======================================================

const JWT_SECRET =
    process.env.JWT_SECRET || "MetaEarnSuperSecret2026";


// ======================================================
// AUTH MIDDLEWARE
// ======================================================

module.exports = (req, res, next) => {

    try {

        console.log("======================================");
        console.log("AUTH MIDDLEWARE");
        console.log("Request:", req.method, req.originalUrl);
        console.log("Authorization:", req.headers.authorization);
        console.log("======================================");


        // ==================================================
        // GET AUTHORIZATION HEADER
        // ==================================================

        const authHeader = req.headers.authorization;


        if (!authHeader) {

            return res.status(401).json({
                success: false,
                message: "No token provided."
            });

        }


        // ==================================================
        // CHECK BEARER FORMAT
        // ==================================================

        if (!authHeader.startsWith("Bearer ")) {

            return res.status(401).json({
                success: false,
                message: "Invalid authorization format."
            });

        }


        // ==================================================
        // GET TOKEN
        // ==================================================

        const token = authHeader
            .substring(7)
            .trim();


        if (!token) {

            return res.status(401).json({
                success: false,
                message: "Invalid token."
            });

        }


        // ==================================================
        // VERIFY TOKEN
        // ==================================================

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );


        console.log("JWT VERIFIED SUCCESSFULLY");
        console.log("Decoded user:", decoded);


        // ==================================================
        // SAVE USER IN REQUEST
        // ==================================================

        req.user = decoded;


        // ==================================================
        // CONTINUE
        // ==================================================

        next();

    }

    catch (error) {

        console.error("======================================");
        console.error("JWT ERROR:");
        console.error(error.message);
        console.error("======================================");


        return res.status(401).json({
            success: false,
            message: "Unauthorized. Invalid or expired token."
        });

    }

};
