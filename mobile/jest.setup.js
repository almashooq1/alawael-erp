import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
  }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
  }),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  addNotificationReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// Mock SQLite
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    exec: jest.fn(),
  })),
}));

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
