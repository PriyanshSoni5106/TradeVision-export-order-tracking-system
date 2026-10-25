
const { pool } = require('../db');

(async () => {
    const c = await pool.getConnection();

    try {
        await c.beginTransaction();

        for (const table of ['products', 'customers', 'orders']) {
            const [[r]] = await c.query(
                `SELECT COUNT(*) AS n FROM ${table}`
            );

            if (r.n) {
                throw Error(
                    'Demo seed requires empty products, customers, and orders tables. No data changed.'
                );
            }
        }

        const [p] = await c.execute(
            'INSERT INTO products(name,description,unit_price) VALUES (?,?,?),(?,?,?),(?,?,?)',
            [
                'Cotton Fabric',
                'Price per roll',
                45,
                'Basmati Rice',
                'Price per 25 kg bag',
                32.50,
                'Ceramic Tiles',
                'Price per box',
                18.75
            ]
        );

        const [u] = await c.execute(
            'INSERT INTO customers(name,company,country,email,phone) VALUES (?,?,?,?,?),(?,?,?,?,?),(?,?,?,?,?)',
            [
                'Alex Morgan',
                'Harbor Imports',
                'USA',
                'alex@example.com',
                '+1 202 555 0100',

                'Sara Ahmed',
                'Gulf Trading',
                'UAE',
                'sara@example.com',
                '+971 50 000 0000',

                'Oliver Reed',
                'Northstar Goods',
                'UK',
                'oliver@example.com',
                '+44 20 7946 0000'
            ]
        );

        const [ps] = await c.query(
            'SELECT id,unit_price FROM products ORDER BY id'
        );

        const [cs] = await c.query(
            'SELECT id FROM customers ORDER BY id'
        );

        const { total } = require('../validation');

        for (let i = 0; i < 8; i++) {
            const d = new Date();

            d.setUTCDate(10);

            d.setUTCMonth(
                d.getUTCMonth() - Math.floor(i / 2)
            );

            const item = ps[i % 3];
            const qty = 25 + i * 10;

            await c.execute(
                'INSERT INTO orders(customer_id,product_id,quantity,order_price,total_amount,order_date,status) VALUES (?,?,?,?,?,?,?)',
                [
                    cs[i % 3].id,
                    item.id,
                    qty,
                    item.unit_price,
                    total(item.unit_price, qty),
                    d.toISOString().slice(0, 10),
                    [
                        'Pending',
                        'Processing',
                        'Shipped',
                        'Delivered'
                    ][i % 4]
                ]
            );
        }

        await c.commit();

        console.log(
            'Added 3 products, 3 customers, and 8 sample orders.'
        );

    } catch (e) {
        await c.rollback();

        console.error(e.message);
        process.exitCode = 1;

    } finally {
        c.release();
        await pool.end();
    }
})().catch(e => {
    console.error(e.message);
    process.exitCode = 1;
    pool.end();
});
