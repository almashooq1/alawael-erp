'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

// Registered as `MontessoriClassroom` to dodge the collision with the
// canonical models/Classroom.js. Default export unchanged.
module.exports =
  mongoose.models.MontessoriClassroom || mongoose.model('MontessoriClassroom', schema);
