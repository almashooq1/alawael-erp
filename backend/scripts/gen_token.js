/* eslint-disable no-unused-vars */
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/secrets');
const token = jwt.sign({ id: 'tester', role: 'admin' }, jwtSecret, { expiresIn: '1h' });
console.log(token);
