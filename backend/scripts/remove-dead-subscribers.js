'use strict';

const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'integration', 'dddCrossModuleSubscribers.js');
const src = fs.readFileSync(file, 'utf8');

// Dead per W389/W391: no contract, no producer, or genuinely orphaned.
// KEPT subscribers (contracts added instead):
//   W1046: clinical-safety.*
//   W1120: clinical-assessment.adl/integration, self-advocacy.plan.completed,
//          decision-rights.assessment.finalized, independent-living.plan.completed
//   W1075: clinical-assessment.icf.assessment_approved,
//          authorization.treatment.authorization_decided,
//          care-coordination.mdt.meeting_completed,
//          care-coordination.consultation.answered,
//          safety.emergency-plan.activated,
//          cdss.alert.resolved
const deadPatterns = new Set([
  'sessions.session.cancelled',
  'sessions.session.no_show',
  'official-letter.official_letter.issued',
  'official-letter.official_letter.revoked',
  'careteam.careteam.member_added',
  'careteam.careteam.member_removed',
  'careteam.careteam.lead_changed',
  'waitlist.waitlist.added',
  'waitlist.waitlist.booked',
  'insurance.claim.approved',
  'insurance.claim.rejected',
  'home_program.home_program.assigned',
  'home_program.home_program.completed',
  'followup.case.completed',
  'followup.case.lost',
  'followup.visit.attended',
  'followup.visit.missed',
  'referral.referral.*',
]);

function findBlockEnd(src, startIdx) {
  let i = startIdx;
  while (i < src.length && src[i] !== '{') i++;
  if (i >= src.length) return -1;
  let depth = 1;
  i++;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingle) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '"') inDouble = false;
      continue;
    }
    if (inBacktick) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inBacktick = false;
      continue;
    }

    if (c === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === "'") {
      inSingle = true;
      continue;
    }
    if (c === '"') {
      inDouble = true;
      continue;
    }
    if (c === '`') {
      inBacktick = true;
      continue;
    }

    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        let j = i + 1;
        while (j < src.length && /\s/.test(src[j])) j++;
        if (src[j] === ')') {
          j++;
          while (j < src.length && /\s/.test(src[j])) j++;
          if (src[j] === ';') return j;
        }
      }
    }
  }
  return -1;
}

const marker = 'subscribers.push({';
const out = [];
let pos = 0;
let removed = 0;
while (true) {
  const idx = src.indexOf(marker, pos);
  if (idx === -1) {
    out.push(src.slice(pos));
    break;
  }
  let blockStart = idx;
  let scan = idx - 1;
  while (scan >= 0 && /[ \t]/.test(src[scan])) scan--;
  if (scan >= 0 && src[scan] === '\n') {
    scan--;
    const lineStart = src.lastIndexOf('\n', scan) + 1;
    const line = src.slice(lineStart, scan + 1).trim();
    if (line.startsWith('//')) {
      blockStart = lineStart;
    }
  }

  out.push(src.slice(pos, blockStart));
  const endIdx = findBlockEnd(src, idx);
  if (endIdx === -1) {
    throw new Error('Could not find matching end for subscribers.push block at ' + idx);
  }
  const block = src.slice(blockStart, endIdx + 1);
  const patternMatch = block.match(/pattern:\s*['"]([^'"]+)['"]/);
  const pattern = patternMatch ? patternMatch[1] : null;
  if (pattern && deadPatterns.has(pattern)) {
    removed++;
    console.log('removed:', pattern);
    pos = endIdx + 1;
  } else {
    out.push(block);
    pos = endIdx + 1;
  }
}

const result = out.join('');
fs.writeFileSync(file, result);
console.log('removed blocks:', removed);
console.log('remaining push blocks:', (result.match(/subscribers\.push\(\{/g) || []).length);
