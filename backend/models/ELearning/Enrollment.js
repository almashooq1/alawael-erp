'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

// Registered as `ELearningEnrollment` to dodge the collision with the
// canonical models/enrollment.model.js. Default export unchanged.
module.exports =
  mongoose.models.ELearningEnrollment || mongoose.model('ELearningEnrollment', schema);
