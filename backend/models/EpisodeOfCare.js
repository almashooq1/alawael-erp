'use strict';
/**
 * Re-export shim — canonical EpisodeOfCare lives at:
 * domains/episodes/models/EpisodeOfCare.js
 *
 * This shim ensures 
equire('../models/EpisodeOfCare') returns the
 * compiled Mongoose model directly, preventing duplicate model registration.
 */
module.exports = require('../domains/episodes/models/EpisodeOfCare').EpisodeOfCare;
