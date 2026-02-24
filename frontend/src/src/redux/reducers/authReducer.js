/**
 * Auth Reducer
 * متحكم حالة المصادقة والمستخدم
 */

const initialState = {
  isAuthenticated: !!localStorage.getItem('authToken'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
  token: localStorage.getItem('authToken'),
  portal: localStorage.getItem('portal'),
  loading: false,
  error: null,
  twoFactorEnabled: false,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'LOGIN_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      localStorage.setItem('authToken', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('portal', action.payload.portal);
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        portal: action.payload.portal,
        loading: false,
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case 'LOGOUT':
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('portal');
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        portal: null,
        error: null,
      };

    case 'UPDATE_USER':
      const updatedUser = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return {
        ...state,
        user: updatedUser,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'ENABLE_2FA':
      return {
        ...state,
        twoFactorEnabled: true,
      };

    case 'DISABLE_2FA':
      return {
        ...state,
        twoFactorEnabled: false,
      };

    default:
      return state;
  }
};

export default authReducer;
