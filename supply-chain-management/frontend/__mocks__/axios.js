// Manual mock for axios. Components in this repo call bare
// `axios.get('/api/...')` inside `useEffect` without try/catch, which crashes
// the Jest worker on unhandled network rejections in jsdom. Provide safe
// no-op resolved values by default; individual tests can override per-call.
const safeResponse = { data: [], status: 200, headers: {}, config: {} };

const mock = {
  get: jest.fn(() => Promise.resolve(safeResponse)),
  post: jest.fn(() => Promise.resolve({ ...safeResponse, data: {} })),
  put: jest.fn(() => Promise.resolve({ ...safeResponse, data: {} })),
  patch: jest.fn(() => Promise.resolve({ ...safeResponse, data: {} })),
  delete: jest.fn(() => Promise.resolve({ ...safeResponse, data: {} })),
  request: jest.fn(() => Promise.resolve(safeResponse)),
  create: jest.fn(function create() {
    return mock;
  }),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
  defaults: { headers: { common: {} } },
  isAxiosError: jest.fn(() => false),
  CancelToken: { source: jest.fn(() => ({ token: {}, cancel: jest.fn() })) },
};

module.exports = mock;
module.exports.default = mock;
