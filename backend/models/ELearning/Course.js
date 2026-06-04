'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

// Pattern D (W851): legacy elearning stub router (canonical: models/ElearningCourse.js)
module.exports =
  mongoose.models.LegacyELearningCourseShell ||
  mongoose.model('LegacyELearningCourseShell', schema);
