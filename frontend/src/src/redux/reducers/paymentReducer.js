/**
 * Payment Reducer
 * متحكم حالة المدفوعات والفواتير
 */

const initialState = {
  invoices: [],
  payments: [],
  paymentMethods: [],
  transactions: [],
  installmentPlans: [],
  selectedPayment: null,
  paymentSchedule: null,
  totalDue: 0,
  totalPaid: 0,
  overdueAmount: 0,
  loading: false,
  error: null,
  isProcessing: false,
};

const paymentReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_INVOICES_REQUEST':
      return { ...state, loading: true, error: null };

    case 'FETCH_INVOICES_SUCCESS':
      return {
        ...state,
        invoices: action.payload,
        loading: false,
      };

    case 'FETCH_INVOICES_FAILURE':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case 'FETCH_PAYMENTS_REQUEST':
      return { ...state, loading: true, error: null };

    case 'FETCH_PAYMENTS_SUCCESS':
      return {
        ...state,
        payments: action.payload,
        loading: false,
      };

    case 'FETCH_PAYMENT_METHODS_SUCCESS':
      return { ...state, paymentMethods: action.payload };

    case 'FETCH_TRANSACTIONS_SUCCESS':
      return { ...state, transactions: action.payload };

    case 'FETCH_INSTALLMENT_PLANS_SUCCESS':
      return { ...state, installmentPlans: action.payload };

    case 'FETCH_PAYMENT_SCHEDULE_SUCCESS':
      return { ...state, paymentSchedule: action.payload };

    case 'SELECT_PAYMENT':
      return { ...state, selectedPayment: action.payload };

    case 'PROCESS_PAYMENT_REQUEST':
      return { ...state, isProcessing: true, error: null };

    case 'PROCESS_PAYMENT_SUCCESS':
      return {
        ...state,
        payments: [...state.payments, action.payload],
        isProcessing: false,
      };

    case 'PROCESS_PAYMENT_FAILURE':
      return {
        ...state,
        error: action.payload,
        isProcessing: false,
      };

    case 'UPDATE_FINANCIAL_SUMMARY':
      return {
        ...state,
        totalDue: action.payload.totalDue || 0,
        totalPaid: action.payload.totalPaid || 0,
        overdueAmount: action.payload.overdueAmount || 0,
      };

    case 'SET_PAYMENT_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_PAYMENT_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_PAYMENT_ERROR':
      return { ...state, error: null };

    case 'CLEAR_PAYMENT_DATA':
      return initialState;

    default:
      return state;
  }
};

export default paymentReducer;
