/**
 * Redux Store Configuration - Mobile App
 * تكوين متجر Redux - تطبيق الهاتف الذكي
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import thunk from 'redux-thunk';

// Redux Slices
import authReducer from './slices/authSlice';
import licensesReducer from './slices/licensesSlice';
import paymentsReducer from './slices/paymentsSlice';
import documentsReducer from './slices/documentsSlice';
import uiReducer from './slices/uiSlice';

/**
 * Persist Configuration
 */
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  timeout: 12000,
  whitelist: ['auth', 'licenses', 'payments', 'ui'],
};

/**
 * Root Reducer with Persist
 */
const persistedAuthReducer = persistReducer(persistConfig, authReducer);

/**
 * Configure Store
 */
const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    licenses: licensesReducer,
    payments: paymentsReducer,
    documents: documentsReducer,
    ui: uiReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(thunk),
  devTools: __DEV__,
});

/**
 * Persistor for Redux Persist
 */
export const persistor = persistStore(store);

export default store;
