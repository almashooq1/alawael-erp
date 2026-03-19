// Simple default API client for fetch requests
const api = {
  get: (url, options = {}) => fetch(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) =>
    fetch(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    }),
  put: (url, body, options = {}) =>
    fetch(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    }),
  delete: (url, options = {}) => fetch(url, { ...options, method: 'DELETE' }),
};

export default api;
