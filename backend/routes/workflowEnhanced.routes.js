/**
 * Enhanced Workflow Routes — المسارات المتقدمة لنظام سير العمل
 *
 * MANIFEST file — every endpoint has been extracted to its own
 * focused sub-router (W277-followup, 2026-05-23). This file is now
 * a thin mount surface that preserves the public URL contract
 * (`/api/workflow-enhanced/*` and `/api/v1/workflow-enhanced/*`)
 * while keeping the actual handlers in cohesive small modules.
 *
 * 13 sub-routers mounted at the same prefix:
 *
 *   ┌───────────────────────────────────────────────────────────┐
 *   │  1) workflowComments       Comments & Discussion (W277-) │
 *   │  2) workflowFavorites      Favorites & Bookmarks         │
 *   │  3) workflowDelegations    Delegation & Out-of-Office    │
 *   │  4) workflowReminders      Reminders + cron-process      │
 *   │  5) workflowWebhooks       External Triggers             │
 *   │  6) workflowSavedReports   Saved Reports + 7 generators  │
 *   │  7) workflowTags           Tags + instance assignment    │
 *   │  8) workflowVersions       Version History + diff/restore│
 *   │  9) workflowNotifPrefs     Notification Preferences      │
 *   │ 10) workflowCalendar       Calendar View                 │
 *   │ 11) workflowTemplates      Extended Templates            │
 *   │ 12) workflowBatch          Advanced Batch Operations     │
 *   │ 13) workflowStats          Statistics + global search    │
 *   └───────────────────────────────────────────────────────────┘
 *
 * LOC history:
 *   pre-W277-followup: 1332 LOC (was 3112 per stale CLAUDE.md)
 *   post-W277-followup: ~50 LOC (this manifest)
 *
 * Sub-routers are mounted on the SAME prefix via `router.use('/', ...)`
 * so external URLs are unchanged. Adding a 14th sub-router: create the
 * file, add a `router.use('/', require('./xxx.routes'))` line below.
 */

'use strict';

const express = require('express');
const router = express.Router();

router.use('/', require('./workflowComments.routes'));
router.use('/', require('./workflowFavorites.routes'));
router.use('/', require('./workflowDelegations.routes'));
router.use('/', require('./workflowReminders.routes'));
router.use('/', require('./workflowWebhooks.routes'));
router.use('/', require('./workflowSavedReports.routes'));
router.use('/', require('./workflowTags.routes'));
router.use('/', require('./workflowVersions.routes'));
router.use('/', require('./workflowNotifPrefs.routes'));
router.use('/', require('./workflowCalendar.routes'));
router.use('/', require('./workflowTemplates.routes'));
router.use('/', require('./workflowBatch.routes'));
router.use('/', require('./workflowStats.routes'));

module.exports = router;
