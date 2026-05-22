'use strict';

/**
 * messaging-threads-real-impl-wave276c.test.js — Wave 276c.
 *
 * Verifies that getThreads / getThread / addMessageToThread on
 * services/messaging.service.js call the real Conversation + Message
 * Mongoose statics instead of returning hardcoded fake data (the
 * pre-2026-05-21 stub behaviour documented in CLAUDE.md "known issues").
 *
 * Approach: jest.mock the Conversation + Message modules with stub
 * implementations of the statics the service calls. Each test asserts
 * (a) the static was invoked with the right arguments, (b) the
 * service surface-shape matches the contract the parent-portal route
 * + legacy frontend consume.
 *
 * Anti-stub-regression check: separate test confirms the returned
 * value for getThreads is NOT the literal sentinel `'thread-001'`
 * that the old stub returned. If a future commit reverts the
 * implementation back to a stub, this test fails on the sentinel.
 */

// jest.mock() factories are hoisted ABOVE module-scope variable
// declarations, so we declare jest.fn()s inline inside the factories
// and access them via require() AFTER the mock is installed. The
// _convStubs/_messageStubs aliases below are just ergonomic shortcuts.

jest.mock('../models/conversation.model', () => ({
  getUserConversations: jest.fn(),
  findById: jest.fn(),
}));
jest.mock('../models/message.model', () => ({
  getUnreadCount: jest.fn(),
  getConversationMessages: jest.fn(),
  create: jest.fn(),
}));

const _convStubs = require('../models/conversation.model');
const _messageStubs = require('../models/message.model');
const svc = require('../services/messaging.service');

beforeEach(() => {
  _convStubs.getUserConversations.mockReset();
  _convStubs.findById.mockReset();
  _messageStubs.getUnreadCount.mockReset();
  _messageStubs.getConversationMessages.mockReset();
  _messageStubs.create.mockReset();
});

// ─── getThreads ──────────────────────────────────────────────────

describe('Wave 276c — messaging.service.getThreads (real impl)', () => {
  test('delegates to Conversation.getUserConversations with userId + paging', async () => {
    _convStubs.getUserConversations.mockResolvedValue([
      {
        _id: 'conv-1',
        type: 'private',
        participants: [{ user: 'u-1' }, { user: 'u-2' }],
        lastMessage: { content: 'hi', sender: 'u-1' },
        toObject() {
          return {
            _id: 'conv-1',
            type: 'private',
            participants: [{ user: 'u-1' }, { user: 'u-2' }],
            lastMessage: { content: 'hi', sender: 'u-1' },
          };
        },
      },
    ]);
    _messageStubs.getUnreadCount.mockResolvedValue(3);

    const out = await svc.getThreads('u-1', { page: 2, limit: 10 });

    expect(_convStubs.getUserConversations).toHaveBeenCalledWith('u-1', {
      page: 2,
      limit: 10,
      archived: false,
    });
    expect(out).toHaveLength(1);
    expect(out[0]._id).toBe('conv-1');
    expect(out[0].unreadCount).toBe(3);
  });

  test('returns [] when userId is falsy', async () => {
    const out = await svc.getThreads(null);
    expect(out).toEqual([]);
    expect(_convStubs.getUserConversations).not.toHaveBeenCalled();
  });

  test('returns [] when the model returns no conversations', async () => {
    _convStubs.getUserConversations.mockResolvedValue([]);
    const out = await svc.getThreads('u-1');
    expect(out).toEqual([]);
  });

  test('survives Message.getUnreadCount throwing (degrades to unreadCount=0)', async () => {
    _convStubs.getUserConversations.mockResolvedValue([
      { _id: 'conv-1', participants: [{ user: 'u-1' }] },
    ]);
    _messageStubs.getUnreadCount.mockRejectedValue(new Error('count probe down'));
    const out = await svc.getThreads('u-1');
    expect(out).toHaveLength(1);
    expect(out[0].unreadCount).toBe(0);
  });
});

// ─── getThread ───────────────────────────────────────────────────

describe('Wave 276c — messaging.service.getThread (real impl)', () => {
  function _mkFindByIdChain(resolved) {
    return {
      populate() {
        return this;
      },
      then(r, j) {
        return Promise.resolve(resolved).then(r, j);
      },
    };
  }

  test('returns thread + messages when caller is an active participant', async () => {
    const convDoc = {
      _id: 'conv-1',
      isDeleted: false,
      participants: [
        { user: { _id: 'u-1' }, isActive: true },
        { user: { _id: 'u-2' }, isActive: true },
      ],
    };
    _convStubs.findById.mockReturnValue(_mkFindByIdChain(convDoc));
    _messageStubs.getConversationMessages.mockResolvedValue([
      { _id: 'm-1', content: { text: 'hi' } },
    ]);

    const out = await svc.getThread('conv-1', 'u-1');

    expect(out.ok).toBe(true);
    expect(out.thread).toBe(convDoc);
    expect(out.messages).toHaveLength(1);
    expect(_messageStubs.getConversationMessages).toHaveBeenCalledWith('conv-1', 'u-1', {});
  });

  test('returns FORBIDDEN when caller is not a participant', async () => {
    _convStubs.findById.mockReturnValue(
      _mkFindByIdChain({
        _id: 'conv-1',
        isDeleted: false,
        participants: [{ user: { _id: 'u-OTHER' }, isActive: true }],
      })
    );
    const out = await svc.getThread('conv-1', 'u-1');
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('FORBIDDEN');
  });

  test('returns NOT_FOUND when conversation does not exist', async () => {
    _convStubs.findById.mockReturnValue(_mkFindByIdChain(null));
    const out = await svc.getThread('conv-MISSING', 'u-1');
    expect(out.ok).toBe(false);
    expect(out.reason).toBe('NOT_FOUND');
  });

  test('returns NOT_FOUND for soft-deleted conversations', async () => {
    _convStubs.findById.mockReturnValue(
      _mkFindByIdChain({
        _id: 'conv-1',
        isDeleted: true,
        participants: [{ user: { _id: 'u-1' }, isActive: true }],
      })
    );
    const out = await svc.getThread('conv-1', 'u-1');
    expect(out.reason).toBe('NOT_FOUND');
  });

  test('returns INVALID_ARGS for missing inputs', async () => {
    expect((await svc.getThread(null, 'u-1')).reason).toBe('INVALID_ARGS');
    expect((await svc.getThread('conv-1', null)).reason).toBe('INVALID_ARGS');
  });

  test('treats an inactive participant entry as non-member', async () => {
    _convStubs.findById.mockReturnValue(
      _mkFindByIdChain({
        _id: 'conv-1',
        isDeleted: false,
        participants: [
          { user: { _id: 'u-1' }, isActive: false }, // left the thread
          { user: { _id: 'u-2' }, isActive: true },
        ],
      })
    );
    const out = await svc.getThread('conv-1', 'u-1');
    expect(out.reason).toBe('FORBIDDEN');
  });
});

// ─── addMessageToThread ──────────────────────────────────────────

describe('Wave 276c — messaging.service.addMessageToThread (real impl)', () => {
  test('creates Message + refreshes lastMessage when participant posts', async () => {
    const updateLastMessage = jest.fn().mockResolvedValue(undefined);
    _convStubs.findById.mockResolvedValue({
      _id: 'conv-1',
      isDeleted: false,
      participants: [{ user: 'u-1', isActive: true }],
      updateLastMessage,
    });
    _messageStubs.create.mockResolvedValue({
      _id: 'm-new',
      content: { text: 'hello', type: 'text' },
      sender: 'u-1',
    });

    const r = await svc.addMessageToThread('conv-1', { text: 'hello' }, 'u-1');

    expect(r.ok).toBe(true);
    expect(r.message._id).toBe('m-new');
    expect(_messageStubs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        sender: 'u-1',
        content: { text: 'hello', type: 'text' },
      })
    );
    expect(updateLastMessage).toHaveBeenCalledWith(expect.objectContaining({ _id: 'm-new' }));
  });

  test('still resolves ok when updateLastMessage throws (best-effort refresh)', async () => {
    const updateLastMessage = jest.fn().mockRejectedValue(new Error('stats write failed'));
    _convStubs.findById.mockResolvedValue({
      _id: 'conv-1',
      isDeleted: false,
      participants: [{ user: 'u-1', isActive: true }],
      updateLastMessage,
    });
    _messageStubs.create.mockResolvedValue({ _id: 'm-new' });

    const r = await svc.addMessageToThread('conv-1', { text: 'hello' }, 'u-1');
    expect(r.ok).toBe(true);
    expect(r.message._id).toBe('m-new');
  });

  test('returns EMPTY_CONTENT when text is missing or whitespace', async () => {
    expect((await svc.addMessageToThread('conv-1', {}, 'u-1')).reason).toBe('EMPTY_CONTENT');
    expect((await svc.addMessageToThread('conv-1', { text: '   ' }, 'u-1')).reason).toBe(
      'EMPTY_CONTENT'
    );
    expect(_messageStubs.create).not.toHaveBeenCalled();
  });

  test('returns NOT_FOUND when conversation is missing or deleted', async () => {
    _convStubs.findById.mockResolvedValue(null);
    expect((await svc.addMessageToThread('conv-MISSING', { text: 'hi' }, 'u-1')).reason).toBe(
      'NOT_FOUND'
    );

    _convStubs.findById.mockResolvedValue({ isDeleted: true, participants: [] });
    expect((await svc.addMessageToThread('conv-1', { text: 'hi' }, 'u-1')).reason).toBe(
      'NOT_FOUND'
    );
  });

  test('returns FORBIDDEN for non-participant senders', async () => {
    _convStubs.findById.mockResolvedValue({
      _id: 'conv-1',
      isDeleted: false,
      participants: [{ user: 'u-OTHER', isActive: true }],
    });
    const r = await svc.addMessageToThread('conv-1', { text: 'hi' }, 'u-1');
    expect(r.reason).toBe('FORBIDDEN');
    expect(_messageStubs.create).not.toHaveBeenCalled();
  });

  test('accepts string content alongside text', async () => {
    _convStubs.findById.mockResolvedValue({
      _id: 'conv-1',
      isDeleted: false,
      participants: [{ user: 'u-1', isActive: true }],
      updateLastMessage: jest.fn().mockResolvedValue(undefined),
    });
    _messageStubs.create.mockResolvedValue({ _id: 'm-new' });

    const r = await svc.addMessageToThread('conv-1', { content: 'hi via string' }, 'u-1');
    expect(r.ok).toBe(true);
    expect(_messageStubs.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: { text: 'hi via string', type: 'text' } })
    );
  });

  test('returns INVALID_ARGS for missing inputs', async () => {
    expect((await svc.addMessageToThread(null, { text: 'hi' }, 'u-1')).reason).toBe('INVALID_ARGS');
    expect((await svc.addMessageToThread('conv-1', { text: 'hi' }, null)).reason).toBe(
      'INVALID_ARGS'
    );
  });
});

// ─── Anti-stub-regression ────────────────────────────────────────

describe('Wave 276c — anti-stub-regression sentinel', () => {
  test('getThreads no longer returns the literal "thread-001" stub sentinel', async () => {
    // Empty DB → empty list (NOT a fake `[{_id:'thread-001',...}]`).
    _convStubs.getUserConversations.mockResolvedValue([]);
    const out = await svc.getThreads('u-1');
    expect(out).toEqual([]);
    // If anyone ever reverts the implementation to the old stub, that
    // hardcoded thread sentinel would surface here. This guard catches
    // it before it ships to consumers (legacy frontend + parent-portal).
    expect(JSON.stringify(out)).not.toContain('thread-001');
  });

  test('service module exports all 3 fixed methods', () => {
    expect(typeof svc.getThreads).toBe('function');
    expect(typeof svc.getThread).toBe('function');
    expect(typeof svc.addMessageToThread).toBe('function');
  });
});
