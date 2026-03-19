/**
 * Redux Store Configuration
 * إعداد مركز إدارة الحالة
 */

import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import authReducer from './reducers/authReducer';
import beneficiaryReducer from './reducers/beneficiaryReducer';
import guardianReducer from './reducers/guardianReducer';
import notificationReducer from './reducers/notificationReducer';
import paymentReducer from './reducers/paymentReducer';

// دمج جميع المتحكمات
const rootReducer = combineReducers({
  auth: authReducer,
  beneficiary: beneficiaryReducer,
  guardian: guardianReducer,
  notifications: notificationReducer,
  payments: paymentReducer,
});

// تطبيق Middleware
const middleware = [thunk];

// في بيئة التطوير، يمكن إضافة logger
if (process.env.NODE_ENV === 'development') {
  // يمكن إضافة redux-logger هنا
}

// إنشاء Store
const store = createStore(rootReducer, applyMiddleware(...middleware));

export default store;
