/**
 * خدمة المدفوعات والفواتير
 * معالجة جميع العمليات المالية
 */

import apiClient from './api.client';

const paymentService = {
  // ==================== الفواتير ====================
  getInvoices: (page = 1) =>
    apiClient.get(`/payments/invoices?page=${page}`),

  getInvoiceDetail: (invoiceId) =>
    apiClient.get(`/payments/invoices/${invoiceId}`),

  downloadInvoice: (invoiceId) =>
    apiClient.get(`/payments/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    }),

  requestNewInvoice: (invoiceData) =>
    apiClient.post('/payments/invoices/request', invoiceData),

  // ==================== طرق الدفع ====================
  getPaymentMethods: () =>
    apiClient.get('/payments/methods'),

  addPaymentMethod: (methodData) =>
    apiClient.post('/payments/methods', methodData),

  setDefaultPaymentMethod: (methodId) =>
    apiClient.put(`/payments/methods/${methodId}/default`),

  deletePaymentMethod: (methodId) =>
    apiClient.delete(`/payments/methods/${methodId}`),

  // ==================== المعاملات ====================
  getTransactions: (page = 1) =>
    apiClient.get(`/payments/transactions?page=${page}`),

  getTransactionDetail: (transactionId) =>
    apiClient.get(`/payments/transactions/${transactionId}`),

  downloadReceipt: (transactionId) =>
    apiClient.get(`/payments/transactions/${transactionId}/receipt`, {
      responseType: 'blob',
    }),

  // ==================== معالجة الدفع ====================
  processPayment: (paymentData) =>
    apiClient.post('/payments/process', paymentData),

  verifyPayment: (paymentId) =>
    apiClient.get(`/payments/verify/${paymentId}`),

  // ==================== خطط الدفع ====================
  getInstallmentPlans: () =>
    apiClient.get('/payments/installments'),

  getInstallmentPlanDetail: (planId) =>
    apiClient.get(`/payments/installments/${planId}`),

  createInstallmentPlan: (planData) =>
    apiClient.post('/payments/installments', planData),

  payInstallment: (installmentId) =>
    apiClient.post(`/payments/installments/${installmentId}/pay`),

  // ==================== الخصومات ====================
  applyPromoCode: (code) =>
    apiClient.post('/payments/promo', { code }),

  getAvailablePromos: () =>
    apiClient.get('/payments/promos'),

  // ==================== المبالغ المرجعة ====================
  requestRefund: (transactionId, reason) =>
    apiClient.post(`/payments/refunds/${transactionId}`, { reason }),

  getRefunds: () =>
    apiClient.get('/payments/refunds'),

  getRefundDetail: (refundId) =>
    apiClient.get(`/payments/refunds/${refundId}`),

  // ==================== التوقعات والإحصائيات ====================
  getPaymentSchedule: (months = 3) =>
    apiClient.get(`/payments/schedule?months=${months}`),

  getPaymentStatistics: () =>
    apiClient.get('/payments/statistics'),

  getMonthlyPayments: (month) =>
    apiClient.get(`/payments/monthly/${month}`),

  // ==================== الإشعارات المالية ====================
  getPaymentReminders: () =>
    apiClient.get('/payments/reminders'),

  snoozeReminder: (reminderId) =>
    apiClient.post(`/payments/reminders/${reminderId}/snooze`),

  dismissReminder: (reminderId) =>
    apiClient.delete(`/payments/reminders/${reminderId}`),
};

export default paymentService;
