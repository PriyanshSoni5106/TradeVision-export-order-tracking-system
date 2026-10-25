
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { randomBytes } = require('node:crypto');
const path = require('node:path');

const v = require('./validation');
const { verifyPassword, hashPassword } = require('./auth');

const dummyHash = hashPassword('dummy-account-password');

function createApp(
    pool,
    {
        secret = process.env.SESSION_SECRET,
        production = process.env.NODE_ENV === 'production'
    } = {}
) {
    if (
        !secret ||
        secret.length < 32 ||
        secret.startsWith('replace_this')
    ) {
        throw Error(
            'Set SESSION_SECRET in .env to a random string of at least 32 characters.'
        );
    }

    const app = express();

    app.disable('x-powered-by');

    app.use('/api', (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    'upgrade-insecure-requests': null
                }
            },
            strictTransportSecurity: production ? undefined : false
        })
    );

    app.use(express.json({ limit: '16kb' }));

    app.use('/api', (req, res, next) => {
        if (
            ['POST', 'PUT', 'PATCH'].includes(req.method) &&
            (
                !req.body ||
                typeof req.body !== 'object' ||
                Array.isArray(req.body)
            )
        ) {
            return res.status(400).json({
                error: 'Send a JSON object.'
            });
        }

        next();
    });

    app.use(
        session({
            name: 'tradevision.sid',
            secret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                sameSite: 'strict',
                secure: production,
                maxAge: 8 * 60 * 60 * 1000
            }
        })
    );

    const token = req =>
        req.session.csrf ||= randomBytes(32).toString('hex');

    app.get('/api/session', (req, res) => {
        res.json({
            authenticated: !!req.session.admin,
            username: req.session.admin?.username,
            csrf: token(req)
        });
    });

    app.use('/api', (req, res, next) => {
        if (
            !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
            (
                !req.session.csrf ||
                req.get('X-CSRF-Token') !== req.session.csrf
            )
        ) {
            return res.status(403).json({
                error: 'Session expired. Refresh the page and try again.'
            });
        }

        next();
    });

    app.post(
        '/api/login',
        rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 15,
            standardHeaders: 'draft-7',
            legacyHeaders: false,
            message: {
                error: 'Too many login attempts. Try again in 15 minutes.'
            }
        }),
        async (req, res, next) => {
            try {
                const username = v.text(
                    req.body.username,
                    'Username',
                    60
                );

                const password = req.body.password;

                if (
                    typeof password !== 'string' ||
                    !password ||
                    password.length > 200
                ) {
                    v.fail(
                        'Password is required and must not exceed 200 characters.'
                    );
                }

                const [rows] = await pool.execute(
                    'SELECT id,username,password_hash FROM admins WHERE username=?',
                    [username]
                );

                const valid = verifyPassword(
                    password,
                    rows[0]?.password_hash || dummyHash
                );

                if (!rows.length || !valid) {
                    return res.status(401).json({
                        error: 'Invalid username or password.'
                    });
                }

                req.session.regenerate(e => {
                    if (e) return next(e);

                    req.session.admin = {
                        id: rows[0].id,
                        username: rows[0].username
                    };

                    res.json({
                        csrf: token(req)
                    });
                });

            } catch (e) {
                next(e);
            }
        }
    );

    app.use('/api', (req, res, next) => {
        if (!req.session.admin) {
            return res.status(401).json({
                error: 'Please log in.'
            });
        }

        next();
    });

    app.post('/api/logout', (req, res, next) => {
        req.session.destroy(e => {
            if (e) return next(e);

            res.clearCookie('tradevision.sid');

            res.json({
                ok: true
            });
        });
    });

    for (const type of ['products', 'customers']) {
        const fields = type === 'products'
            ? ['name', 'description', 'unit_price']
            : ['name', 'company', 'country', 'email', 'phone'];

        const validate = type === 'products'
            ? v.product
            : v.customer;

        app.get(`/api/${type}`, async (req, res) => {
            const [rows] = await pool.query(
                `SELECT * FROM ${type} ORDER BY id DESC`
            );

            res.json(rows);
        });

        app.post(`/api/${type}`, async (req, res) => {
            const values = validate(req.body);

            const [r] = await pool.execute(
                `INSERT INTO ${type} (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`,
                values
            );

            res.status(201).json({
                id: r.insertId
            });
        });

        app.put(`/api/${type}/:id`, async (req, res) => {
            const values = validate(req.body);
            const id = v.id(req.params.id);

            const [r] = await pool.execute(
                `UPDATE ${type} SET ${fields.map(f => f + '=?').join(',')} WHERE id=?`,
                [...values, id]
            );

            if (!r.affectedRows) {
                return res.status(404).json({
                    error: 'Record not found.'
                });
            }

            res.json({
                ok: true
            });
        });

        app.delete(`/api/${type}/:id`, async (req, res) => {
            const [r] = await pool.execute(
                `DELETE FROM ${type} WHERE id=?`,
                [v.id(req.params.id)]
            );

            if (!r.affectedRows) {
                return res.status(404).json({
                    error: 'Record not found.'
                });
            }

            res.json({
                ok: true
            });
        });
    }

    app.get('/api/orders', async (req, res) => {
        const [rows] = await pool.query(`
            SELECT
                o.*,
                p.name AS product_name,
                c.name AS customer_name,
                c.company,
                c.country
            FROM orders o
            JOIN products p ON p.id = o.product_id
            JOIN customers c ON c.id = o.customer_id
            ORDER BY o.order_date DESC, o.id DESC
        `);

        res.json(rows);
    });

    app.post('/api/orders', async (req, res) => {
        const cid = v.id(req.body.customer_id);
        const pid = v.id(req.body.product_id);
        const qty = v.quantity(req.body.quantity);
        const date = v.date(req.body.order_date);

        const [products] = await pool.execute(
            'SELECT unit_price FROM products WHERE id=?',
            [pid]
        );

        if (!products.length) {
            return res.status(400).json({
                error: 'Select an existing product.'
            });
        }

        const price = products[0].unit_price;

        const [r] = await pool.execute(
            'INSERT INTO orders(customer_id,product_id,quantity,order_price,total_amount,order_date) VALUES (?,?,?,?,?,?)',
            [
                cid,
                pid,
                qty,
                price,
                v.total(price, qty),
                date
            ]
        );

        res.status(201).json({
            id: r.insertId
        });
    });

    app.patch('/api/orders/:id/status', async (req, res) => {
        if (!v.statuses.includes(req.body.status)) {
            v.fail('Invalid order status.');
        }

        const [r] = await pool.execute(
            'UPDATE orders SET status=? WHERE id=?',
            [
                req.body.status,
                v.id(req.params.id)
            ]
        );

        if (!r.affectedRows) {
            return res.status(404).json({
                error: 'Order not found.'
            });
        }

        res.json({
            ok: true
        });
    });

    app.delete('/api/orders/:id', async (req, res) => {
        const [r] = await pool.execute(
            "DELETE FROM orders WHERE id=? AND status='Pending'",
            [v.id(req.params.id)]
        );

        if (!r.affectedRows) {
            return res.status(409).json({
                error: 'Only existing Pending orders can be deleted.'
            });
        }

        res.json({
            ok: true
        });
    });

    app.get('/api/dashboard', async (req, res) => {
        const [[summary]] = await pool.query(`
            SELECT
                COUNT(*) AS total_orders,
                COALESCE(SUM(status='Pending'), 0) AS pending_orders,
                COALESCE(SUM(total_amount), 0) AS total_value
            FROM orders
        `);

        const [[customers]] = await pool.query(
            'SELECT COUNT(*) AS total_customers FROM customers'
        );

        const [monthly] = await pool.query(`
            SELECT
                DATE_FORMAT(order_date, '%Y-%m') AS month,
                COUNT(*) AS orders,
                SUM(total_amount) AS value
            FROM orders
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);

        const [countries] = await pool.query(`
            SELECT
                c.country,
                COUNT(*) AS orders,
                SUM(o.total_amount) AS value
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            GROUP BY c.country
            ORDER BY value DESC
        `);

        res.json({
            ...summary,
            ...customers,
            monthly,
            countries
        });
    });

    app.use('/api', (req, res) => {
        res.status(404).json({
            error: 'API route not found.'
        });
    });

    app.use(
        '/vendor',
        express.static(
            path.join(__dirname, 'node_modules/bootstrap/dist/css'),
            {
                index: false
            }
        )
    );

    app.use((req, res, next) => {
        if (
            (req.path === '/' || req.path.endsWith('.html')) &&
            req.path !== '/login.html' &&
            !req.session.admin
        ) {
            return res.redirect('/login.html');
        }

        next();
    });

    app.use(
        express.static(
            path.join(__dirname, '../frontend'),
            {
                index: 'dashboard.html'
            }
        )
    );

    app.use((req, res) => {
        res.status(404).send('Page not found.');
    });

    app.use((err, req, res, next) => {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                error: 'This record is used by an order and cannot be deleted.'
            });
        }

        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                error: 'The selected product or customer no longer exists. Refresh and try again.'
            });
        }

        if (err instanceof SyntaxError && err.status === 400) {
            return res.status(400).json({
                error: 'Invalid JSON request.'
            });
        }

        if (err.status === 400) {
            return res.status(400).json({
                error: err.message
            });
        }

        console.error(
            'Request failed:',
            err.code || err.message
        );

        res.status(500).json({
            error: 'Server error. Check the server terminal and database connection.'
        });
    });

    return app;
}

module.exports = {
    createApp
};