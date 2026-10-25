
require('dotenv').config({
    path: require('node:path').join(__dirname, '../.env')
});

const mysql = require('mysql2/promise');

const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tradevision',
    dateStrings: true,
    decimalNumbers: false,
    charset: 'utf8mb4'
};

const pool = mysql.createPool({
    ...config,
    connectionLimit: 5
});

module.exports = {
    pool,
    config
};
