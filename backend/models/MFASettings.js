'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

// Registered as `MFASettingsTopLevel` to dodge the collision with the
// canonical models/mfa.models.js MFASettings. Default export unchanged.
module.exports =
  mongoose.models.MFASettingsTopLevel || mongoose.model('MFASettingsTopLevel', schema);
