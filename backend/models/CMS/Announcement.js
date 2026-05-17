'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

// Registered as `CMSAnnouncement` to dodge the collision with the
// canonical models/communication/Announcement.js. Default export unchanged.
module.exports = mongoose.models.CMSAnnouncement || mongoose.model('CMSAnnouncement', schema);
