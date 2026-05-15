'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

module.exports = mongoose.models.SalaryStructure || mongoose.model('SalaryStructure', schema);
