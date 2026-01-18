// Redux Store Configuration - store.js

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import beneficiariesReducer from './slices/beneficiariesSlice';
import reportsReducer from './slices/reportsSlice';
import sessionsReducer from './slices/sessionsSlice';
import assessmentsReducer from './slices/assessmentsSlice';
import programsReducer from './slices/programsSlice';
import goalsReducer from './slices/goalsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    beneficiaries: beneficiariesReducer,
    reports: reportsReducer,
    sessions: sessionsReducer,
    assessments: assessmentsReducer,
    programs: programsReducer,
    goals: goalsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled'],
      },
    }),
});

export default store;
