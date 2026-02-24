/**
 * Documents & UI Redux Slices - Mobile App
 * شرائح المستندات والواجهة Redux - تطبيق الهاتف الذكي
 */

import { createSlice } from '@reduxjs/toolkit';
import mobileApiService from '../../services/mobileApiService';

/**
 * Documents Slice
 */
const documentsInitialState = {
  data: [],
  selectedDocument: null,
  loading: false,
  error: null,
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState: documentsInitialState,
  reducers: {
    setDocuments: (state, action) => {
      state.data = action.payload;
    },
    addDocument: (state, action) => {
      state.data.push(action.payload);
    },
    removeDocument: (state, action) => {
      state.data = state.data.filter(doc => doc.id !== action.payload);
    },
    setSelectedDocument: (state, action) => {
      state.selectedDocument = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

/**
 * UI Slice - للتحكم في حالة الواجهة
 */
const uiInitialState = {
  theme: 'light', // light/dark
  language: 'ar', // ar/en
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  biometric: {
    enabled: false,
    type: null, // face/fingerprint
  },
  loading: false,
  snackbar: {
    visible: false,
    message: '',
    type: 'info', // info/success/error/warning
  },
  modal: {
    visible: false,
    type: null,
    data: null,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: uiInitialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    setNotifications: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    setBiometric: (state, action) => {
      state.biometric = { ...state.biometric, ...action.payload };
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    showSnackbar: (state, action) => {
      state.snackbar = {
        visible: true,
        message: action.payload.message,
        type: action.payload.type || 'info',
      };
    },
    hideSnackbar: state => {
      state.snackbar.visible = false;
    },
    showModal: (state, action) => {
      state.modal = {
        visible: true,
        type: action.payload.type,
        data: action.payload.data,
      };
    },
    hideModal: state => {
      state.modal.visible = false;
    },
  },
});

export const {
  setDocuments,
  addDocument,
  removeDocument,
  setSelectedDocument,
  setError: setDocumentsError,
  setLoading: setDocumentsLoading,
} = documentsSlice.actions;

export const {
  setTheme,
  setLanguage,
  setNotifications,
  setBiometric,
  setLoading: setUILoading,
  showSnackbar,
  hideSnackbar,
  showModal,
  hideModal,
} = uiSlice.actions;

export const documentsReducer = documentsSlice.reducer;
export const uiReducer = uiSlice.reducer;
