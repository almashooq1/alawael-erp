'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

// Registered as `IntegrationModule` to dodge the collision with the
// canonical top-level models/Integration.js. Default export unchanged.
module.exports = mongoose.models.IntegrationModule || mongoose.model('IntegrationModule', schema);
