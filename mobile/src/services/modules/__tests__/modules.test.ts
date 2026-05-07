jest.mock('../../ApiService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from '../../ApiService';
import { chat } from '../chat';
import nafath from '../nafath';
import notify from '../notify';
import telehealth from '../telehealth';
import therapistWorkbench from '../therapistWorkbench';
import parentPortal from '../parentPortal';

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('chat module', () => {
  it('conversations() unwraps items and defaults to []', async () => {
    mockedApi.get.mockResolvedValueOnce({ success: true, items: [{ _id: 'c1' }] });
    const res = await chat.conversations();
    expect(mockedApi.get).toHaveBeenCalledWith('/chat-v2/conversations');
    expect(res).toHaveLength(1);
    mockedApi.get.mockResolvedValueOnce({ success: true });
    expect(await chat.conversations()).toEqual([]);
  });

  it('findOrCreate() posts withUserId and returns data', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { _id: 'c1' } });
    const res = await chat.findOrCreate('u1');
    expect(mockedApi.post).toHaveBeenCalledWith('/chat-v2/conversations', { withUserId: 'u1' });
    expect(res._id).toBe('c1');
  });

  it('messages() forwards before/limit and normalises hasMore', async () => {
    mockedApi.get.mockResolvedValueOnce({ success: true, items: [{ _id: 'm1' }], hasMore: true });
    const res = await chat.messages('c1', 'cursor', 25);
    expect(mockedApi.get).toHaveBeenCalledWith('/chat-v2/conversations/c1/messages', {
      before: 'cursor',
      limit: 25,
    });
    expect(res.hasMore).toBe(true);
    mockedApi.get.mockResolvedValueOnce({ success: true });
    const empty = await chat.messages('c1');
    expect(empty.items).toEqual([]);
    expect(empty.hasMore).toBe(false);
  });

  it('send() posts text + replyTo and returns data', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { _id: 'm1' } });
    const res = await chat.send('c1', 'hi', 'm0');
    expect(mockedApi.post).toHaveBeenCalledWith('/chat-v2/conversations/c1/messages', { text: 'hi', replyTo: 'm0' });
    expect(res._id).toBe('m1');
  });

  it('markRead() posts to read endpoint', async () => {
    mockedApi.post.mockResolvedValue({});
    await chat.markRead('c1');
    expect(mockedApi.post).toHaveBeenCalledWith('/chat-v2/conversations/c1/read', {});
  });

  it('contacts() unwraps items', async () => {
    mockedApi.get.mockResolvedValueOnce({ success: true, items: [{ _id: 'u1', name: 'X', email: 'e', category: 'a' }] });
    const res = await chat.contacts();
    expect(res).toHaveLength(1);
    mockedApi.get.mockResolvedValueOnce({ success: true });
    expect(await chat.contacts()).toEqual([]);
  });
});

describe('nafath module', () => {
  it('initiate() defaults purpose to login', async () => {
    mockedApi.post.mockResolvedValue({ success: true, requestId: 'r1' });
    await nafath.initiate('1234567890');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/nafath/initiate', { nationalId: '1234567890', purpose: 'login' });
  });

  it('initiate() forwards an explicit purpose', async () => {
    mockedApi.post.mockResolvedValue({ success: true, requestId: 'r1' });
    await nafath.initiate('1', 'consent');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/nafath/initiate', { nationalId: '1', purpose: 'consent' });
  });

  it('pollStatus() reads status by requestId', async () => {
    mockedApi.get.mockResolvedValue({ success: true, status: 'PENDING', requestId: 'r1' });
    const res = await nafath.pollStatus('r1');
    expect(mockedApi.get).toHaveBeenCalledWith('/auth/nafath/status/r1');
    expect(res.status).toBe('PENDING');
  });

  it('cancel() posts cancel endpoint', async () => {
    mockedApi.post.mockResolvedValue({ success: true, status: 'EXPIRED' });
    await nafath.cancel('r1');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/nafath/cancel/r1', {});
  });
});

describe('notify module', () => {
  it('send() posts payload to /notify', async () => {
    mockedApi.post.mockResolvedValue({ success: true });
    await notify.send({ to: 'a@b', body: 'hi', channels: ['email'] });
    expect(mockedApi.post).toHaveBeenCalledWith('/notify', { to: 'a@b', body: 'hi', channels: ['email'] });
  });

  it('bulk() posts to /notify/bulk', async () => {
    mockedApi.post.mockResolvedValue({ success: true, total: 1, sent: 1, failed: 0, results: [] });
    await notify.bulk({ recipients: ['a@b'], body: 'hi' });
    expect(mockedApi.post).toHaveBeenCalledWith('/notify/bulk', { recipients: ['a@b'], body: 'hi' });
  });

  it('logs() forwards filter and returns the response', async () => {
    mockedApi.get.mockResolvedValue({ success: true, items: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } });
    const res = await notify.logs({ status: 'sent' });
    expect(mockedApi.get).toHaveBeenCalledWith('/notify/logs', { status: 'sent' });
    expect(res.success).toBe(true);
  });

  it('logs() defaults filter to {} when omitted', async () => {
    mockedApi.get.mockResolvedValue({ success: true, items: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } });
    await notify.logs();
    expect(mockedApi.get).toHaveBeenCalledWith('/notify/logs', {});
  });

  it('stats() reads /notify/stats', async () => {
    mockedApi.get.mockResolvedValue({ success: true, total: 0, last30days: 0, byChannel: {}, byStatus: {} });
    await notify.stats();
    expect(mockedApi.get).toHaveBeenCalledWith('/notify/stats');
  });
});

describe('telehealth module', () => {
  it('myUpcoming() unwraps items', async () => {
    mockedApi.get.mockResolvedValueOnce({ success: true, items: [{ _id: 's1' }] });
    expect(await telehealth.myUpcoming()).toHaveLength(1);
    mockedApi.get.mockResolvedValueOnce({ success: true });
    expect(await telehealth.myUpcoming()).toEqual([]);
  });

  it('getSession() reads by id', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: { _id: 's1' } });
    const res = await telehealth.getSession('s1');
    expect(mockedApi.get).toHaveBeenCalledWith('/telehealth-v2/sessions/s1');
    expect(res._id).toBe('s1');
  });

  it('createRoom() defaults provider to jitsi', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { _id: 's1' } });
    await telehealth.createRoom('s1');
    expect(mockedApi.post).toHaveBeenCalledWith('/telehealth-v2/sessions/s1/create-room', { provider: 'jitsi' });
  });

  it('createRoom() honours an explicit provider', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { _id: 's1' } });
    await telehealth.createRoom('s1', 'custom');
    expect(mockedApi.post).toHaveBeenCalledWith('/telehealth-v2/sessions/s1/create-room', { provider: 'custom' });
  });

  it('join() posts and returns full payload', async () => {
    const payload = { success: true, roomUrl: 'u', roomName: 'n', provider: 'jitsi', joinerRole: 'therapist', displayName: 'X' };
    mockedApi.post.mockResolvedValue(payload);
    const res = await telehealth.join('s1');
    expect(mockedApi.post).toHaveBeenCalledWith('/telehealth-v2/sessions/s1/join', {});
    expect(res).toEqual(payload);
  });

  it('end() posts end endpoint', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { _id: 's1' } });
    await telehealth.end('s1');
    expect(mockedApi.post).toHaveBeenCalledWith('/telehealth-v2/sessions/s1/end', {});
  });
});

describe('therapistWorkbench module', () => {
  it('me() returns data', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: { _id: 'e1', email: 'a@b', status: 'active' } });
    const res = await therapistWorkbench.me();
    expect(mockedApi.get).toHaveBeenCalledWith('/therapist-workbench/me');
    expect(res._id).toBe('e1');
  });

  it('today() defaults items + totals', async () => {
    mockedApi.get.mockResolvedValueOnce({
      success: true,
      items: [{ _id: 's1' }],
      totals: { total: 1, completed: 0, inProgress: 0, upcoming: 1 },
    });
    const res = await therapistWorkbench.today();
    expect(res.items).toHaveLength(1);
    expect(res.totals.total).toBe(1);
    mockedApi.get.mockResolvedValueOnce({ success: true });
    const empty = await therapistWorkbench.today();
    expect(empty.items).toEqual([]);
    expect(empty.totals).toEqual({});
  });

  it('week() returns full payload', async () => {
    const payload = { success: true, items: [], grouped: {}, weekStart: 'a', weekEnd: 'b' };
    mockedApi.get.mockResolvedValue(payload);
    const res = await therapistWorkbench.week();
    expect(mockedApi.get).toHaveBeenCalledWith('/therapist-workbench/week');
    expect(res).toEqual(payload);
  });

  it('caseload() unwraps items', async () => {
    mockedApi.get.mockResolvedValueOnce({
      success: true,
      items: [{ beneficiary: null, sessionCount: 0, completed: 0, upcoming: 0 }],
      total: 1,
    });
    expect(await therapistWorkbench.caseload()).toHaveLength(1);
    mockedApi.get.mockResolvedValueOnce({ success: true });
    expect(await therapistWorkbench.caseload()).toEqual([]);
  });

  it('session() reads by id', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: { _id: 's1' } });
    await therapistWorkbench.session('s1');
    expect(mockedApi.get).toHaveBeenCalledWith('/therapist-workbench/session/s1');
  });

  it('checkIn() defaults lateMinutes to 0', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { _id: 's1' } });
    await therapistWorkbench.checkIn('s1');
    expect(mockedApi.post).toHaveBeenCalledWith('/therapist-workbench/session/s1/check-in', {
      arrivalTime: undefined,
      lateMinutes: 0,
    });
  });

  it('checkIn() forwards arrivalTime and lateMinutes', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { _id: 's1' } });
    await therapistWorkbench.checkIn('s1', '08:00', 5);
    expect(mockedApi.post).toHaveBeenCalledWith('/therapist-workbench/session/s1/check-in', {
      arrivalTime: '08:00',
      lateMinutes: 5,
    });
  });

  it('saveNotes() posts payload', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { _id: 's1' } });
    await therapistWorkbench.saveNotes('s1', { rating: 4 });
    expect(mockedApi.post).toHaveBeenCalledWith('/therapist-workbench/session/s1/notes', { rating: 4 });
  });

  it('complete() posts payload', async () => {
    mockedApi.post.mockResolvedValue({ success: true, data: { _id: 's1' } });
    await therapistWorkbench.complete('s1', { rating: 5, departureTime: '09:00' });
    expect(mockedApi.post).toHaveBeenCalledWith('/therapist-workbench/session/s1/complete', { rating: 5, departureTime: '09:00' });
  });
});

describe('parentPortal module', () => {
  it('me() reads profile', async () => {
    mockedApi.get.mockResolvedValue({ success: true, data: { _id: 'g1' } });
    await parentPortal.me();
    expect(mockedApi.get).toHaveBeenCalledWith('/parent-v2/me');
  });

  it('myChildren() unwraps items', async () => {
    mockedApi.get.mockResolvedValueOnce({ success: true, items: [{ _id: 'c1' }] });
    expect(await parentPortal.myChildren()).toHaveLength(1);
    mockedApi.get.mockResolvedValueOnce({ success: true });
    expect(await parentPortal.myChildren()).toEqual([]);
  });

  it('childOverview() returns the response object', async () => {
    const ov = { success: true, foo: 'bar' } as any;
    mockedApi.get.mockResolvedValue(ov);
    const res = await parentPortal.childOverview('c1');
    expect(mockedApi.get).toHaveBeenCalledWith('/parent-v2/children/c1/overview');
    expect(res).toBe(ov);
  });

  it('childSessions() forwards scope/limit and defaults', async () => {
    mockedApi.get.mockResolvedValueOnce({ success: true, items: [{ _id: 's1' }] });
    await parentPortal.childSessions('c1');
    expect(mockedApi.get).toHaveBeenCalledWith('/parent-v2/children/c1/sessions', { scope: 'all', limit: 50 });

    mockedApi.get.mockResolvedValueOnce({ success: true, items: [] });
    await parentPortal.childSessions('c1', 'upcoming', 5);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/parent-v2/children/c1/sessions', { scope: 'upcoming', limit: 5 });
  });

  it('childCarePlan() returns data (or null)', async () => {
    mockedApi.get.mockResolvedValueOnce({ success: true, data: null });
    expect(await parentPortal.childCarePlan('c1')).toBeNull();
    mockedApi.get.mockResolvedValueOnce({ success: true, data: { _id: 'cp1' } });
    expect((await parentPortal.childCarePlan('c1'))!._id).toBe('cp1');
  });

  it('childAssessments() defaults items + byTool', async () => {
    mockedApi.get.mockResolvedValueOnce({ success: true });
    const res = await parentPortal.childAssessments('c1');
    expect(res.items).toEqual([]);
    expect(res.byTool).toEqual({});
  });

  it('childAttendance() returns the response object', async () => {
    const att = {
      success: true,
      windowDays: 30,
      stats: { total: 0, completed: 0, noShow: 0, cancelled: 0, late: 0, attendanceRate: null },
    } as any;
    mockedApi.get.mockResolvedValue(att);
    const res = await parentPortal.childAttendance('c1');
    expect(mockedApi.get).toHaveBeenCalledWith('/parent-v2/children/c1/attendance');
    expect(res).toBe(att);
  });
});
