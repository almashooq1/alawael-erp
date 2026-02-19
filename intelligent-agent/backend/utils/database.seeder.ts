/**
 * ============================================
 * DATABASE SEEDING UTILITY
 * أداة بذر قاعدة البيانات
 * ============================================
 */

import mongoose, { Model } from 'mongoose';
import { globalLogger } from './advanced.logger';

interface SeedData {
  collection: string;
  data: any[];
  model: Model<any>;
}

interface SeedOptions {
  clean?: boolean;
  verbose?: boolean;
  stopOnError?: boolean;
}

class DatabaseSeeder {
  private seedData: Map<string, SeedData> = new Map();

  /**
   * Register seed data
   */
  registerSeedData(collection: string, data: any[], model: Model<any>): void {
    this.seedData.set(collection, { collection, data, model });
    globalLogger.info(`Seed data registered for ${collection}`, 'DatabaseSeeder', {
      count: data.length,
    });
  }

  /**
   * Run seeding
   */
  async seed(
    options: SeedOptions = {}
  ): Promise<{ successful: string[]; failed: Array<{ collection: string; error: string }> }> {
    const { clean = false, verbose = true, stopOnError = false } = options;

    const successful: string[] = [];
    const failed: Array<{ collection: string; error: string }> = [];

    try {
      // Clean collections if requested
      if (clean) {
        for (const [collection, seedData] of this.seedData) {
          try {
            if (verbose) {
              globalLogger.info(`Cleaning collection: ${collection}`, 'DatabaseSeeder');
            }
            await seedData.model.deleteMany({});
          } catch (error) {
            globalLogger.warn(
              `Failed to clean collection ${collection}`,
              'DatabaseSeeder',
              error as Error
            );
          }
        }
      }

      // Seed data
      for (const [collection, seedData] of this.seedData) {
        try {
          if (verbose) {
            globalLogger.info(`Seeding collection: ${collection}`, 'DatabaseSeeder', {
              count: seedData.data.length,
            });
          }

          const result = await seedData.model.insertMany(seedData.data, { ordered: false });

          if (verbose) {
            globalLogger.info(`Successfully seeded ${collection}`, 'DatabaseSeeder', {
              count: result.length,
            });
          }

          successful.push(collection);
        } catch (error) {
          const errorMsg = (error as Error).message;

          failed.push({
            collection,
            error: errorMsg,
          });

          globalLogger.error(`Failed to seed ${collection}`, 'DatabaseSeeder', error as Error);

          if (stopOnError) {
            throw error;
          }
        }
      }

      globalLogger.info(
        `Seeding completed: ${successful.length} successful, ${failed.length} failed`,
        'DatabaseSeeder'
      );

      return { successful, failed };
    } catch (error) {
      globalLogger.error('Seeding failed', 'DatabaseSeeder', error as Error);
      throw error;
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<string[]> {
    const cleared: string[] = [];

    try {
      for (const [collection, seedData] of this.seedData) {
        try {
          await seedData.model.deleteMany({});
          cleared.push(collection);
          globalLogger.info(`Cleared collection: ${collection}`, 'DatabaseSeeder');
        } catch (error) {
          globalLogger.error(
            `Failed to clear collection ${collection}`,
            'DatabaseSeeder',
            error as Error
          );
        }
      }

      return cleared;
    } catch (error) {
      globalLogger.error('Failed to clear all collections', 'DatabaseSeeder', error as Error);
      throw error;
    }
  }

  /**
   * Get seed statistics
   */
  getStatistics(): { collection: string; count: number }[] {
    return Array.from(this.seedData.values()).map(seed => ({
      collection: seed.collection,
      count: seed.data.length,
    }));
  }
}

export const databaseSeeder = new DatabaseSeeder();

/**
 * Sample Employee Seed Data
 */
export const EMPLOYEE_SEED_DATA = [
  {
    firstName: 'Ahmed',
    lastName: 'Hassan',
    email: 'ahmed.hassan@company.com',
    phone: '+966512345678',
    department: 'IT',
    position: 'Senior Developer',
    jobTitle: 'Senior Software Engineer',
    reportingManager: 'manager001',
    employmentType: 'Full-time',
    hireDate: new Date('2021-01-15'),
    nationality: 'Saudi',
    gender: 'Male',
    salary: 150000,
    performanceRating: 4.5,
    status: 'Active',
    employmentStatus: 'Confirmed',
  },
  {
    firstName: 'Fatima',
    lastName: 'Ahmed',
    email: 'fatima.ahmed@company.com',
    phone: '+966512345679',
    department: 'HR',
    position: 'HR Manager',
    jobTitle: 'Human Resources Manager',
    reportingManager: 'director001',
    employmentType: 'Full-time',
    hireDate: new Date('2020-06-01'),
    nationality: 'Saudi',
    gender: 'Female',
    salary: 120000,
    performanceRating: 4.2,
    status: 'Active',
    employmentStatus: 'Confirmed',
  },
  {
    firstName: 'Muhammad',
    lastName: 'Ali',
    email: 'muhammad.ali@company.com',
    phone: '+966512345680',
    department: 'Finance',
    position: 'Finance Manager',
    jobTitle: 'Finance Manager',
    reportingManager: 'cfo001',
    employmentType: 'Full-time',
    hireDate: new Date('2019-03-15'),
    nationality: 'Saudi',
    gender: 'Male',
    salary: 135000,
    performanceRating: 4.1,
    status: 'Active',
    employmentStatus: 'Senior',
  },
  {
    firstName: 'Layla',
    lastName: 'Mohammed',
    email: 'layla.mohammed@company.com',
    phone: '+966512345681',
    department: 'Sales',
    position: 'Sales Executive',
    jobTitle: 'Sales Executive',
    reportingManager: 'sales-director',
    employmentType: 'Full-time',
    hireDate: new Date('2022-01-10'),
    nationality: 'Saudi',
    gender: 'Female',
    salary: 95000,
    performanceRating: 3.8,
    status: 'Active',
    employmentStatus: 'Confirmed',
  },
  {
    firstName: 'Khalid',
    lastName: 'Omar',
    email: 'khalid.omar@company.com',
    phone: '+966512345682',
    department: 'IT',
    position: 'Junior Developer',
    jobTitle: 'Junior Software Engineer',
    reportingManager: 'ahmed.hassan@company.com',
    employmentType: 'Full-time',
    hireDate: new Date('2023-06-01'),
    nationality: 'Saudi',
    gender: 'Male',
    salary: 65000,
    performanceRating: 3.2,
    status: 'Active',
    employmentStatus: 'Probation',
  },
];

/**
 * Utility function to create sample employee data
 */
export function generateSampleEmployees(count: number): any[] {
  const departments = ['IT', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations'];
  const positions = ['Junior', 'Senior', 'Manager', 'Director', 'Coordinator'];
  const types = ['Full-time', 'Part-time', 'Contract'];
  const statuses = ['Active', 'Inactive', 'On-Leave'];
  const employmentStatuses = ['Probation', 'Confirmed', 'Senior'];

  const employees = [];

  for (let i = 0; i < count; i++) {
    employees.push({
      firstName: `Employee${i}`,
      lastName: `Test${i}`,
      email: `employee${i}@company.com`,
      phone: `+966${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      position: positions[Math.floor(Math.random() * positions.length)],
      jobTitle: `Position ${i}`,
      reportingManager: `manager${Math.floor(Math.random() * 5)}`,
      employmentType: types[Math.floor(Math.random() * types.length)],
      hireDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 5),
      nationality: 'Saudi',
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      salary: Math.floor(Math.random() * 200000 + 50000),
      performanceRating: Math.floor(Math.random() * 5 * 10) / 10,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      employmentStatus: employmentStatuses[Math.floor(Math.random() * employmentStatuses.length)],
    });
  }

  return employees;
}
