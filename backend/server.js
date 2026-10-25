
require('dotenv').config({
    path: require('node:path').join(__dirname, '../.env')
});

const { pool } = require('./db');
const { createApp } = require('./app');

(async () => {
    try {
        const app = createApp(pool);

        await pool.query('SELECT id FROM admins LIMIT 1');

        const server = app.listen(
            Number(process.env.PORT || 3000),
            process.env.HOST || '127.0.0.1',
            () => {
                console.log(
                    `TradeVision ready: http://localhost:${process.env.PORT || 3000}`
                );
            }
        );

        server.on('error', e => {
            console.error(e.message);
            pool.end();
            process.exitCode = 1;
        });

        for (const sig of ['SIGINT', 'SIGTERM']) {
            process.on(sig, () =>
                server.close(async () => {
                    await pool.end();
                    process.exit(0);
                })
            );
        }

    } catch (e) {
        console.error(
            'Startup failed:',
            e.message,
            '\nCheck .env, start MySQL, and run npm run setup.'
        );

        await pool.end();
        process.exitCode = 1;
    }
})();
