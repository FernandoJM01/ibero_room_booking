const jwt = require('jsonwebtoken');

const sign = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret_key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
};

const verify = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
};

module.exports = { sign, verify };
