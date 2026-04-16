'use strict';

jest.mock('../../models/DddDocumentCollaboration', () => ({
  DDDCollabDocument: {},
  DDDComment: {},
  DOCUMENT_TYPES: ['item1'],
  REVIEW_WORKFLOWS: ['item1'],

}));

const svc = require('../../services/dddDocumentCollaboration');

describe('dddDocumentCollaboration service', () => {
  test('DOCUMENT_TYPES is an array', () => { expect(Array.isArray(svc.DOCUMENT_TYPES)).toBe(true); });
  test('REVIEW_WORKFLOWS is an array', () => { expect(Array.isArray(svc.REVIEW_WORKFLOWS)).toBe(true); });
  test('updateDocument resolves', async () => { await expect(svc.updateDocument()).resolves.not.toThrow(); });
  test('lockDocument resolves', async () => { await expect(svc.lockDocument()).resolves.not.toThrow(); });
  test('unlockDocument resolves', async () => { await expect(svc.unlockDocument()).resolves.not.toThrow(); });
  test('addComment resolves', async () => { await expect(svc.addComment()).resolves.not.toThrow(); });
  test('resolveComment resolves', async () => { await expect(svc.resolveComment()).resolves.not.toThrow(); });
  test('getDocumentComments resolves', async () => { await expect(svc.getDocumentComments()).resolves.not.toThrow(); });
  test('submitForReview resolves', async () => { await expect(svc.submitForReview()).resolves.not.toThrow(); });
  test('submitReview resolves', async () => { await expect(svc.submitReview()).resolves.not.toThrow(); });
  test('getDocumentVersions resolves', async () => { await expect(svc.getDocumentVersions()).resolves.not.toThrow(); });
  test('getDocumentCollabDashboard returns health object', async () => {
    const d = await svc.getDocumentCollabDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
