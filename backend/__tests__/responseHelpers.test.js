/**
 * @file responseHelpers.test.js
 * اختبارات وحدة لأدوات الاستجابة الموحدة
 */
const { sendSuccess, sendError } = require('../utils/responseHelpers');

/* ─── Mock res factory ─── */
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/* ================================================================
 *  sendSuccess
 * ================================================================ */
describe('sendSuccess', () => {
  test('sends 200 with default message', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'تمت العملية بنجاح',
      data: { id: 1 },
    });
  });

  test('accepts custom message', () => {
    const res = mockRes();
    sendSuccess(res, [], 'تم الجلب');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'تم الجلب' }));
  });

  test('accepts custom status code', () => {
    const res = mockRes();
    sendSuccess(res, null, 'created', 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('handles null data', () => {
    const res = mockRes();
    sendSuccess(res, null);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: null }));
  });

  test('handles array data', () => {
    const res = mockRes();
    const data = [{ a: 1 }, { a: 2 }];
    sendSuccess(res, data);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
  });

  test('returns res for chaining', () => {
    const res = mockRes();
    const result = sendSuccess(res, 'ok');
    expect(result).toBe(res);
  });
});

/* ================================================================
 *  sendError
 * ================================================================ */
describe('sendError', () => {
  test('sends 500 with default message', () => {
    const res = mockRes();
    sendError(res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'حدث خطأ في الخادم',
    });
  });

  test('accepts custom message and status', () => {
    const res = mockRes();
    sendError(res, 'not found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'not found',
    });
  });

  test('includes details when provided', () => {
    const res = mockRes();
    const details = { field: 'email', error: 'required' };
    sendError(res, 'validation', 400, details);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'validation',
      details,
    });
  });

  test('omits details when null', () => {
    const res = mockRes();
    sendError(res, 'error', 500, null);
    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty('details');
  });

  test('omits details when undefined (default)', () => {
    const res = mockRes();
    sendError(res, 'oops');
    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty('details');
  });

  test('includes details when truthy (string)', () => {
    const res = mockRes();
    sendError(res, 'err', 400, 'extra info');
    const body = res.json.mock.calls[0][0];
    expect(body.details).toBe('extra info');
  });

  test('returns res for chaining', () => {
    const res = mockRes();
    const result = sendError(res, 'fail');
    expect(result).toBe(res);
  });
});
