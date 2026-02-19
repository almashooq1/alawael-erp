/**
 * Auto Optimizer
 * Automatic code optimization and improvement tool
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';

interface OptimizationRule {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  description: string;
  severity: 'critical' | 'warning' | 'info';
}

interface OptimizationResult {
  file: string;
  rule: string;
  changes: number;
  description: string;
}

class AutoOptimizer {
  private rules: OptimizationRule[] = [
    // Remove console.logs in production
    {
      name: 'remove-console-logs',
      pattern: /console\.(log|debug|info)\([^)]*\);?\s*/g,
      replacement: '',
      description: 'Removed console.log statements',
      severity: 'warning',
    },

    // Optimize string concatenation
    {
      name: 'template-literals',
      pattern: /(['"])([^'"]*)\1\s*\+\s*([^+]+)\s*\+\s*(['"])([^'"]*)\4/g,
      replacement: match => {
        // Convert to template literal
        const parts = match.match(/(['"])([^'"]*)\1/g) || [];
        return `\`${parts.map(p => p.slice(1, -1)).join('${}')}\``;
      },
      description: 'Converted string concatenation to template literals',
      severity: 'info',
    },

    // Use const instead of let when not reassigned
    {
      name: 'prefer-const',
      pattern: /let\s+(\w+)\s*=\s*([^;]+);(?![\s\S]*?\1\s*=)/g,
      replacement: 'const $1 = $2;',
      description: 'Changed let to const for non-reassigned variables',
      severity: 'info',
    },

    // Remove unused imports
    {
      name: 'unused-imports',
      pattern: /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"];?\s*(?![\s\S]*\1)/g,
      replacement: '',
      description: 'Removed unused imports',
      severity: 'warning',
    },

    // Optimize array operations
    {
      name: 'array-includes',
      pattern: /\.indexOf\(([^)]+)\)\s*(!==|===)\s*-1/g,
      replacement: match => {
        const isNegative = match.includes('!==');
        return isNegative ? `.includes($1)` : `!.includes($1)`;
      },
      description: 'Replaced indexOf with includes',
      severity: 'info',
    },

    // Use arrow functions
    {
      name: 'arrow-functions',
      pattern: /function\s*\(([^)]*)\)\s*\{([^}]*)\}/g,
      replacement: '($1) => {$2}',
      description: 'Converted function expressions to arrow functions',
      severity: 'info',
    },

    // Remove trailing whitespace
    {
      name: 'trailing-whitespace',
      pattern: /[ \t]+$/gm,
      replacement: '',
      description: 'Removed trailing whitespace',
      severity: 'info',
    },

    // Consistent semicolons
    {
      name: 'add-semicolons',
      pattern: /(\w+|\))(\r?\n)/g,
      replacement: '$1;$2',
      description: 'Added missing semicolons',
      severity: 'info',
    },
  ];

  private results: OptimizationResult[] = [];

  /**
   * Optimize a single file
   */
  optimizeFile(filepath: string): OptimizationResult[] {
    if (!fs.existsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }

    let content = fs.readFileSync(filepath, 'utf-8');
    const originalContent = content;
    const fileResults: OptimizationResult[] = [];

    // Apply each rule
    for (const rule of this.rules) {
      const matches = content.match(rule.pattern);

      if (matches && matches.length > 0) {
        content = content.replace(rule.pattern, rule.replacement as string);

        fileResults.push({
          file: filepath,
          rule: rule.name,
          changes: matches.length,
          description: rule.description,
        });
      }
    }

    // Save optimized content if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filepath, content, 'utf-8');
    }

    this.results.push(...fileResults);
    return fileResults;
  }

  /**
   * Optimize entire directory
   */
  async optimizeDirectory(
    dirpath: string,
    options: {
      recursive?: boolean;
      extensions?: string[];
      exclude?: string[];
    } = {}
  ): Promise<OptimizationResult[]> {
    const {
      recursive = true,
      extensions = ['.ts', '.js', '.tsx', '.jsx'],
      exclude = ['node_modules', 'dist', 'build', '.git'],
    } = options;

    const files: string[] = [];

    const scanDirectory = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip excluded directories
        if (exclude.some(ex => fullPath.includes(ex))) {
          continue;
        }

        if (entry.isDirectory() && recursive) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(dirpath);

    // Optimize each file
    const allResults: OptimizationResult[] = [];

    for (const file of files) {
      try {
        const results = this.optimizeFile(file);
        allResults.push(...results);
      } catch (error: any) {
        console.error(chalk.red(`Error optimizing ${file}:`), error.message);
      }
    }

    return allResults;
  }

  /**
   * Display optimization report
   */
  displayReport(): void {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║                                                        ║'));
    console.log(chalk.cyan('║        🚀 AUTO OPTIMIZATION REPORT                    ║'));
    console.log(chalk.cyan('║                                                        ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════╝\n'));

    if (this.results.length === 0) {
      console.log(chalk.green('✅ No optimizations needed. Code is already optimal!\n'));
      return;
    }

    // Group by file
    const byFile = this.results.reduce(
      (acc, result) => {
        if (!acc[result.file]) acc[result.file] = [];
        acc[result.file].push(result);
        return acc;
      },
      {} as Record<string, OptimizationResult[]>
    );

    // Group by rule
    const byRule = this.results.reduce(
      (acc, result) => {
        if (!acc[result.rule]) acc[result.rule] = { count: 0, files: new Set() };
        acc[result.rule].count += result.changes;
        acc[result.rule].files.add(result.file);
        return acc;
      },
      {} as Record<string, { count: number; files: Set<string> }>
    );

    // Summary
    console.log(chalk.bold.yellow('📊 Summary:\n'));
    console.log(chalk.gray('━'.repeat(60)));
    console.log(chalk.white(`  Files Optimized:      ${chalk.cyan(Object.keys(byFile).length)}`));
    console.log(
      chalk.white(
        `  Total Changes:        ${chalk.cyan(this.results.reduce((sum, r) => sum + r.changes, 0))}`
      )
    );
    console.log(chalk.white(`  Rules Applied:        ${chalk.cyan(Object.keys(byRule).length)}`));
    console.log(chalk.gray('━'.repeat(60)) + '\n');

    // By rule
    console.log(chalk.bold.yellow('📋 Changes by Rule:\n'));
    Object.entries(byRule).forEach(([rule, data]) => {
      console.log(chalk.white(`  ${chalk.cyan(rule)}`));
      console.log(chalk.gray(`    → ${data.count} changes in ${data.files.size} file(s)`));
    });
    console.log();

    // Top files
    console.log(chalk.bold.yellow('📁 Top Optimized Files:\n'));
    const topFiles = Object.entries(byFile)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    topFiles.forEach(([file, results]) => {
      const relativePath = path.relative(process.cwd(), file);
      const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
      console.log(chalk.white(`  ${chalk.green('✓')} ${relativePath}`));
      console.log(chalk.gray(`    → ${totalChanges} changes`));
    });
    console.log();

    // Savings estimate
    const avgTimePerOptimization = 30; // seconds
    const totalTimeSaved =
      (this.results.reduce((sum, r) => sum + r.changes, 0) * avgTimePerOptimization) / 60;
    console.log(
      chalk.bold.green(`💡 Estimated Time Saved: ${totalTimeSaved.toFixed(1)} minutes\n`)
    );
  }

  /**
   * Save report to file
   */
  saveReport(filename: string = 'optimization-report.json'): void {
    const reportDir = path.join(process.cwd(), 'optimization-reports');

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = path.join(reportDir, `${timestamp}-${filename}`);

    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        filesOptimized: new Set(this.results.map(r => r.file)).size,
        totalChanges: this.results.reduce((sum, r) => sum + r.changes, 0),
        rulesApplied: new Set(this.results.map(r => r.rule)).size,
      },
    };

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`✅ Report saved to: ${filepath}\n`));
  }

  /**
   * Clear results
   */
  clearResults(): void {
    this.results = [];
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const target = args[0] || './backend';

  const optimizer = new AutoOptimizer();
  const spinner = ora('Running auto-optimizer...').start();

  optimizer
    .optimizeDirectory(target)
    .then(() => {
      spinner.succeed('Optimization complete!');
      optimizer.displayReport();
      optimizer.saveReport();
    })
    .catch(error => {
      spinner.fail('Optimization failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    });
}

export default AutoOptimizer;
export { OptimizationRule, OptimizationResult };
