'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

module.exports = mongoose.models.FleetSafety || mongoose.model('FleetSafety', schema);
