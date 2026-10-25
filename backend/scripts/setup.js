
require('dotenv').config({
    path: require('node:path').join(__dirname, '../../.env')
});

const mysql = require('mysql2/promise');
const fs = require('node:fs');
const path = require('node:path');

const { hashPassword } = require('../auth');
const { config, pool } = require('../db');

(async () => {
    let c;

    try {
        if (!/^[a-zA-Z0-9_]+$/.test(config.database)) {
            throw Error(
                'DB_NAME may contain only letters, digits, and underscores.'
            );
        }

        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || '';

        if (username.length > 60 || !username.trim()) {
            throw Error('Invalid ADMIN_USERNAME.');
        }

        if (
            password.length < 10 ||
            password.length > 200 ||
            password === 'choose_your_own_admin_password'
        ) {
            throw Error(
                'Set ADMIN_PASSWORD in .env to your own password of 10–200 characters.'
            );
        }

        c = await mysql.createConnection({
            ...config,
            database: undefined
        });

        await c.query(
            `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );

        await c.changeUser({
            database: config.database
        });

        const sql = fs.readFileSync(
            path.join(__dirname, '../schema.sql'),
            'utf8'
        );

        for (const statement of sql.split(';').filter(x => x.trim())) {
            await c.query(statement);
        }

        const [existing] = await c.execute(
            'SELECT id FROM admins WHERE username=?',
            [username]
        );

        if (!existing.length) {
            await c.execute(
                'INSERT INTO admins (username,password_hash) VALUES (?,?)',
                [
                    username,
                    hashPassword(password)
                ]
            );

            console.log(
                'Admin created using your .env credentials.'
            );
        } else {
            console.log(
                'Admin already exists; password and records were preserved.'
            );
        }

        console.log(
            'Database ready. Optional: npm run seed. Start: npm start'
        );

    } catch (e) {
        console.error('Setup failed:', e.message);
        process.exitCode = 1;

    } finally {
        if (c) {
            await c.end();
        }

        await pool.end();
    }
})();
