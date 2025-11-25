const mariadb = require("mariadb");
require("dotenv").config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query(sql, params);
  } catch (err) {
    console.error("DB error:", err.message);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, query };
