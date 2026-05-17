'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

// Registered as `ELearningCourse` to dodge the collision with the
// canonical models/course.model.js. Default export unchanged.
module.exports = mongoose.models.ELearningCourse || mongoose.model('ELearningCourse', schema);
