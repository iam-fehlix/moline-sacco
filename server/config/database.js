
const util = require('util');
const mysql = require('mysql2');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'Hellenatieno@2001',
    database: 'vuka',
}).promise();

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = { pool, connectDB };
