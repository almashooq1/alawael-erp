#!/usr/bin/env node

/**
 * Test Coverage Analyzer
 * Analyze and report on test coverage
 */

const fs = require('fs');
const path = require('path');

class CoverageAnalyzer {
  constructor() {
    this.coverageDir = path.join(__dirname, '../coverage');
  }

  /**
   * Analyze coverage file
   */
  analyze() {
    console.log('📊 Analyzing test coverage...\n');

    const coverageSummaryFile = path.join(this.coverageDir, 'coverage-summary.json');

    if (!fs.existsSync(coverageSummaryFile)) {
      console.warn('⚠️  Coverage file not found. Run tests with coverage first.');
      return;
    }

    const coverage = JSON.parse(fs.readFileSync(coverageSummaryFile, 'utf-8'));
    const total = coverage.total;

    console.log('Coverage Report:');
    console.log('═'.repeat(60));
    console.log(`
Lines:       ${total.lines.pct}%  (${total.lines.covered}/${total.lines.total})
Statements:  ${total.statements.pct}%  (${total.statements.covered}/${total.statements.total})
Functions:   ${total.functions.pct}%  (${total.functions.covered}/${total.functions.total})
Branches:    ${total.branches.pct}%  (${total.branches.covered}/${total.branches.total})
    `);
    console.log('═'.repeat(60) + '\n');

    // Identify files with low coverage
    this.identifyLowCoverage(coverage);
  }

  /**
   * Identify files with low coverage
   */
  identifyLowCoverage(coverage) {
    console.log('📉 Files with coverage below 70%:\n');

    const lowCoverageFiles = [];

    for (const [file, data] of Object.entries(coverage)) {
      if (file === 'total') continue;

      const lineCoverage = data.lines.pct;

      if (lineCoverage < 70) {
        lowCoverageFiles.push({
          file,
          coverage: lineCoverage,
        });
      }
    }

    if (lowCoverageFiles.length === 0) {
      console.log('✅ All files meet coverage threshold!\n');
      return;
    }

    lowCoverageFiles.sort((a, b) => a.coverage - b.coverage);

    lowCoverageFiles.forEach(({ file, coverage }) => {
      const status = coverage < 50 ? '🔴' : '🟡';
      console.log(`${status} ${file}: ${coverage}%`);
    });

    console.log(`\n⚠️  ${lowCoverageFiles.length} files need improvement\n`);
  }

  /**
   * Generate HTML coverage report
   */
  generateHTML() {
    const htmlDir = path.join(this.coverageDir, 'lcov-report');

    if (fs.existsSync(htmlDir)) {
      console.log(`🌐 HTML coverage report available at: ${htmlDir}/index.html\n`);
    }
  }
}

// Run analyzer if executed directly
if (require.main === module) {
  const analyzer = new CoverageAnalyzer();
  analyzer.analyze();
  analyzer.generateHTML();
}

module.exports = CoverageAnalyzer;
