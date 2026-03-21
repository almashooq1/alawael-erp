/**
 * apiHelpers.js — Unit Tests
 * اختبارات وحدة لأدوات واجهة برمجة التطبيقات
 */
import {
  getErrorMessage,
  normalizeResponse,
  buildQueryString,
  isAuthError,
  isNetworkError,
} from 'utils/apiHelpers';

/* ═══════════════ getErrorMessage ═══════════════ */
describe('getErrorMessage', () => {
  test('returns fallback for null/undefined error', () => {
    expect(getErrorMessage(null)).toBe('حدث خطأ غير متوقع');
    expect(getErrorMessage(undefined)).toBe('حدث خطأ غير متوقع');
  });

  test('uses custom fallback', () => {
    expect(getErrorMessage(null, 'خطأ مخصص')).toBe('خطأ مخصص');
  });

  test('extracts string response data', () => {
    const error = { response: { data: 'خطأ في البيانات' } };
    expect(getErrorMessage(error)).toBe('خطأ في البيانات');
  });

  test('extracts message from response data', () => {
    const error = { response: { data: { message: 'البريد مستخدم' } } };
    expect(getErrorMessage(error)).toBe('البريد مستخدم');
  });

  test('extracts error string from response data', () => {
    const error = { response: { data: { error: 'Token expired' } } };
    expect(getErrorMessage(error)).toBe('Token expired');
  });

  test('extracts error.message from response data', () => {
    const error = { response: { data: { error: { message: 'Invalid input' } } } };
    expect(getErrorMessage(error)).toBe('Invalid input');
  });

  test('joins array of errors', () => {
    const error = {
      response: {
        data: {
          errors: [{ msg: 'الاسم مطلوب' }, { msg: 'البريد مطلوب' }],
        },
      },
    };
    expect(getErrorMessage(error)).toContain('الاسم مطلوب');
    expect(getErrorMessage(error)).toContain('البريد مطلوب');
  });

  test('handles network error', () => {
    const error = { code: 'ERR_NETWORK', message: 'Network Error' };
    expect(getErrorMessage(error)).toBe('خطأ في الاتصال بالشبكة');
  });

  test('handles timeout ECONNABORTED', () => {
    const error = { code: 'ECONNABORTED', message: 'timeout' };
    expect(getErrorMessage(error)).toBe('انتهت مهلة الطلب');
  });

  test('handles HTTP 408 timeout', () => {
    const error = { response: { status: 408 } };
    expect(getErrorMessage(error)).toBe('انتهت مهلة الطلب');
  });

  test('handles HTTP 401', () => {
    const error = { response: { status: 401 } };
    expect(getErrorMessage(error)).toBe('يرجى تسجيل الدخول');
  });

  test('handles HTTP 403', () => {
    const error = { response: { status: 403 } };
    expect(getErrorMessage(error)).toBe('ليس لديك صلاحية');
  });

  test('handles HTTP 404', () => {
    const error = { response: { status: 404 } };
    expect(getErrorMessage(error)).toBe('العنصر غير موجود');
  });

  test('handles HTTP 500', () => {
    const error = { response: { status: 500 } };
    expect(getErrorMessage(error)).toBe('خطأ في الخادم');
  });

  test('handles HTTP 429 rate limit', () => {
    const error = { response: { status: 429 } };
    expect(getErrorMessage(error)).toContain('عدد كبير');
  });

  test('falls back to error.message', () => {
    const error = { message: 'Something went wrong' };
    expect(getErrorMessage(error)).toBe('Something went wrong');
  });
});

/* ═══════════════ normalizeResponse ═══════════════ */
describe('normalizeResponse', () => {
  test('normalizes standard response with data', () => {
    const response = {
      data: { data: [{ id: 1 }], total: 100, page: 2, pages: 10 },
    };
    const result = normalizeResponse(response);
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.meta.total).toBe(100);
    expect(result.meta.page).toBe(2);
    expect(result.meta.pages).toBe(10);
    expect(result.success).toBe(true);
  });

  test('normalizes response with results key', () => {
    const response = { data: { results: [{ id: 2 }], count: 50 } };
    const result = normalizeResponse(response);
    expect(result.data).toEqual([{ id: 2 }]);
    expect(result.meta.total).toBe(50);
  });

  test('normalizes response with items key', () => {
    const response = { data: { items: [{ id: 3 }], totalCount: 25 } };
    const result = normalizeResponse(response);
    expect(result.data).toEqual([{ id: 3 }]);
    expect(result.meta.total).toBe(25);
  });

  test('returns body as data when no nested data key', () => {
    const response = { data: { id: 1, name: 'Test' } };
    const result = normalizeResponse(response);
    expect(result.data).toEqual({ id: 1, name: 'Test' });
  });

  test('handles null response', () => {
    const result = normalizeResponse(null);
    expect(result.data).toBeNull();
    expect(result.success).toBe(false);
  });

  test('handles response with no data', () => {
    const result = normalizeResponse({});
    expect(result.data).toBeNull();
    expect(result.success).toBe(false);
  });

  test('respects explicit success field', () => {
    const response = { data: { success: false, message: 'Failed' } };
    const result = normalizeResponse(response);
    expect(result.success).toBe(false);
  });

  test('defaults meta values', () => {
    const response = { data: { data: [] } };
    const result = normalizeResponse(response);
    expect(result.meta.total).toBe(0);
    expect(result.meta.page).toBe(1);
    expect(result.meta.pages).toBe(1);
    expect(result.meta.limit).toBe(10);
  });
});

/* ═══════════════ buildQueryString ═══════════════ */
describe('buildQueryString', () => {
  test('builds simple query string', () => {
    const result = buildQueryString({ page: 1, limit: 10 });
    expect(result).toBe('?page=1&limit=10');
  });

  test('omits null values', () => {
    const result = buildQueryString({ page: 1, name: null });
    expect(result).toBe('?page=1');
    expect(result).not.toContain('name');
  });

  test('omits undefined values', () => {
    const result = buildQueryString({ search: undefined, page: 2 });
    expect(result).toBe('?page=2');
  });

  test('omits empty strings', () => {
    const result = buildQueryString({ query: '', page: 1 });
    expect(result).toBe('?page=1');
  });

  test('handles array values', () => {
    const result = buildQueryString({ tags: ['a', 'b'] });
    expect(result).toContain('tags=a');
    expect(result).toContain('tags=b');
  });

  test('returns empty string for empty object', () => {
    expect(buildQueryString({})).toBe('');
  });

  test('returns empty string for null', () => {
    expect(buildQueryString(null)).toBe('');
  });

  test('returns empty string for non-object', () => {
    expect(buildQueryString('string')).toBe('');
  });

  test('converts numbers to strings', () => {
    const result = buildQueryString({ count: 42 });
    expect(result).toBe('?count=42');
  });
});

/* ═══════════════ isAuthError ═══════════════ */
describe('isAuthError', () => {
  test('returns true for 401', () => {
    expect(isAuthError({ response: { status: 401 } })).toBe(true);
  });

  test('returns true for 403', () => {
    expect(isAuthError({ response: { status: 403 } })).toBe(true);
  });

  test('returns false for 400', () => {
    expect(isAuthError({ response: { status: 400 } })).toBe(false);
  });

  test('returns false for 500', () => {
    expect(isAuthError({ response: { status: 500 } })).toBe(false);
  });

  test('returns false for network error (no response)', () => {
    expect(isAuthError({ code: 'ERR_NETWORK' })).toBe(false);
  });
});

/* ═══════════════ isNetworkError ═══════════════ */
describe('isNetworkError', () => {
  test('detects ERR_NETWORK code', () => {
    expect(isNetworkError({ code: 'ERR_NETWORK', message: '' })).toBe(true);
  });

  test('detects Network Error message', () => {
    expect(isNetworkError({ message: 'Network Error' })).toBe(true);
  });

  test('detects missing response as network error', () => {
    expect(isNetworkError({ message: 'Something' })).toBe(true);
  });

  test('returns false for error with response', () => {
    expect(isNetworkError({ response: { status: 500 }, message: '' })).toBe(false);
  });
});
