/**
 * PHASE 15: MOBILE NAVIGATION & ROUTES
 * React Navigation Stack & Tab Navigation
 * AlAwael Mobile v1.0 | 2026-01-24
 */

import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Biometrics from 'react-native-biometrics';

// Navigation
export class MobileNavigationManager {
  constructor() {
    this.navigationState = {};
    this.routeHistory = [];
  }

  /**
   * Navigate to screen
   */
  async navigateTo(screen, params = {}) {
    try {
      this.routeHistory.push({
        screen,
        params,
        timestamp: Date.now(),
      });
      return { success: true, navigated: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Go back
   */
  goBack() {
    if (this.routeHistory.length > 1) {
      this.routeHistory.pop();
      return { success: true };
    }
    return { success: false, error: 'No history' };
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.routeHistory[this.routeHistory.length - 1];
  }
}

// ============================================================================
// BIOMETRIC AUTHENTICATION
// ============================================================================
export class BiometricAuth {
  static async isBiometricAvailable() {
    try {
      const available = await Biometrics.isSensorAvailable();
      return available;
    } catch (error) {
      return false;
    }
  }

  static async authenticate() {
    try {
      const result = await Biometrics.simplePrompt({
        promptMessage: 'Authenticate with biometrics',
      });
      return result.success;
    } catch (error) {
      return false;
    }
  }

  static async enrollBiometric() {
    try {
      const available = await this.isBiometricAvailable();
      if (!available) {
        return { success: false, error: 'Biometric not available' };
      }

      const result = await Biometrics.simplePrompt({
        promptMessage: 'Please authenticate to enable biometric login',
      });

      if (result.success) {
        await AsyncStorage.setItem('biometricEnabled', 'true');
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem('biometricEnabled');
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }
}

// ============================================================================
// SCREEN DEFINITIONS
// ============================================================================
export const screenConfig = {
  // Authentication Stack
  Auth: {
    Login: {
      name: 'Login',
      options: {
        headerShown: false,
        animationEnabled: true,
      },
    },
    Register: {
      name: 'Register',
      options: {
        headerShown: false,
      },
    },
    ForgotPassword: {
      name: 'ForgotPassword',
      options: {
        headerShown: true,
        title: 'Forgot Password',
      },
    },
  },

  // Main App Stack
  Main: {
    Dashboard: {
      name: 'Dashboard',
      options: {
        headerShown: false,
        tabBarIcon: '📊',
      },
    },
    Sales: {
      name: 'Sales',
      options: {
        headerShown: true,
        title: 'Sales Management',
        tabBarIcon: '💰',
      },
    },
    Inventory: {
      name: 'Inventory',
      options: {
        headerShown: true,
        title: 'Inventory',
        tabBarIcon: '📦',
      },
    },
    Reports: {
      name: 'Reports',
      options: {
        headerShown: true,
        title: 'Reports',
        tabBarIcon: '📈',
      },
    },
    Settings: {
      name: 'Settings',
      options: {
        headerShown: true,
        title: 'Settings',
        tabBarIcon: '⚙️',
      },
    },
  },

  // Modal Stack
  Modal: {
    NewSale: {
      name: 'NewSale',
      options: {
        headerShown: true,
        title: 'New Sale',
      },
    },
    EditItem: {
      name: 'EditItem',
      options: {
        headerShown: true,
        title: 'Edit Item',
      },
    },
    CustomerProfile: {
      name: 'CustomerProfile',
      options: {
        headerShown: true,
        title: 'Customer Profile',
      },
    },
  },
};

// ============================================================================
// APP CONTAINER
// ============================================================================
export class AppContainer {
  constructor() {
    this.isAuthenticated = false;
    this.user = null;
    this.navigationManager = new MobileNavigationManager();
  }

  async initialize() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        this.isAuthenticated = true;
        const userStr = await AsyncStorage.getItem('user');
        this.user = userStr ? JSON.parse(userStr) : null;
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(token, user) {
    try {
      this.isAuthenticated = true;
      this.user = user;
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      this.isAuthenticated = false;
      this.user = null;
      this.navigationManager.routeHistory = [];
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// DEEP LINKING HANDLER
// ============================================================================
export class DeepLinkHandler {
  constructor() {
    this.linkMap = {
      dashboard: { screen: 'Dashboard' },
      sales: { screen: 'Sales' },
      inventory: { screen: 'Inventory' },
      reports: { screen: 'Reports' },
      'customer/:id': { screen: 'CustomerProfile', param: 'id' },
      'sale/:id': { screen: 'SaleDetail', param: 'id' },
    };
  }

  /**
   * Handle deep link
   */
  handleDeepLink(url) {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.substring(1);

      for (const [pattern, config] of Object.entries(this.linkMap)) {
        if (pattern === path || this.matchPattern(pattern, path)) {
          return this.buildNavigation(pattern, path, config);
        }
      }

      return { success: false, error: 'Link not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  matchPattern(pattern, path) {
    const regex = pattern.replace('/:id', '/\\d+');
    return new RegExp(regex).test(path);
  }

  buildNavigation(pattern, path, config) {
    const params = {};
    if (pattern.includes(':id')) {
      const id = path.split('/')[1];
      params[config.param] = id;
    }
    return {
      success: true,
      screen: config.screen,
      params,
    };
  }
}

// ============================================================================
// LOCAL STORAGE MANAGER
// ============================================================================
export class LocalStorageManager {
  /**
   * Save data
   */
  static async saveData(key, data) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get data
   */
  static async getData(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete data
   */
  static async deleteData(key) {
    try {
      await AsyncStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all
   */
  static async clearAll() {
    try {
      await AsyncStorage.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// SYNC MANAGER
// ============================================================================
export class SyncManager {
  static syncInterval = null;

  static initialize() {
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(
      () => {
        this.performSync();
      },
      5 * 60 * 1000
    );
  }

  static async performSync() {
    try {
      const pendingData = await LocalStorageManager.getData('pending_sync');
      if (!pendingData || pendingData.length === 0) {
        return { success: true, synced: 0 };
      }

      // Sync each pending item
      for (const item of pendingData) {
        await this.syncItem(item);
      }

      await LocalStorageManager.deleteData('pending_sync');
      return { success: true, synced: pendingData.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async syncItem(item) {
    // Sync logic here
    return { success: true };
  }

  static stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export default {
  MobileNavigationManager,
  BiometricAuth,
  screenConfig,
  AppContainer,
  DeepLinkHandler,
  LocalStorageManager,
  SyncManager,
};
