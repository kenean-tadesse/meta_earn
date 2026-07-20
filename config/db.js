const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "122119",
    database: "meta_ern",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.query("SHOW COLUMNS FROM users")
.then(([rows]) => {
    console.log("USER TABLE COLUMNS:", rows);
})
.catch(err => console.log(err));

module.exports = pool;