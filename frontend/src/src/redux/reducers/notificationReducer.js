/**
 * Notification Reducer
 * متحكم حالة الإخطارات العامة للتطبيق
 */

const initialState = {
  toasts: [], // رسائل عابرة
  alerts: [], // تنبيهات مهمة
  unreadCount: 0,
  loading: false,
  error: null,
};

const notificationReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, { id: Date.now(), ...action.payload }],
      };

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.payload),
      };

    case 'CLEAR_TOASTS':
      return { ...state, toasts: [] };

    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [...state.alerts, { id: Date.now(), ...action.payload }],
        unreadCount: state.unreadCount + 1,
      };

    case 'REMOVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter(a => a.id !== action.payload),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };

    case 'CLEAR_ALERTS':
      return {
        ...state,
        alerts: [],
        unreadCount: 0,
      };

    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };

    default:
      return state;
  }
};

export default notificationReducer;
