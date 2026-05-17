'use strict';

/**
 * Productivity models — Wave 27.
 *
 * Bundle exporter so the service factory can do:
 *
 *   const models = require('./models/Productivity');
 *   createProductivityFeaturesService({ models });
 *
 * Mongoose schemas are also re-exported for tests that want to mint
 * private model instances against a separate connection.
 */

const Annotation = require('./Annotation');
const HandoffNote = require('./HandoffNote');
const FollowUp = require('./FollowUp');
const Watchlist = require('./Watchlist');
const UserPreferences = require('./UserPreferences');

module.exports = {
  Annotation,
  HandoffNote,
  FollowUp,
  Watchlist,
  UserPreferences,
  schemas: {
    AnnotationSchema: Annotation.AnnotationSchema,
    HandoffNoteSchema: HandoffNote.HandoffNoteSchema,
    FollowUpSchema: FollowUp.FollowUpSchema,
    WatchlistSchema: Watchlist.WatchlistSchema,
    UserPreferencesSchema: UserPreferences.UserPreferencesSchema,
  },
};
