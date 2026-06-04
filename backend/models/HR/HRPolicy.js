'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

// Pattern D (W851): HR unified shell schema (canonical module policy: HR/Policy.js → HrModulePolicy)
module.exports = mongoose.models.HrUnifiedPolicy || mongoose.model('HrUnifiedPolicy', schema);
