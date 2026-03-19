/**
 * Auth Reducer
 * متحكم حالة المصادقة والمستخدم
 */

import {
  getToken,
  setToken,
  removeToken,
  getUserData,
  setUserData,
  removeUserData,
} from '../../utils/tokenStorage';

const initialState = {
  isAuthenticated: !!getToken(),
  user: getUserData(),
  token: getToken(),
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
      setToken(action.payload.token);
      setUserData(action.payload.user);
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
      removeToken();
      removeUserData();
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
      setUserData(updatedUser);
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
