/**
 * Performance Profiler
 * Advanced performance analysis and optimization tool
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';

interface PerformanceMetric {
  name: string;
  duration: number;
  memory: number;
  cpu: number;
  timestamp: number;
}

interface PerformanceReport {
  summary: {
    totalDuration: number;
    averageMemory: number;
    peakMemory: number;
    averageCPU: number;
    peakCPU: number;
  };
  metrics: PerformanceMetric[];
  recommendations: string[];
}

class PerformanceProfiler {
  private metrics: PerformanceMetric[] = [];
  private startTime: number = 0;
  private startMemory: number = 0;

  constructor() {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  /**
   * Start profiling a specific operation
   */
  startProfile(name: string): () => void {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    const startCPU = process.cpuUsage();

    return () => {
      const duration = Date.now() - startTime;
      const memory = process.memoryUsage().heapUsed - startMemory;
      const cpuUsage = process.cpuUsage(startCPU);
      const cpu = (cpuUsage.user + cpuUsage.system) / 1000; // Convert to ms

      this.metrics.push({
        name,
        duration,
        memory,
        cpu,
        timestamp: Date.now(),
      });
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        summary: {
          totalDuration: 0,
          averageMemory: 0,
          peakMemory: 0,
          averageCPU: 0,
          peakCPU: 0,
        },
        metrics: [],
        recommendations: ['No metrics collected yet'],
      };
    }

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageMemory = this.metrics.reduce((sum, m) => sum + m.memory, 0) / this.metrics.length;
    const peakMemory = Math.max(...this.metrics.map(m => m.memory));
    const averageCPU = this.metrics.reduce((sum, m) => sum + m.cpu, 0) / this.metrics.length;
    const peakCPU = Math.max(...this.metrics.map(m => m.cpu));

    const recommendations = this.generateRecommendations({
      totalDuration,
      averageMemory,
      peakMemory,
      averageCPU,
      peakCPU,
    });

    return {
      summary: {
        totalDuration,
        averageMemory,
        peakMemory,
        averageCPU,
        peakCPU,
      },
      metrics: this.metrics,
      recommendations,
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(summary: PerformanceReport['summary']): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    if (summary.peakMemory > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push(
        '🔴 High memory usage detected. Consider implementing memory pooling or stream processing.'
      );
    } else if (summary.peakMemory > 50 * 1024 * 1024) {
      // 50MB
      recommendations.push('🟡 Moderate memory usage. Monitor for potential memory leaks.');
    }

    // CPU recommendations
    if (summary.averageCPU > 1000) {
      // 1 second
      recommendations.push(
        '🔴 High CPU usage detected. Consider async operations or worker threads.'
      );
    } else if (summary.averageCPU > 500) {
      // 500ms
      recommendations.push('🟡 Moderate CPU usage. Profile critical paths for optimization.');
    }

    // Duration recommendations
    const slowOperations = this.metrics.filter(m => m.duration > 1000);
    if (slowOperations.length > 0) {
      recommendations.push(
        `🔴 ${slowOperations.length} operations took >1s. Consider caching or optimization.`
      );
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ Performance is within acceptable limits. Good job!');
    } else {
      recommendations.push('💡 Run `npm run optimize` to apply automatic optimizations.');
    }

    return recommendations;
  }

  /**
   * Display report in console
   */
  displayReport(): void {
    const report = this.generateReport();

    console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║                                                        ║'));
    console.log(chalk.cyan('║        📊 PERFORMANCE PROFILING REPORT                ║'));
    console.log(chalk.cyan('║                                                        ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════╝\n'));

    // Summary
    console.log(chalk.bold.yellow('📈 Summary:\n'));
    console.log(chalk.gray('━'.repeat(60)));
    console.log(
      chalk.white(
        `  Total Duration:   ${chalk.cyan(this.formatDuration(report.summary.totalDuration))}`
      )
    );
    console.log(
      chalk.white(
        `  Average Memory:   ${chalk.cyan(this.formatMemory(report.summary.averageMemory))}`
      )
    );
    console.log(
      chalk.white(`  Peak Memory:      ${chalk.cyan(this.formatMemory(report.summary.peakMemory))}`)
    );
    console.log(
      chalk.white(
        `  Average CPU:      ${chalk.cyan(this.formatDuration(report.summary.averageCPU))}`
      )
    );
    console.log(
      chalk.white(`  Peak CPU:         ${chalk.cyan(this.formatDuration(report.summary.peakCPU))}`)
    );
    console.log(chalk.gray('━'.repeat(60)) + '\n');

    // Detailed metrics table
    if (report.metrics.length > 0) {
      console.log(chalk.bold.yellow('📋 Detailed Metrics:\n'));

      const table = new Table({
        head: ['Operation', 'Duration', 'Memory', 'CPU'].map(h => chalk.cyan(h)),
        colWidths: [30, 15, 15, 15],
      });

      // Sort by duration (slowest first)
      const sortedMetrics = [...report.metrics].sort((a, b) => b.duration - a.duration);

      sortedMetrics.forEach(metric => {
        const durationColor =
          metric.duration > 1000 ? chalk.red : metric.duration > 500 ? chalk.yellow : chalk.green;
        const memoryColor = metric.memory > 10 * 1024 * 1024 ? chalk.red : chalk.white;

        table.push([
          metric.name,
          durationColor(this.formatDuration(metric.duration)),
          memoryColor(this.formatMemory(metric.memory)),
          this.formatDuration(metric.cpu),
        ]);
      });

      console.log(table.toString() + '\n');
    }

    // Recommendations
    console.log(chalk.bold.yellow('💡 Recommendations:\n'));
    report.recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });
    console.log();

    // Performance score
    const score = this.calculatePerformanceScore(report);
    const scoreColor = score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red;
    console.log(chalk.bold('\n🎯 Performance Score: ') + scoreColor.bold(`${score}/100\n`));
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(report: PerformanceReport): number {
    let score = 100;

    // Memory penalties
    if (report.summary.peakMemory > 100 * 1024 * 1024) score -= 30;
    else if (report.summary.peakMemory > 50 * 1024 * 1024) score -= 15;

    // CPU penalties
    if (report.summary.averageCPU > 1000) score -= 20;
    else if (report.summary.averageCPU > 500) score -= 10;

    // Duration penalties
    const slowOps = this.metrics.filter(m => m.duration > 1000).length;
    score -= slowOps * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Save report to file
   */
  saveReport(filename: string = 'performance-report.json'): void {
    const report = this.generateReport();
    const reportsDir = path.join(process.cwd(), 'performance-reports');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = path.join(reportsDir, `${timestamp}-${filename}`);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`\n✅ Report saved to: ${filepath}\n`));
  }

  /**
   * Export metrics to CSV
   */
  exportToCSV(filename: string = 'performance-metrics.csv'): void {
    const reportsDir = path.join(process.cwd(), 'performance-reports');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = path.join(reportsDir, `${timestamp}-${filename}`);

    const headers = 'Operation,Duration (ms),Memory (bytes),CPU (ms),Timestamp\n';
    const rows = this.metrics
      .map(m => `"${m.name}",${m.duration},${m.memory},${m.cpu},${m.timestamp}`)
      .join('\n');

    fs.writeFileSync(filepath, headers + rows);
    console.log(chalk.green(`\n✅ CSV exported to: ${filepath}\n`));
  }

  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Format memory for display
   */
  private formatMemory(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  }

  /**
   * Compare two performance reports
   */
  static compareReports(report1: PerformanceReport, report2: PerformanceReport): void {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║                                                        ║'));
    console.log(chalk.cyan('║        📊 PERFORMANCE COMPARISON REPORT               ║'));
    console.log(chalk.cyan('║                                                        ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════╝\n'));

    const table = new Table({
      head: ['Metric', 'Before', 'After', 'Change'].map(h => chalk.cyan(h)),
      colWidths: [20, 15, 15, 20],
    });

    const comparisons = [
      {
        name: 'Total Duration',
        before: report1.summary.totalDuration,
        after: report2.summary.totalDuration,
        format: (v: number) => `${v.toFixed(2)}ms`,
      },
      {
        name: 'Peak Memory',
        before: report1.summary.peakMemory,
        after: report2.summary.peakMemory,
        format: (v: number) => `${(v / (1024 * 1024)).toFixed(2)}MB`,
      },
      {
        name: 'Average CPU',
        before: report1.summary.averageCPU,
        after: report2.summary.averageCPU,
        format: (v: number) => `${v.toFixed(2)}ms`,
      },
    ];

    comparisons.forEach(comp => {
      const change = ((comp.after - comp.before) / comp.before) * 100;
      const changeStr = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
      const changeColor = change > 0 ? chalk.red : chalk.green;

      table.push([
        comp.name,
        comp.format(comp.before),
        comp.format(comp.after),
        changeColor(changeStr),
      ]);
    });

    console.log(table.toString() + '\n');
  }
}

// Example usage
if (require.main === module) {
  const profiler = new PerformanceProfiler();

  // Simulate some operations
  const operations = [
    'Database Query',
    'API Request',
    'Data Processing',
    'Cache Update',
    'File I/O',
  ];

  async function runDemo() {
    console.log(chalk.yellow('Running performance profiling demo...\n'));

    for (const op of operations) {
      const endProfile = profiler.startProfile(op);

      // Simulate work
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

      // Some memory allocation
      const data = new Array(Math.floor(Math.random() * 10000)).fill('x');

      endProfile();
    }

    profiler.displayReport();
    profiler.saveReport();
    profiler.exportToCSV();
  }

  runDemo().catch(console.error);
}

export default PerformanceProfiler;
export { PerformanceMetric, PerformanceReport };
