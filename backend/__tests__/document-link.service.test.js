/**
 * document-link.service.test.js — Unit tests for document link service.
 */

'use strict';

jest.mock('../models/Document', () => ({
  findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'doc123' }),
  findById: jest
    .fn()
    .mockResolvedValue({ _id: 'doc123', entityType: 'Employee', entityId: 'emp1' }),
}));

jest.mock('mongoose', () => ({
  isValidObjectId: jest.fn(id => typeof id === 'string' && id.length === 24),
  Schema: { Types: { ObjectId: jest.fn(id => id) } },
  Types: { ObjectId: jest.fn(id => id) },
}));

const documentLinkService = require('../services/documents/documentLink.service');

describe('documentLink.service', () => {
  it('infers source module from entity type', () => {
    expect(documentLinkService.inferSourceModule('Employee')).toBe('hr');
    expect(documentLinkService.inferSourceModule('Beneficiary')).toBe('medical');
    expect(documentLinkService.inferSourceModule('Invoice')).toBe('finance');
    expect(documentLinkService.inferSourceModule('Unknown')).toBe('core');
  });

  it('throws on invalid document id', async () => {
    const mongoose = require('mongoose');
    mongoose.isValidObjectId.mockReturnValue(false);

    await expect(
      documentLinkService.linkDocumentToEntity('bad-id', 'Employee', '507f1f77bcf86cd799439011')
    ).rejects.toThrow('معرّف المستند غير صالح');
  });

  it('throws when entity type or id missing', async () => {
    const mongoose = require('mongoose');
    mongoose.isValidObjectId.mockReturnValue(true);

    await expect(
      documentLinkService.linkDocumentToEntity('507f1f77bcf86cd799439011', null, 'xxx')
    ).rejects.toThrow('نوع الكيان ومعرّفه مطلوبان');
  });
});
