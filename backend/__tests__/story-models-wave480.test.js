'use strict';

/**
 * W480 drift guard — StoryBook + StorySurfaceVariant models (Phase F).
 */

const fs = require('fs');
const path = require('path');

const BOOK_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'StoryBook.js'), 'utf8');
const VARIANT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'StorySurfaceVariant.js'),
  'utf8'
);

describe('W480 — StoryBook model', () => {
  it('registers as model "StoryBook"', () => {
    expect(BOOK_SRC).toMatch(
      /mongoose\.models\.StoryBook\s*\|\|\s*mongoose\.model\(\s*['"]StoryBook['"]/
    );
  });

  it('uses collection story_books', () => {
    expect(BOOK_SRC).toMatch(/collection:\s*['"]story_books['"]/);
  });

  it('declares periodStart + periodEnd required + indexed', () => {
    expect(BOOK_SRC).toMatch(/periodStart\s*:[\s\S]+?required:\s*true[\s\S]+?index:\s*true/);
    expect(BOOK_SRC).toMatch(/periodEnd\s*:[\s\S]+?required:\s*true[\s\S]+?index:\s*true/);
  });

  it('declares 4 periodType values', () => {
    expect(BOOK_SRC).toMatch(/'quarterly'/);
    expect(BOOK_SRC).toMatch(/'annual'/);
    expect(BOOK_SRC).toMatch(/'milestone'/);
    expect(BOOK_SRC).toMatch(/'ad-hoc'/);
  });

  it('declares 4 composedByMethod values', () => {
    expect(BOOK_SRC).toMatch(/'template_only'/);
    expect(BOOK_SRC).toMatch(/'llm_assisted'/);
    expect(BOOK_SRC).toMatch(/'manual'/);
    expect(BOOK_SRC).toMatch(/'hybrid'/);
  });

  it('declares sources subdoc with 5 reference arrays', () => {
    expect(BOOK_SRC).toMatch(/gasSnapshotIds[\s\S]+?ref:\s*['"]GasScoreSnapshot['"]/);
    expect(BOOK_SRC).toMatch(/icfAssessmentIds[\s\S]+?ref:\s*['"]ICFAssessment['"]/);
    expect(BOOK_SRC).toMatch(/voiceLogIds[\s\S]+?ref:\s*['"]BeneficiaryVoiceLog['"]/);
    expect(BOOK_SRC).toMatch(/wbciSnapshotIds[\s\S]+?ref:\s*['"]FamilyWellbeingSnapshot['"]/);
    expect(BOOK_SRC).toMatch(/prideMomentIds[\s\S]+?ref:\s*['"]PrideMoment['"]/);
  });

  it('declares 5 status values + lifecycle timestamps', () => {
    expect(BOOK_SRC).toMatch(/'draft'/);
    expect(BOOK_SRC).toMatch(/'reviewed'/);
    expect(BOOK_SRC).toMatch(/'published'/);
    expect(BOOK_SRC).toMatch(/'shared_with_family'/);
    expect(BOOK_SRC).toMatch(/'archived'/);
    expect(BOOK_SRC).toMatch(/reviewedAt/);
    expect(BOOK_SRC).toMatch(/publishedAt/);
    expect(BOOK_SRC).toMatch(/sharedWithFamilyAt/);
  });

  it('declares confidence enum + coverage 0-100', () => {
    expect(BOOK_SRC).toMatch(/confidence[\s\S]+?'high'[\s\S]+?'medium'[\s\S]+?'low'/);
    expect(BOOK_SRC).toMatch(/coverage\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
  });

  it('surfaceVariants refs StorySurfaceVariant', () => {
    expect(BOOK_SRC).toMatch(/surfaceVariants\s*:[\s\S]+?ref:\s*['"]StorySurfaceVariant['"]/);
  });

  it('pre-save invariant: periodStart < periodEnd', () => {
    expect(BOOK_SRC).toMatch(/periodStart must be before periodEnd/);
  });

  it('pre-save invariant: published/shared requires reviewedBy', () => {
    expect(BOOK_SRC).toMatch(/requires reviewedBy/);
  });
});

describe('W480 — StorySurfaceVariant model', () => {
  it('registers as model "StorySurfaceVariant"', () => {
    expect(VARIANT_SRC).toMatch(
      /mongoose\.models\.StorySurfaceVariant\s*\|\|\s*mongoose\.model\(\s*['"]StorySurfaceVariant['"]/
    );
  });

  it('storyBookId required + indexed + ref StoryBook', () => {
    expect(VARIANT_SRC).toMatch(
      /storyBookId\s*:[\s\S]+?ref:\s*['"]StoryBook['"][\s\S]+?required:\s*true/
    );
  });

  it('declares 7 surfaceType values', () => {
    expect(VARIANT_SRC).toMatch(/'family_quarterly_storybook'/);
    expect(VARIANT_SRC).toMatch(/'family_annual_chronicle'/);
    expect(VARIANT_SRC).toMatch(/'beneficiary_personal_story'/);
    expect(VARIANT_SRC).toMatch(/'sibling_friendly_story'/);
    expect(VARIANT_SRC).toMatch(/'extended_family_summary'/);
    expect(VARIANT_SRC).toMatch(/'clinical_narrative'/);
    expect(VARIANT_SRC).toMatch(/'regulatory_outcome_report'/);
  });

  it('lang enum: ar / en', () => {
    expect(VARIANT_SRC).toMatch(/lang\s*:\s*\{[^}]*'ar'[^}]*'en'/);
  });

  it('targetReadingGrade bounded 1-16', () => {
    expect(VARIANT_SRC).toMatch(/targetReadingGrade\s*:\s*\{[^}]*min:\s*1[^}]*max:\s*16/);
  });

  it('declares sections subdoc with body + visualHint enum', () => {
    expect(VARIANT_SRC).toMatch(/sections\s*:\s*\[/);
    expect(VARIANT_SRC).toMatch(
      /visualHint[\s\S]+?'photo'[\s\S]+?'chart_line'[\s\S]+?'illustration'/
    );
  });

  it('declares visualAssets subdoc with kind + consentVerified', () => {
    expect(VARIANT_SRC).toMatch(/visualAssets\s*:\s*\[/);
    expect(VARIANT_SRC).toMatch(/consentVerified/);
  });

  it('declares 4 generatedBy values', () => {
    expect(VARIANT_SRC).toMatch(/'template'/);
    expect(VARIANT_SRC).toMatch(/'llm'/);
    expect(VARIANT_SRC).toMatch(/'manual'/);
    expect(VARIANT_SRC).toMatch(/'translation_of_other_variant'/);
  });

  it('declares 4 status values', () => {
    expect(VARIANT_SRC).toMatch(/'draft'/);
    expect(VARIANT_SRC).toMatch(/'approved'/);
    expect(VARIANT_SRC).toMatch(/'published'/);
    expect(VARIANT_SRC).toMatch(/'retracted'/);
  });

  it('unique compound index on (storyBookId, surfaceType)', () => {
    expect(VARIANT_SRC).toMatch(
      /index\(\s*\{\s*storyBookId:\s*1,\s*surfaceType:\s*1\s*\}\s*,\s*\{\s*unique:\s*true/
    );
  });

  it('pre-save invariant: approved requires approvedBy', () => {
    expect(VARIANT_SRC).toMatch(/requires approvedBy/);
  });

  it('pre-save invariant: retracted requires retractionReason ≥5 chars', () => {
    expect(VARIANT_SRC).toMatch(/retracted status requires retractionReason/);
  });

  it('pre-save invariant: photo assets require consentVerified before approval', () => {
    expect(VARIANT_SRC).toMatch(/photo visualAssets require consentVerified=true/);
  });

  it('pre-save: sibling/beneficiary variants auto-flag isSensitive=true', () => {
    expect(VARIANT_SRC).toMatch(/sibling_friendly_story.*beneficiary_personal_story/);
    expect(VARIANT_SRC).toMatch(/this\.isSensitive\s*=\s*true/);
  });
});
