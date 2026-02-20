// Redux Store Configuration
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import analyticsReducer from './slices/analyticsSlice';
import rbacReducer from './slices/rbacSlice';
import cmsReducer from './slices/cmsSlice';
import notificationsReducer from './slices/notificationsSlice';
import reportsReducer from './slices/reportsSlice';
import supportReducer from './slices/supportSlice';
import monitoringReducer from './slices/monitoringSlice';
import performanceReducer from './slices/performanceSlice';
import predictionsReducer from './slices/predictionsSlice';
import integrationsReducer from './slices/integrationsSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    analytics: analyticsReducer,
    rbac: rbacReducer,
    cms: cmsReducer,
    notifications: notificationsReducer,
    reports: reportsReducer,
    support: supportReducer,
    monitoring: monitoringReducer,
    performance: performanceReducer,
    predictions: predictionsReducer,
    integrations: integrationsReducer,
    settings: settingsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;
