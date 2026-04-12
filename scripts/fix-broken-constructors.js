#!/usr/bin/env node
/**
 * Fix 8 broken constructors that have `this.name = 'X'` without `super()`.
 * Replaces `this.name = 'X';` with `super('X');` in each file.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SERVICES_DIR = path.join(__dirname, '..', 'backend', 'services');

const broken = [
  ['dddClinicalTrial', 'ClinicalTrial'],
  ['dddSatisfactionTracker', 'SatisfactionTracker'],
  ['dddFeedbackManager', 'FeedbackManager'],
  ['dddResearchProtocol', 'ResearchProtocol'],
  ['dddPublicationTracker', 'PublicationTracker'],
  ['dddEvidenceLibrary', 'EvidenceLibrary'],
  ['dddPatientExperience', 'PatientExperience'],
  ['dddComplaintManager', 'ComplaintManager'],
];

let fixed = 0;
let errors = 0;

for (const [file, name] of broken) {
  const filePath = path.join(SERVICES_DIR, file + '.js');
  let code = fs.readFileSync(filePath, 'utf8');

  const oldStr = `this.name = '${name}';`;
  const newStr = `super('${name}');`;

  if (!code.includes(oldStr)) {
    console.log(`SKIP (pattern not found): ${file}`);
    continue;
  }

  code = code.replace(oldStr, newStr);

  // Syntax check
  try {
    new (require('vm').Script)(code, { filename: file + '.js' });
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.log(`SYNTAX ERROR in ${file}: ${e.message}`);
      errors++;
      continue;
    }
  }

  fs.writeFileSync(filePath, code);
  fixed++;
  console.log(`Fixed: ${file} — replaced this.name='${name}' with super('${name}')`);
}

console.log(`\nDone: ${fixed} fixed, ${errors} errors, ${broken.length - fixed - errors} skipped`);
