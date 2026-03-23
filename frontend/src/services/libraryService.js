import api from './api';
const BASE = '/library';

const libraryService = {
  // ── Dashboard & Stats ──
  getDashboard: () => api.get(`${BASE}/dashboard`),
  getStatistics: () => api.get(`${BASE}/statistics`),
  getResourceTypes: () => api.get(`${BASE}/resource-types`),

  // ── Categories ──
  getCategories: () => api.get(`${BASE}/categories`),
  getCategoryById: id => api.get(`${BASE}/categories/${id}`),
  createCategory: data => api.post(`${BASE}/categories`, data),
  updateCategory: (id, data) => api.put(`${BASE}/categories/${id}`, data),
  deleteCategory: id => api.delete(`${BASE}/categories/${id}`),

  // ── Resources ──
  getResources: (params = {}) => api.get(`${BASE}/resources`, { params }),
  getResourceById: id => api.get(`${BASE}/resources/${id}`),
  createResource: data => api.post(`${BASE}/resources`, data),
  updateResource: (id, data) => api.put(`${BASE}/resources/${id}`, data),
  deleteResource: id => api.delete(`${BASE}/resources/${id}`),
  searchResources: q => api.get(`${BASE}/resources/search`, { params: { q } }),
  findByBarcode: barcode => api.get(`${BASE}/resources/barcode/${barcode}`),
  bulkImport: items => api.post(`${BASE}/resources/bulk-import`, { items }),

  // ── Loans (Lending) ──
  getLoans: (params = {}) => api.get(`${BASE}/loans`, { params }),
  getLoanById: id => api.get(`${BASE}/loans/${id}`),
  checkoutResource: data => api.post(`${BASE}/loans`, data),
  returnResource: loanId => api.post(`${BASE}/loans/${loanId}/return`),
  renewLoan: loanId => api.post(`${BASE}/loans/${loanId}/renew`),
  getOverdueLoans: (params = {}) => api.get(`${BASE}/loans/overdue`, { params }),

  // ── Reservations ──
  getReservations: (params = {}) => api.get(`${BASE}/reservations`, { params }),
  createReservation: data => api.post(`${BASE}/reservations`, data),
  cancelReservation: id => api.post(`${BASE}/reservations/${id}/cancel`),

  // ── Members ──
  getMembers: (params = {}) => api.get(`${BASE}/members`, { params }),
  getMemberById: id => api.get(`${BASE}/members/${id}`),
  createMember: data => api.post(`${BASE}/members`, data),
  updateMember: (id, data) => api.put(`${BASE}/members/${id}`, data),

  // ── Reviews ──
  getResourceReviews: resourceId => api.get(`${BASE}/resources/${resourceId}/reviews`),
  addReview: (resourceId, data) => api.post(`${BASE}/resources/${resourceId}/reviews`, data),

  // ── Suppliers ──
  getSuppliers: () => api.get(`${BASE}/suppliers`),
  createSupplier: data => api.post(`${BASE}/suppliers`, data),

  // ── Maintenance ──
  getMaintenanceRecords: (params = {}) => api.get(`${BASE}/maintenance`, { params }),
  createMaintenanceRecord: data => api.post(`${BASE}/maintenance`, data),
};

export default libraryService;
