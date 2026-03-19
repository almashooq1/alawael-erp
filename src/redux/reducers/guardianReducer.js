/**
 * Guardian Reducer
 * متحكم حالة بوابة ولي الأمر
 */

const initialState = {
  dashboard: null,
  profile: null,
  beneficiaries: [],
  selectedBeneficiary: null,
  financial: {
    summary: null,
    payments: [],
    invoices: [],
    installments: [],
  },
  reports: [],
  analytics: null,
  messages: {
    list: [],
    selectedMessage: null,
    unreadCount: 0,
  },
  notifications: {
    list: [],
    unreadCount: 0,
    preferences: null,
  },
  settings: null,
  loading: false,
  error: null,
};

const guardianReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_GUARDIAN_DASHBOARD_REQUEST':
      return { ...state, loading: true, error: null };

    case 'FETCH_GUARDIAN_DASHBOARD_SUCCESS':
      return { ...state, dashboard: action.payload, loading: false };

    case 'FETCH_GUARDIAN_DASHBOARD_FAILURE':
      return { ...state, error: action.payload, loading: false };

    case 'FETCH_GUARDIAN_PROFILE_SUCCESS':
      return { ...state, profile: action.payload };

    case 'UPDATE_GUARDIAN_PROFILE_SUCCESS':
      return { ...state, profile: action.payload };

    case 'FETCH_BENEFICIARIES_SUCCESS':
      return { ...state, beneficiaries: action.payload };

    case 'SELECT_BENEFICIARY':
      return { ...state, selectedBeneficiary: action.payload };

    case 'FETCH_FINANCIAL_SUMMARY_SUCCESS':
      return {
        ...state,
        financial: { ...state.financial, summary: action.payload },
      };

    case 'FETCH_PAYMENTS_SUCCESS':
      return {
        ...state,
        financial: { ...state.financial, payments: action.payload },
      };

    case 'FETCH_INVOICES_SUCCESS':
      return {
        ...state,
        financial: { ...state.financial, invoices: action.payload },
      };

    case 'FETCH_INSTALLMENTS_SUCCESS':
      return {
        ...state,
        financial: { ...state.financial, installments: action.payload },
      };

    case 'FETCH_REPORTS_SUCCESS':
      return { ...state, reports: action.payload };

    case 'FETCH_ANALYTICS_SUCCESS':
      return { ...state, analytics: action.payload };

    case 'FETCH_GUARDIAN_MESSAGES_SUCCESS':
      return {
        ...state,
        messages: {
          ...state.messages,
          list: action.payload.messages || [],
          unreadCount: action.payload.unreadCount || 0,
        },
      };

    case 'SELECT_GUARDIAN_MESSAGE':
      return {
        ...state,
        messages: { ...state.messages, selectedMessage: action.payload },
      };

    case 'FETCH_GUARDIAN_NOTIFICATIONS_SUCCESS':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          list: action.payload.notifications || [],
          unreadCount: action.payload.unreadCount || 0,
        },
      };

    case 'FETCH_GUARDIAN_SETTINGS_SUCCESS':
      return { ...state, settings: action.payload };

    case 'PAYMENT_SUCCESS':
      return {
        ...state,
        financial: { ...state.financial, payments: [...state.financial.payments, action.payload] },
      };

    case 'SET_GUARDIAN_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_GUARDIAN_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_GUARDIAN_ERROR':
      return { ...state, error: null };

    case 'CLEAR_GUARDIAN_DATA':
      return initialState;

    default:
      return state;
  }
};

export default guardianReducer;
