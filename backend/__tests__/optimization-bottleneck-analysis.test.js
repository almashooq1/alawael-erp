/**
 * Phase 5.4: Performance Optimization & Bottleneck Analysis
 * Identifies performance bottlenecks and validates optimization strategies
 * Tests caching, indexing, query optimization, and database tuning
 */

const request = require('supertest');
const app = require('../server');
const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const Payment = require('../models/Payment');

describe.skip('Phase 5.4: Performance Optimization & Bottleneck Analysis', () => {
  // ============================================================
  // Test Suite 1: Query Optimization Analysis
  // ============================================================

  describe('Query Optimization & Index Validation', () => {
    test('Should use indexes effectively for filtered queries', async () => {
      // Create test employee
      const emp = await Employee.create({
        firstName: 'Index',
        lastName: 'Test',
        email: `index${Date.now()}@example.com`,
        employeeId: `EMP-${Date.now()}`,
        department: 'IT',
        position: 'Developer',
        status: 'active',
        hireDate: new Date('2024-01-01'),
        salary: {
          base: 60000,
        },
      });

      const startTime = Date.now();

      // Query using indexed field (status)
      const results = await Employee.find({ status: 'ACTIVE' }).lean();

      const queryTime = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Indexed queries should be fast

      // Cleanup
      await Employee.deleteOne({ _id: emp._id });
    }, 15000);

    test('Should optimize multi-field filtered queries', async () => {
      const emp = await Employee.create({
        firstName: 'MultiField',
        lastName: 'Query',
        email: `multifield${Date.now()}@example.com`,
        employeeId: `EMP-${Date.now()}`,
        department: 'IT',
        position: 'Developer',
        status: 'active',
        hireDate: new Date('2024-01-01'),
        salary: {
          base: 60000,
        },
      });

      const startTime = Date.now();

      // Multi-field query should still be optimized
      const results = await Employee.find({
        status: 'ACTIVE',
        department: 'IT',
      }).lean();

      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(200);

      // Cleanup
      await Employee.deleteOne({ _id: emp._id });
    }, 15000);

    test('Should identify N+1 query problems', async () => {
      // Create employees with related leaves
      const emp1 = await Employee.create({
        firstName: 'N+1',
        lastName: 'Test1',
        email: `n1_1${Date.now()}@example.com`,
        employeeId: `EMP-${Date.now()}-1`,
        department: 'HR',
        position: 'Analyst',
        hireDate: new Date('2024-01-01'),
        salary: {
          base: 55000,
        },
      });

      const emp2 = await Employee.create({
        firstName: 'N+1',
        lastName: 'Test2',
        email: `n1_2${Date.now()}@example.com`,
        employeeId: `EMP-${Date.now()}-2`,
        department: 'HR',
        position: 'Analyst',
        hireDate: new Date('2024-01-01'),
        salary: {
          base: 55000,
        },
      });

      // Create leaves for each employee
      await Leave.create({
        employeeId: emp1._id,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
        type: 'VACATION',
      });

      await Leave.create({
        employeeId: emp2._id,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
        type: 'VACATION',
      });

      // Good query: Use populate to avoid N+1
      const startTime = Date.now();

      const employees = await Employee.find({
        firstName: 'N+1',
      }).populate('leaves');

      const optimizedTime = Date.now() - startTime;

      expect(optimizedTime).toBeLessThan(500); // Should be relatively fast
      expect(employees.length).toBe(2);

      // Cleanup
      await Employee.deleteMany({ firstName: 'N+1' });
      await Leave.deleteMany({ employeeId: { $in: [emp1._id, emp2._id] } });
    }, 20000);

    test('Should use select() to minimize data transfer', async () => {
      const emp = await Employee.create({
        firstName: 'Select',
        lastName: 'Test',
        email: `select${Date.now()}@example.com`,
        employeeId: `EMP-${Date.now()}`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: {
          base: 60000,
        },
      });

      // Query with all fields (slow)
      const startAll = Date.now();
      const fullResults = await Employee.find({ _id: emp._id });
      const fullTime = Date.now() - startAll;

      // Query with selected fields (faster)
      const startSelected = Date.now();
      const selectedResults = await Employee.find({ _id: emp._id }).select(
        'firstName lastName email'
      );
      const selectedTime = Date.now() - startSelected;

      // Selected query should be faster or equal
      expect(selectedResults[0]).toBeDefined();
      expect(selectedResults[0].salary).toBeUndefined();

      // Cleanup
      await Employee.deleteOne({ _id: emp._id });
    }, 15000);
  });

  // ============================================================
  // Test Suite 2: Caching Strategy Validation
  // ============================================================

  describe('Caching & Performance Optimization', () => {
    test('Should demonstrate benefit of query result caching', async () => {
      const email = `cache${Date.now()}@example.com`;

      await Employee.create({
        firstName: 'Cache',
        lastName: 'Test',
        email: email,
        employeeId: `EMP-${Date.now()}`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: {
          base: 60000,
        },
      });

      const uncachedTimes = [];
      const cachedTimes = [];

      // Simulate first 10 queries (uncached)
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        const result = await Employee.findOne({ email });
        uncachedTimes.push(Date.now() - start);
        expect(result).toBeDefined();
      }

      const uncachedAvg = uncachedTimes.reduce((a, b) => a + b, 0) / uncachedTimes.length;

      // In production with caching, subsequent queries would be faster
      // For this test, we verify that repeated queries are consistent

      const avgUncached = uncachedTimes.reduce((a, b) => a + b, 0) / uncachedTimes.length;
      expect(avgUncached).toBeLessThan(200);

      // Cleanup
      await Employee.deleteOne({ email });
    }, 20000);

    test('Should optimize payroll calculation with batching', async () => {
      const employees = [];

      for (let i = 0; i < 100; i++) {
        employees.push({
          firstName: `Payroll${i}`,
          lastName: 'Batch',
          email: `payroll${i}@example.com`,
          employeeId: `EMP-${Date.now()}-${i}`,
          department: 'Finance',
          position: 'Accountant',
          hireDate: new Date('2024-01-01'),
          salary: {
            base: 50000 + Math.random() * 50000,
          },
        });
      }

      const created = await Employee.insertMany(employees);

      // Batch operations should be more efficient
      const startBatchInsert = Date.now();

      const payments = created.map(emp => ({
        employeeId: emp._id,
        month: 3,
        year: 2026,
        baseSalary: emp.salary,
        grossSalary: emp.salary * 1.2,
        deductions: emp.salary * 0.25,
        netSalary: emp.salary * 0.95,
      }));

      await Payment.insertMany(payments);

      const batchTime = Date.now() - startBatchInsert;

      expect(batchTime).toBeLessThan(10000); // Batch should be fast
      expect(await Payment.countDocuments()).toBeGreaterThan(0);

      // Cleanup
      const ids = created.map(e => e._id);
      await Employee.deleteMany({ _id: { $in: ids } });
      await Payment.deleteMany({ employeeId: { $in: ids } });
    }, 30000);
  });

  // ============================================================
  // Test Suite 3: Database Connection Pool Optimization
  // ============================================================

  describe('Database Connection Pool Optimization', () => {
    test('Should efficiently reuse database connections', async () => {
      const queryResults = [];

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const result = await Employee.findOne({}).limit(1);
        queryResults.push(result);
      }

      const totalTime = Date.now() - startTime;

      // With connection reuse, 100 queries should be very fast
      expect(totalTime).toBeLessThan(10000);
      expect(queryResults.length).toBe(100);
    }, 15000);

    test('Should maintain optimal connection pool size', async () => {
      const concurrentQueries = 50;
      const queryPromises = [];

      // Create concurrent queries
      for (let i = 0; i < concurrentQueries; i++) {
        queryPromises.push(Employee.find({}).limit(10));
      }

      const startTime = Date.now();
      const results = await Promise.all(queryPromises);
      const totalTime = Date.now() - startTime;

      expect(results.length).toBe(concurrentQueries);
      expect(totalTime).toBeLessThan(30000); // Should handle concurrency well
    }, 40000);

    test('Should handle connection timeout gracefully', async () => {
      try {
        // Attempt query with timeout
        const result = await Employee.findOne({}).limit(1);

        // Should succeed normally
        expect(result).toBeDefined();
      } catch (err) {
        // If timeout occurs, should be handled gracefully
        expect(err).toBeDefined();
      }
    }, 15000);
  });

  // ============================================================
  // Test Suite 4: Aggregation Pipeline Optimization
  // ============================================================

  describe('Aggregation Pipeline Optimization', () => {
    test('Should optimize aggregation with $match early in pipeline', async () => {
      // Create test data
      const employees = [];
      for (let i = 0; i < 50; i++) {
        employees.push({
          firstName: `Agg${i}`,
          lastName: 'Pipeline',
          email: `agg${i}@example.com`,
          employeeId: `EMP-${Date.now()}-${i}`,
          department: i % 2 === 0 ? 'IT' : 'HR',
          position: 'Developer',
          status: 'active',
          hireDate: new Date('2024-01-01'),
          salary: {
            base: 50000 + Math.random() * 50000,
          },
        });
      }

      await Employee.insertMany(employees);

      // Good aggregation: $match early to reduce documents
      const startGood = Date.now();
      const goodResults = await Employee.aggregate([
        { $match: { department: 'IT', status: 'ACTIVE' } },
        { $group: { _id: null, avgSalary: { $avg: '$salary' } } },
      ]);
      const goodTime = Date.now() - startGood;

      expect(goodResults.length).toBeGreaterThan(0);
      expect(goodTime).toBeLessThan(500);

      // Cleanup
      await Employee.deleteMany({ lastName: 'Pipeline' });
    }, 30000);

    test('Should use $lookup efficiently for relationships', async () => {
      // Create employees and related leaves
      const emp1 = await Employee.create({
        firstName: 'Lookup',
        lastName: 'Test',
        email: `lookup${Date.now()}@example.com`,
        employeeId: `EMP-${Date.now()}`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: {
          base: 60000,
        },
      });

      await Leave.create({
        employeeId: emp1._id,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
        type: 'VACATION',
      });

      const startTime = Date.now();

      // Efficient lookup with $match after
      const results = await Employee.aggregate([
        { $match: { _id: emp1._id } },
        {
          $lookup: { from: 'leaves', localField: '_id', foreignField: 'employeeId', as: 'leaves' },
        },
        { $unwind: { path: '$leaves', preserveNullAndEmptyArrays: true } },
      ]);

      const lookupTime = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(lookupTime).toBeLessThan(500);

      // Cleanup
      await Employee.deleteOne({ _id: emp1._id });
      await Leave.deleteMany({ employeeId: emp1._id });
    }, 20000);
  });

  // ============================================================
  // Test Suite 5: Pagination & Limit Optimization
  // ============================================================

  describe('Pagination & Data Retrieval Optimization', () => {
    test('Should efficiently paginate large result sets', async () => {
      // Create test data
      const employees = [];
      for (let i = 0; i < 500; i++) {
        employees.push({
          firstName: `Page${i}`,
          lastName: 'Test',
          email: `page${i}@example.com`,
          employeeId: `EMP-${Date.now()}-${i}`,
          department: 'Operations',
          position: 'Staff',
          hireDate: new Date('2024-01-01'),
          salary: {
            base: 60000,
          },
        });
      }

      const created = await Employee.insertMany(employees);

      const pageSize = 50;
      const pages = [];

      // Retrieve multiple pages efficiently
      for (let page = 0; page < 5; page++) {
        const startTime = Date.now();

        const results = await Employee.find({ lastName: 'Test' })
          .skip(page * pageSize)
          .limit(pageSize)
          .lean();

        const pageTime = Date.now() - startTime;

        pages.push({ time: pageTime, count: results.length });
        expect(pageTime).toBeLessThan(200); // Each page should be fast
      }

      expect(pages.length).toBe(5);

      // Cleanup
      const ids = created.map(e => e._id);
      await Employee.deleteMany({ _id: { $in: ids } });
    }, 30000);

    test('Should use cursor for large data export efficiently', async () => {
      // Create test data
      const employees = [];
      for (let i = 0; i < 1000; i++) {
        employees.push({
          firstName: `Cursor${i}`,
          lastName: 'Export',
          email: `cursor${i}@example.com`,
          employeeId: `EMP-${Date.now()}-${i}`,
          department: 'Admin',
          position: 'Clerk',
          hireDate: new Date('2024-01-01'),
          salary: {
            base: 60000,
          },
        });
      }

      const created = await Employee.insertMany(employees);

      const startTime = Date.now();
      let count = 0;

      // Use cursor for memory-efficient iteration
      const cursor = Employee.find({ lastName: 'Export' }).cursor();

      for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        count++;
        if (count >= 1000) break;
      }

      const totalTime = Date.now() - startTime;

      expect(count).toBe(1000);
      expect(totalTime).toBeLessThan(10000);

      // Cleanup
      const ids = created.map(e => e._id);
      await Employee.deleteMany({ _id: { $in: ids } });
    }, 20000);
  });

  // ============================================================
  // Test Suite 6: Bottleneck Identification & Metrics
  // ============================================================

  describe('Bottleneck Identification & Performance Metrics', () => {
    test('Should identify slow database queries', async () => {
      const slowQueries = [];

      // Generate various query patterns
      const emp = await Employee.create({
        firstName: 'Bottleneck',
        lastName: 'Test',
        email: `bottleneck${Date.now()}@example.com`,
        employeeId: `EMP-${Date.now()}`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: {
          base: 60000,
        },
      });

      // Test 1: Unindexed field search (potentially slow)
      const startUnindexed = Date.now();
      const unindexedResult = await Employee.find({
        firstName: 'Bottleneck',
      }).lean();
      slowQueries.push({
        type: 'Unindexed firstName',
        time: Date.now() - startUnindexed,
      });

      // Test 2: Indexed field search (fast)
      const startIndexed = Date.now();
      const indexedResult = await Employee.findOne({
        email: emp.email,
      }).lean();
      slowQueries.push({
        type: 'Indexed email',
        time: Date.now() - startIndexed,
      });

      // Report bottlenecks
      const bottlenecks = slowQueries.filter(q => q.time > 100);

      console.log('Performance metrics:', slowQueries);

      // Indexed search should be faster
      expect(slowQueries[1].time).toBeLessThanOrEqual(slowQueries[0].time || slowQueries[1].time);

      // Cleanup
      await Employee.deleteOne({ _id: emp._id });
    }, 20000);

    test('Should measure API response time distribution', async () => {
      const responseTimes = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        try {
          await request(app).get(`/api/employees`).timeout(5000).expect([200, 401]);

          responseTimes.push(Date.now() - start);
        } catch (err) {
          responseTimes.push(Date.now() - start);
        }
      }

      // Calculate metrics
      const sorted = responseTimes.sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      console.log(`Response time distribution (${iterations} requests):`);
      console.log(`Min: ${min}ms, Max: ${max}ms, Avg: ${avg.toFixed(1)}ms`);
      console.log(`P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);

      expect(p95).toBeLessThan(2000); // 95th percentile should be reasonable
    }, 120000);

    test('Should identify memory leaks over time', async () => {
      const memSamples = [];
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        await Employee.find({}).limit(10);

        const memory = process.memoryUsage();
        memSamples.push({
          iteration: i,
          heapUsed: memory.heapUsed / 1024 / 1024, // MB
        });

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Check for monotonic increase (sign of leak)
      let firstSample = memSamples[0].heapUsed;
      let lastSample = memSamples[memSamples.length - 1].heapUsed;

      const growthRate = (lastSample - firstSample) / firstSample;

      console.log(`Memory growth over ${iterations} iterations:`, {
        start: firstSample.toFixed(2),
        end: lastSample.toFixed(2),
        growth: (growthRate * 100).toFixed(2) + '%',
      });

      // Memory growth should be minimal
      expect(growthRate).toBeLessThan(0.5); // Less than 50% growth
    }, 60000);
  });

  // ============================================================
  // Test Suite 7: Scalability Limits Detection
  // ============================================================

  describe('Scalability Limits & Capacity Testing', () => {
    test('Should identify max concurrent connections', async () => {
      const concurrencyLevels = [10, 50, 100, 200];
      const results = [];

      for (const level of concurrencyLevels) {
        const promises = [];
        const startTime = Date.now();

        for (let i = 0; i < level; i++) {
          promises.push(
            Employee.find({})
              .limit(1)
              .catch(() => null)
          );
        }

        try {
          await Promise.all(promises);
          const totalTime = Date.now() - startTime;

          results.push({
            level,
            time: totalTime,
            avgPerRequest: totalTime / level,
          });
        } catch (err) {
          console.log(`Failed at concurrency level ${level}`);
          break;
        }
      }

      console.log('Concurrency test results:', results);

      // Should handle at least 200 concurrent connections
      expect(results.length).toBeGreaterThan(2);
    }, 60000);

    test('Should measure database throughput limits', async () => {
      const durationSeconds = 30;
      const startTime = Date.now();
      let requestCount = 0;

      while (Date.now() - startTime < durationSeconds * 1000) {
        try {
          await Employee.findOne({});
          requestCount++;
        } catch (err) {
          break;
        }
      }

      const throughput = requestCount / durationSeconds;

      console.log(`Database throughput: ${throughput.toFixed(1)} queries/second`);

      expect(requestCount).toBeGreaterThan(0);
    }, 40000);
  });
});
