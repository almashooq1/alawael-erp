/**
 * Beneficiary Reducer
 * متحكم حالة بوابة المتعلم
 */

const initialState = {
  dashboard: null,
  profile: null,
  progress: null,
  grades: null,
  attendance: null,
  programs: [],
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
  documents: [],
  guardians: [],
  settings: null,
  loading: false,
  error: null,
};

const beneficiaryReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_DASHBOARD_REQUEST':
      return { ...state, loading: true, error: null };

    case 'FETCH_DASHBOARD_SUCCESS':
      return { ...state, dashboard: action.payload, loading: false };

    case 'FETCH_DASHBOARD_FAILURE':
      return { ...state, error: action.payload, loading: false };

    case 'FETCH_PROFILE_SUCCESS':
      return { ...state, profile: action.payload };

    case 'UPDATE_PROFILE_SUCCESS':
      return { ...state, profile: action.payload };

    case 'FETCH_PROGRESS_SUCCESS':
      return { ...state, progress: action.payload };

    case 'FETCH_GRADES_SUCCESS':
      return { ...state, grades: action.payload };

    case 'FETCH_ATTENDANCE_SUCCESS':
      return { ...state, attendance: action.payload };

    case 'FETCH_PROGRAMS_SUCCESS':
      return { ...state, programs: action.payload };

    case 'FETCH_MESSAGES_SUCCESS':
      return {
        ...state,
        messages: {
          ...state.messages,
          list: action.payload.messages || [],
          unreadCount: action.payload.unreadCount || 0,
        },
      };

    case 'SELECT_MESSAGE':
      return {
        ...state,
        messages: { ...state.messages, selectedMessage: action.payload },
      };

    case 'FETCH_NOTIFICATIONS_SUCCESS':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          list: action.payload.notifications || [],
          unreadCount: action.payload.unreadCount || 0,
        },
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          unreadCount: Math.max(0, state.notifications.unreadCount - 1),
        },
      };

    case 'FETCH_DOCUMENTS_SUCCESS':
      return { ...state, documents: action.payload };

    case 'FETCH_GUARDIANS_SUCCESS':
      return { ...state, guardians: action.payload };

    case 'FETCH_SETTINGS_SUCCESS':
      return { ...state, settings: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'CLEAR_BENEFICIARY_DATA':
      return initialState;

    default:
      return state;
  }
};

export default beneficiaryReducer;
