const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({

    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0

});


async function testConnection() {

    try {

        const connection = await db.getConnection();

        console.log("====================================");
        console.log("✅ AIVEN MYSQL CONNECTED SUCCESSFULLY");
        console.log("====================================");

        connection.release();

    } catch (error) {

        console.log("====================================");
        console.log("DATABASE CONNECTION FAILED");
        console.log(error.message);
        console.log("====================================");

    }

}


testConnection();


module.exports = db;