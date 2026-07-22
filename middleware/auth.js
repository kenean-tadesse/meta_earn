const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

   const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET || "MetaEarnSuperSecret2026"
);

console.log("Decoded JWT:", decoded);

req.user = decoded;


console.log("Decoded JWT:", decoded);

req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });

    }
};