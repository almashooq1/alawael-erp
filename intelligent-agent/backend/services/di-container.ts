/**
 * ============================================
 * DEPENDENCY INJECTION CONTAINER
 * نظام حقن الاعتماديات
 * ============================================
 * 
 * Manages service dependencies and lifetimes
 * Supports: Singleton, Transient patterns
 * Used for: Testing, production configuration
 */

import { Logger } from './advanced.logger';
import { ErrorTracker } from './error.tracker';
import { PerformanceMonitor } from './performance.monitor';

/**
 * Service Registration Options
 */
export interface ServiceRegistration {
  singleton?: boolean;
  factory?: () => any;
  instance?: any;
}

/**
 * Dependency Injection Container
 */
export class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, ServiceRegistration> = new Map();
  private instances: Map<string, any> = new Map();
  private mockMode: boolean = false;

  /**
   * Get singleton instance
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Register a service
   */
  register(name: string, registration: ServiceRegistration): void {
    this.services.set(name, registration);
  }

  /**
   * Register a singleton service
   */
  registerSingleton(name: string, factory: () => any): void {
    this.register(name, { singleton: true, factory });
  }

  /**
   * Register a transient service
   */
  registerTransient(name: string, factory: () => any): void {
    this.register(name, { singleton: false, factory });
  }

  /**
   * Register an instance
   */
  registerInstance(name: string, instance: any): void {
    this.register(name, { instance, singleton: true });
  }

  /**
   * Resolve a service
   */
  resolve<T = any>(name: string): T {
    const registration = this.services.get(name);

    if (!registration) {
      throw new Error(`Service '${name}' not registered in DI container`);
    }

    // Return instance if already created
    if (registration.instance) {
      return registration.instance as T;
    }

    // Check singleton cache
    if (registration.singleton && this.instances.has(name)) {
      return this.instances.get(name) as T;
    }

    // Create new instance
    if (registration.factory) {
      const instance = registration.factory();

      // Cache if singleton
      if (registration.singleton) {
        this.instances.set(name, instance);
      }

      return instance as T;
    }

    throw new Error(`Service '${name}' has no factory or instance`);
  }

  /**
   * Set mock mode (for testing)
   */
  setMockMode(enabled: boolean): void {
    this.mockMode = enabled;
  }

  /**
   * Check if in mock mode
   */
  isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Clear all services and instances
   */
  clear(): void {
    this.services.clear();
    this.instances.clear();
    this.mockMode = false;
  }

  /**
   * Get registered service names (for debugging)
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}

/**
 * Default Service Registration
 */
export function registerDefaultServices(container: DIContainer): void {
  // Register core utilities
  container.registerSingleton('logger', () => require('./advanced.logger').globalLogger);
  container.registerSingleton('errorTracker', () => require('./error.tracker').globalErrorTracker);
  container.registerSingleton('performanceMonitor', () => require('./performance.monitor').performanceMonitor);

  // Services will be registered here after refactoring
  // RegisterEmployeeService(container);
  // RegisterEmployeeAIService(container);
  // RegisterEmployeeReportsService(container);
}

/**
 * Get Default Container Instance (Singleton)
 */
export const diContainer = DIContainer.getInstance();

// Register default services on initialization
registerDefaultServices(diContainer);

export default diContainer;
