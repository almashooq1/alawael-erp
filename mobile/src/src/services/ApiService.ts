/**
 * API Service for AlAwael ERP Mobile
 * Handles all HTTP requests and offline support
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { showMessage } from 'react-native-flash-message';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.alawael.com/api/v1';

interface ApiConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

class ApiService {
  private api: AxiosInstance;
  private retryAttempts = 3;
  private retryDelay = 1000;
  private offlineQueue: any[] = [];
  private isOnline = true;

  constructor(config: ApiConfig = {}) {
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;

    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - Add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const result = await this.refreshToken();
            if (result.success) {
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.handleAuthError();
          }
        }

        // Offline support - Queue requests
        if (!this.isOnline && originalRequest.method !== 'get') {
          this.offlineQueue.push({ config: originalRequest, resolve: null, reject: null });
          showMessage({
            message: 'Offline Mode',
            description: 'Request queued. It will be sent when connection is restored.',
            type: 'info',
          });
          return new Promise((resolve, reject) => {
            originalRequest._offlineResolve = resolve;
            originalRequest._offlineReject = reject;
          });
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, params?: any): Promise<T> {
    try {
      const response = await this.api.get<T>(url, { params });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.api.post<T>(url, data);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.api.put<T>(url, data);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string): Promise<T> {
    try {
      const response = await this.api.delete<T>(url);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Batch requests
   */
  async batch<T = any>(requests: Array<{ method: string; url: string; data?: any }>): Promise<T[]> {
    try {
      const promises = requests.map((req) => {
        switch (req.method.toLowerCase()) {
          case 'get':
            return this.get(req.url);
          case 'post':
            return this.post(req.url, req.data);
          case 'put':
            return this.put(req.url, req.data);
          case 'delete':
            return this.delete(req.url);
          default:
            return Promise.reject(new Error(`Unsupported method: ${req.method}`));
        }
      });
      return Promise.all(promises);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload file
   */
  async uploadFile<T = any>(url: string, file: any, fieldName: string = 'file'): Promise<T> {
    try {
      const formData = new FormData();
      formData.append(fieldName, file);

      const response = await this.api.post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Download file
   */
  async downloadFile(url: string): Promise<any> {
    try {
      const response = await this.api.get(url, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<{ success: boolean; token?: string }> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        return { success: false };
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const newToken = response.data.token;
      await SecureStore.setItemAsync('authToken', newToken);

      return { success: true, token: newToken };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: AxiosError): void {
    if (error.response?.status === 401) {
      this.handleAuthError();
    } else if (!error.response) {
      // Network error
      this.isOnline = false;
      showMessage({
        message: 'Connection Error',
        description: 'Please check your internet connection',
        type: 'warning',
      });
    } else {
      const message = error.response?.data?.message || 'An error occurred';
      showMessage({
        message: 'Error',
        description: message,
        type: 'danger',
      });
    }
  }

  /**
   * Handle authentication errors
   */
  private async handleAuthError(): Promise<void> {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('refreshToken');
    showMessage({
      message: 'Session Expired',
      description: 'Please login again',
      type: 'danger',
    });
  }

  /**
   * Set online status
   */
  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    if (isOnline) {
      this.processOfflineQueue();
    }
  }

  /**
   * Process queued offline requests
   */
  private async processOfflineQueue(): Promise<void> {
    while (this.offlineQueue.length > 0) {
      const request = this.offlineQueue.shift();
      try {
        const response = await this.api(request.config);
        if (request.config._offlineResolve) {
          request.config._offlineResolve(response);
        }
      } catch (error) {
        if (request.config._offlineReject) {
          request.config._offlineReject(error);
        }
      }
    }
  }
}

export default new ApiService();
