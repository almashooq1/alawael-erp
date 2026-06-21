/**
 * LandingContent Model — headless-CMS store for the public landing page.
 *
 * Companion to LandingConfig. Where LandingConfig holds the structured
 * design/section settings, LandingContent holds the FULL rich landing-content
 * object (free-form) behind a draft/published workflow so an editor can change
 * it in the admin panel and publish, while the public site reads only the
 * published version (and falls back to its bundled static file when nothing is
 * published yet).
 *
 * Design decisions:
 *   1. One singleton per tenant (`tenantId` indexed unique). The public GET
 *      reads `published`; admin reads/writes `draft`; publish copies draft →
 *      published and bumps `version`.
 *   2. `Mixed` for `draft`/`published` — the content shape lives in the editor
 *      + renderer, not the schema, so the landing content can evolve freely
 *      without a migration. `minimize:false` keeps empty objects persisted.
 *   3. `version` increments on each publish so the public site can cache-bust.
 */

'use strict';

const mongoose = require('mongoose');

const LandingContentSchema = new mongoose.Schema(
  {
    tenantId: { type: String, default: 'default', index: true, unique: true },
    draft: { type: mongoose.Schema.Types.Mixed, default: null }, // work-in-progress content object
    published: { type: mongoose.Schema.Types.Mixed, default: null }, // live content object (what the public site reads)
    version: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true, minimize: false, strict: true }
);

module.exports =
  mongoose.models.LandingContent || mongoose.model('LandingContent', LandingContentSchema);
