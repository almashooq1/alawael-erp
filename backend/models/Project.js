/**
 * Project.js — Compatibility Proxy
 * ═══════════════════════════════════
 * CANONICAL MODEL: project.model.js (Mongoose schema).
 *
 * This file previously held a plain in-memory JS class (POC). The
 * canonical Project is the Mongoose model in project.model.js —
 * consumers should require that directly. This proxy re-export keeps
 * the one auto-generated unit test (tests/unit/Project.model.test.js)
 * working while allowing legacy `require('./Project')` call sites to
 * resolve to the persisted model.
 *
 * Consolidation audit 2026-04-21 found zero production consumers of
 * the plain JS class version — only the auto-generated test required
 * it. Converting to a proxy is safe.
 *
 * See docs/technical-debt/consolidation-roadmap.md Phase 6.
 */
'use strict';

module.exports = require('./project.model');
