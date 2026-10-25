
const {
    randomBytes,
    scryptSync,
    timingSafeEqual
} = require('node:crypto');

function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');

    return salt + ':' + scryptSync(
        password,
        salt,
        64
    ).toString('hex');
}

function verifyPassword(password, stored) {
    const [salt, hash] = String(stored).split(':');

    if (!salt || !hash) return false;

    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');

    return (
        actual.length === expected.length &&
        timingSafeEqual(actual, expected)
    );
}

module.exports = {
    hashPassword,
    verifyPassword
};
