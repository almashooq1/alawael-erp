/**
 * W1493 — WhatsApp internal-notes / transfer-log / link drift guard
 *
 * Static (source-shape) guards for the staff-only operational layer:
 *   - the three routes exist, are branch-isolated, and never send to WhatsApp,
 *   - transfer validates staffId + has no mass-assignment + writes transferLog,
 *   - the model declares internalNotes / transferLog / linked* with the right
 *     refs, and internal notes require text.
 *
 * Pure + static only — no DB, no boot (consistent with W1491).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp.routes.js'), 'utf8');
const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '../models/WhatsAppConversation.js'),
  'utf8'
);

const ROUTES = [
  '/conversations/:id/notes',
  '/conversations/:id/transfer',
  '/conversations/:id/link',
];

function sliceFor(route) {
  const idx = ROUTE_SRC.indexOf(`'${route}'`);
  return idx === -1 ? '' : ROUTE_SRC.slice(idx, idx + 1300);
}

describe('W1493 WhatsApp staff-ops routes — declared + branch-isolated', () => {
  test.each(ROUTES)('declares route %s', route => {
    expect(ROUTE_SRC).toContain(`'${route}'`);
  });

  test.each(ROUTES)(
    'route %s is branch-scoped (byIdScopedFilter + effectiveBranchScope)',
    route => {
      const slice = sliceFor(route);
      expect(slice).toMatch(/byIdScopedFilter/);
      expect(slice).toMatch(/effectiveBranchScope\(req\)/);
    }
  );

  test.each(ROUTES)('route %s never sends to WhatsApp (internal only)', route => {
    expect(sliceFor(route)).not.toMatch(/whatsappService\.send/);
  });

  test.each(ROUTES)('route %s does not spread req.body (no mass-assignment)', route => {
    expect(sliceFor(route)).not.toMatch(/\.\.\.req\.body/);
  });
});

describe('W1493 transfer — audit + validation', () => {
  test('transfer writes a transferLog entry', () => {
    expect(sliceFor('/conversations/:id/transfer')).toMatch(/transferLog/);
  });

  test('transfer validates staffId is an ObjectId', () => {
    const slice = sliceFor('/conversations/:id/transfer');
    expect(slice).toMatch(/validate\(\['staffId'\]/);
    expect(slice).toMatch(/isValidObjectId/);
  });

  test('link validates ObjectIds for ticketId / sessionId', () => {
    expect(sliceFor('/conversations/:id/link')).toMatch(/isValidObjectId/);
  });
});

describe('W1493 WhatsAppConversation — schema shape (static)', () => {
  test('declares internalNotes + transferLog arrays', () => {
    expect(MODEL_SRC).toMatch(/internalNotes:\s*\[internalNoteSchema\]/);
    expect(MODEL_SRC).toMatch(/transferLog:\s*\[transferLogSchema\]/);
  });

  test('linkedTicketId refs Complaint, linkedSessionId refs ClinicalSession', () => {
    expect(MODEL_SRC).toMatch(/linkedTicketId:\s*\{[^}]*ref:\s*'Complaint'/);
    expect(MODEL_SRC).toMatch(/linkedSessionId:\s*\{[^}]*ref:\s*'ClinicalSession'/);
  });

  test('internal note requires text (max length capped)', () => {
    expect(MODEL_SRC).toMatch(
      /text:\s*\{\s*type:\s*String,\s*required:\s*true,\s*maxlength:\s*4000/
    );
  });
});
