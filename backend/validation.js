
function fail(message) {
    const e = new Error(message);
    e.status = 400;
    throw e;
}

function text(value, label, max, optional = false) {
    if (typeof value !== 'string') {
        if (optional && value == null) return '';
        fail(`${label} is required.`);
    }

    const s = value.trim();

    if ((!optional && !s) || s.length > max) {
        fail(`${label} must contain ${optional ? '0' : '1'}–${max} characters.`);
    }

    return s;
}

function id(value) {
    const s = String(value ?? '');

    if (
        !/^[1-9]\d*$/.test(s) ||
        !Number.isSafeInteger(Number(s)) ||
        Number(s) > 4294967295
    ) {
        fail('Invalid record ID.');
    }

    return Number(s);
}

function money(value) {
    const s = String(value ?? '');

    if (
        !/^\d{1,8}(\.\d{1,2})?$/.test(s) ||
        Number(s) <= 0
    ) {
        fail(
            'Price must be between 0.01 and 99,999,999.99 with at most two decimal places.'
        );
    }

    return Number(s).toFixed(2);
}

function quantity(value) {
    const n = Number(value);

    if (
        !/^\d+$/.test(String(value)) ||
        !Number.isInteger(n) ||
        n < 1 ||
        n > 1000000
    ) {
        fail('Quantity must be a whole number from 1 to 1,000,000.');
    }

    return n;
}

function date(value) {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        value < '1000-01-01' ||
        value > '9999-12-31'
    ) {
        fail('Enter a valid order date.');
    }

    const d = new Date(value + 'T00:00:00Z');

    if (
        !Number.isFinite(d.getTime()) ||
        d.toISOString().slice(0, 10) !== value
    ) {
        fail('Enter a valid order date.');
    }

    return value;
}

function total(price, qty) {
    const cents = BigInt(String(price).replace('.', ''));
    const sum = cents * BigInt(qty);

    return `${sum / 100n}.${String(sum % 100n).padStart(2, '0')}`;
}

function product(b) {
    return [
        text(b.name, 'Product name', 120),
        text(b.description, 'Description', 500, true),
        money(b.unit_price)
    ];
}

function customer(b) {
    const email = text(b.email, 'Email', 160);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fail('Enter a valid email address.');
    }

    return [
        text(b.name, 'Customer name', 120),
        text(b.company, 'Company', 120),
        text(b.country, 'Country', 80),
        email,
        text(b.phone, 'Phone', 30, true)
    ];
}

const statuses = [
    'Pending',
    'Processing',
    'Shipped',
    'Delivered'
];

module.exports = {
    fail,
    text,
    id,
    money,
    quantity,
    date,
    total,
    product,
    customer,
    statuses
};
