/**
 * ============================================
 * DEPENDENCY INJECTION CONTAINER
 * حاوية حقن الاعتماديات
 * ============================================
 * 
 * Provides a simple DI container for managing service dependencies
 * Supports both production and test configurations
 */

type ServiceFactory<T> = () => T;

interface ServiceRegistration<T> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

export class DIContainer {
  private services = new Map<string, ServiceRegistration<any>>();

  /**
   * Register a service in the container
   */
  register<T>(
    key: string,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {}
  ): void {
    const { singleton = true } = options;
    this.services.set(key, { factory, singleton });
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(key: string): T {
    const registration = this.services.get(key);
    
    if (!registration) {
      throw new Error(`Service "${key}" not registered in DI container`);
    }

    // Return singleton instance if available
    if (registration.singleton && registration.instance) {
      return registration.instance;
    }

    // Create new instance
    const instance = registration.factory();

    // Cache singleton
    if (registration.singleton) {
      registration.instance = instance;
    }

    return instance;
  }

  /**
   * Register a service factory for testing (with mocks)
   */
  registerMock<T>(key: string, instance: T): void {
    this.services.set(key, {
      factory: () => instance,
      singleton: true,
      instance,
    });
  }

  /**
   * Clear all registered services
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }
}

// Global container instance
export const container = new DIContainer();

/**
 * Service Registry Keys
 */
export const SERVICES = {
  LOGGER: 'logger',
  ERROR_TRACKER: 'errorTracker',
  PERFORMANCE_MONITOR: 'performanceMonitor',
  EMPLOYEE_SERVICE: 'employeeService',
  EMPLOYEE_AI_SERVICE: 'employeeAiService',
  EMPLOYEE_REPORTS_SERVICE: 'employeeReportsService',
  DATABASE: 'database',
} as const;
