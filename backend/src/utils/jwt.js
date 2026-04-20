const jwt = require('jsonwebtoken');

exports.signToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET || 'supersecret12345', { expiresIn: '1d' });
};

exports.verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET || 'supersecret12345');
};
