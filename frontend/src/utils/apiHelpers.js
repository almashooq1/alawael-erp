/**
 * apiHelpers — Axios / API response helpers.
 * أدوات معالجة استجابات واجهة برمجة التطبيقات
 */

/**
 * Extract human-readable error message from API/Axios errors.
 * @param {Error|object} error
 * @param {string} [fallback='حدث خطأ غير متوقع']
 * @returns {string}
 */
export const getErrorMessage = (error, fallback = 'حدث خطأ غير متوقع') => {
  if (!error) return fallback;
  // Axios response error
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error)
      return typeof data.error === 'string' ? data.error : data.error.message || fallback;
    if (data.errors && Array.isArray(data.errors))
      return data.errors.map(e => e.msg || e.message).join('، ');
  }
  // Network error
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error')
    return 'خطأ في الاتصال بالشبكة';
  if (error.code === 'ECONNABORTED') return 'انتهت مهلة الطلب';
  // Timeout
  if (error.response?.status === 408) return 'انتهت مهلة الطلب';
  // Common HTTP statuses
  const statusMessages = {
    400: 'طلب غير صالح',
    401: 'يرجى تسجيل الدخول',
    403: 'ليس لديك صلاحية',
    404: 'العنصر غير موجود',
    409: 'تعارض في البيانات',
    413: 'حجم الملف كبير جداً',
    422: 'بيانات غير صالحة',
    429: 'عدد كبير من الطلبات، يرجى المحاولة لاحقاً',
    500: 'خطأ في الخادم',
    502: 'خطأ في البوابة',
    503: 'الخدمة غير متاحة حالياً',
  };
  if (error.response?.status && statusMessages[error.response.status]) {
    return statusMessages[error.response.status];
  }
  return error.message || fallback;
};

/**
 * Normalize API response to { data, meta, success }.
 * @param {object} response — Axios response
 * @returns {{ data: any, meta: object, success: boolean }}
 */
export const normalizeResponse = response => {
  const body = response?.data;
  if (!body) return { data: null, meta: {}, success: false };
  return {
    data: body.data || body.results || body.items || body,
    meta: {
      total: body.total || body.count || body.totalCount || 0,
      page: body.page || body.currentPage || 1,
      pages: body.pages || body.totalPages || 1,
      limit: body.limit || body.pageSize || 10,
    },
    success: body.success !== undefined ? body.success : true,
  };
};

/**
 * Build query string from params object.
 * Omits null, undefined, empty strings.
 * @param {object} params
 * @returns {string}
 */
export const buildQueryString = params => {
  if (!params || typeof params !== 'object') return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v));
      } else {
        searchParams.set(key, String(value));
      }
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

/**
 * Retry an async function with exponential backoff.
 * @param {function} fn — Async function to retry
 * @param {object} [options]
 * @param {number} [options.retries=3]
 * @param {number} [options.delay=1000] — Initial delay in ms
 * @param {function} [options.shouldRetry] — (error) => bool
 * @returns {Promise<any>}
 */
export const retryAsync = async (fn, options = {}) => {
  const { retries = 3, delay = 1000, shouldRetry } = options;
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === retries) break;
      if (shouldRetry && !shouldRetry(error)) break;
      // Don't retry client errors (4xx) except 408, 429
      const status = error.response?.status;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) break;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw lastError;
};

/**
 * Create a debounced API call that cancels previous pending calls.
 * @param {function} apiCall — (params, signal) => Promise
 * @param {number} [delayMs=300]
 * @returns {{ call: function, cancel: function }}
 */
export const createDebouncedApi = (apiCall, delayMs = 300) => {
  let timer = null;
  let controller = null;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    if (controller) controller.abort();
  };

  const call = (...args) =>
    new Promise((resolve, reject) => {
      cancel();
      timer = setTimeout(async () => {
        controller = new AbortController();
        try {
          const result = await apiCall(...args, controller.signal);
          resolve(result);
        } catch (err) {
          if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') reject(err);
        }
      }, delayMs);
    });

  return { call, cancel };
};

/**
 * Download a blob response as a file.
 * @param {Blob} blob
 * @param {string} filename
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

/**
 * Check if error is an auth/session error that needs re-login.
 * @param {Error|object} error
 * @returns {boolean}
 */
export const isAuthError = error => {
  const status = error?.response?.status;
  return status === 401 || status === 403;
};

/**
 * Check if error is a network error.
 * @param {Error|object} error
 * @returns {boolean}
 */
export const isNetworkError = error => {
  return error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response;
};

export default {
  getErrorMessage,
  normalizeResponse,
  buildQueryString,
  retryAsync,
  createDebouncedApi,
  downloadBlob,
  isAuthError,
  isNetworkError,
};
