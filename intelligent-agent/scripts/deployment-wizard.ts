/**
 * Deployment Wizard
 * Interactive deployment tool with pre-flight checks
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import * as fs from 'fs';

interface DeploymentConfig {
  environment: 'staging' | 'production';
  region: string;
  branch: string;
  runTests: boolean;
  backupDatabase: boolean;
  notifyTeam: boolean;
}

class DeploymentWizard {
  private config: Partial<DeploymentConfig> = {};

  async run(): Promise<void> {
    console.clear();
    this.printBanner();

    await this.gatherInformation();
    await this.runPreflightChecks();
    await this.confirmDeployment();
    await this.executeDeploy();
    await this.postDeploymentTasks();
  }

  private printBanner(): void {
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 DEPLOYMENT WIZARD v2.0                             ║
║   Intelligent Agent Deployment Tool                      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `));
  }

  private async gatherInformation(): Promise<void> {
    console.log(chalk.bold.yellow('\n📋 Step 1: Configuration\n'));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'environment',
        message: 'Select deployment environment:',
        choices: [
          { name: '🔧 Staging (Safe testing environment)', value: 'staging' },
          { name: '🚀 Production (Live environment)', value: 'production' },
        ],
      },
      {
        type: 'list',
        name: 'region',
        message: 'Select deployment region:',
        choices: [
          { name: '🌍 US East (Virginia)', value: 'us-east-1' },
          { name: '🌍 EU West (Ireland)', value: 'eu-west-1' },
          { name: '🌏 Asia Pacific (Singapore)', value: 'ap-southeast-1' },
          { name: '🌎 Middle East (Bahrain)', value: 'me-south-1' },
        ],
      },
      {
        type: 'input',
        name: 'branch',
        message: 'Git branch to deploy:',
        default: 'main',
        validate: (input) => input.length > 0 || 'Branch name is required',
      },
      {
        type: 'confirm',
        name: 'runTests',
        message: 'Run full test suite before deployment?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'backupDatabase',
        message: 'Create database backup?',
        default: true,
        when: (answers) => answers.environment === 'production',
      },
      {
        type: 'confirm',
        name: 'notifyTeam',
        message: 'Send deployment notification to team?',
        default: true,
      },
    ]);

    this.config = answers;
  }

  private async runPreflightChecks(): Promise<void> {
    console.log(chalk.bold.yellow('\n✅ Step 2: Pre-flight Checks\n'));

    const checks = [
      { name: 'Git status', command: 'git status --porcelain' },
      { name: 'Dependencies', command: 'npm outdated' },
      { name: 'TypeScript compilation', command: 'tsc --noEmit' },
      { name: 'Linting', command: 'npm run lint' },
      { name: 'Environment variables', command: 'node -e "require(\'dotenv\').config()"' },
    ];

    const results: { name: string; status: 'pass' | 'fail' | 'warning'; message?: string }[] = [];

    for (const check of checks) {
      const spinner = ora(`Checking ${check.name}...`).start();

      try {
        const output = execSync(check.command, { encoding: 'utf-8', stdio: 'pipe' });
        
        if (check.name === 'Git status' && output.trim().length > 0) {
          spinner.warn(`${check.name}: Uncommitted changes`);
          results.push({ name: check.name, status: 'warning', message: 'Uncommitted changes found' });
        } else if (check.name === 'Dependencies' && output.trim().length > 0) {
          spinner.warn(`${check.name}: Outdated packages`);
          results.push({ name: check.name, status: 'warning', message: 'Some packages are outdated' });
        } else {
          spinner.succeed(`${check.name}: OK`);
          results.push({ name: check.name, status: 'pass' });
        }
      } catch (error: any) {
        spinner.fail(`${check.name}: Failed`);
        results.push({ name: check.name, status: 'fail', message: error.message });
      }

      await this.sleep(300);
    }

    // Run tests if requested
    if (this.config.runTests) {
      const spinner = ora('Running test suite...').start();
      try {
        execSync('npm test', { stdio: 'pipe' });
        spinner.succeed('Tests: All passed');
        results.push({ name: 'Tests', status: 'pass' });
      } catch (error) {
        spinner.fail('Tests: Some failed');
        results.push({ name: 'Tests', status: 'fail', message: 'Test failures detected' });
      }
    }

    // Display summary
    console.log(chalk.bold('\n📊 Pre-flight Check Summary:\n'));
    
    const failures = results.filter(r => r.status === 'fail');
    const warnings = results.filter(r => r.status === 'warning');
    const passes = results.filter(r => r.status === 'pass');

    console.log(chalk.green(`  ✓ Passed:   ${passes.length}`));
    console.log(chalk.yellow(`  ⚠ Warnings: ${warnings.length}`));
    console.log(chalk.red(`  ✗ Failed:   ${failures.length}`));

    if (failures.length > 0) {
      console.log(chalk.red('\n⚠️  Deployment blocked due to failures:\n'));
      failures.forEach(f => {
        console.log(chalk.red(`  • ${f.name}: ${f.message}`));
      });
      
      const proceed = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'override',
          message: chalk.red('Do you want to override and continue anyway?'),
          default: false,
        },
      ]);

      if (!proceed.override) {
        console.log(chalk.yellow('\n❌ Deployment cancelled.\n'));
        process.exit(0);
      }
    }

    if (warnings.length > 0 && failures.length === 0) {
      console.log(chalk.yellow('\n⚠️  Warnings detected:\n'));
      warnings.forEach(w => {
        console.log(chalk.yellow(`  • ${w.name}: ${w.message}`));
      });
    }
  }

  private async confirmDeployment(): Promise<void> {
    console.log(chalk.bold.yellow('\n🔍 Step 3: Review Configuration\n'));

    console.log(chalk.gray('━'.repeat(60)));
    console.log(chalk.white(`  Environment:     ${chalk.cyan(this.config.environment)}`));
    console.log(chalk.white(`  Region:          ${chalk.cyan(this.config.region)}`));
    console.log(chalk.white(`  Branch:          ${chalk.cyan(this.config.branch)}`));
    console.log(chalk.white(`  Run Tests:       ${this.config.runTests ? chalk.green('Yes') : chalk.red('No')}`));
    console.log(chalk.white(`  Backup DB:       ${this.config.backupDatabase ? chalk.green('Yes') : chalk.red('No')}`));
    console.log(chalk.white(`  Notify Team:     ${this.config.notifyTeam ? chalk.green('Yes') : chalk.red('No')}`));
    console.log(chalk.gray('━'.repeat(60)));

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: chalk.bold.red(`\nDeploy to ${this.config.environment?.toUpperCase()}?`),
        default: false,
      },
    ]);

    if (!confirm.proceed) {
      console.log(chalk.yellow('\n❌ Deployment cancelled.\n'));
      process.exit(0);
    }

    // Additional confirmation for production
    if (this.config.environment === 'production') {
      const doubleConfirm = await inquirer.prompt([
        {
          type: 'input',
          name: 'confirmation',
          message: chalk.red('Type "DEPLOY TO PRODUCTION" to confirm:'),
          validate: (input) => input === 'DEPLOY TO PRODUCTION' || 'Incorrect confirmation',
        },
      ]);
    }
  }

  private async executeDeploy(): Promise<void> {
    console.log(chalk.bold.yellow('\n🚀 Step 4: Deployment\n'));

    const tasks = [
      { name: 'Creating backup', skip: !this.config.backupDatabase },
      { name: 'Building project', skip: false },
      { name: 'Running database migrations', skip: false },
      { name: 'Deploying application', skip: false },
      { name: 'Running smoke tests', skip: false },
      { name: 'Updating DNS records', skip: false },
      { name: 'Warming up cache', skip: false },
      { name: 'Sending notifications', skip: !this.config.notifyTeam },
    ];

    for (const task of tasks) {
      if (task.skip) continue;

      const spinner = ora(task.name).start();
      
      try {
        // Simulate deployment tasks
        await this.sleep(1000 + Math.random() * 2000);
        
        // Execute actual deployment commands here
        // This is a placeholder - replace with real deployment logic
        
        spinner.succeed(task.name);
      } catch (error: any) {
        spinner.fail(`${task.name}: ${error.message}`);
        throw error;
      }
    }

    console.log(chalk.green.bold('\n✅ Deployment successful!\n'));
  }

  private async postDeploymentTasks(): Promise<void> {
    console.log(chalk.bold.yellow('📋 Step 5: Post-Deployment\n'));

    // Generate deployment report
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      region: this.config.region,
      branch: this.config.branch,
      success: true,
    };

    const reportPath = `deployment-reports/${report.timestamp}.json`;
    fs.mkdirSync('deployment-reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(chalk.green(`  ✓ Deployment report saved: ${reportPath}`));

    // Display access information
    console.log(chalk.bold('\n📍 Access Information:\n'));
    console.log(chalk.gray('━'.repeat(60)));
    
    if (this.config.environment === 'staging') {
      console.log(chalk.white(`  URL:      ${chalk.cyan('https://staging.example.com')}`));
      console.log(chalk.white(`  API:      ${chalk.cyan('https://api-staging.example.com')}`));
    } else {
      console.log(chalk.white(`  URL:      ${chalk.cyan('https://example.com')}`));
      console.log(chalk.white(`  API:      ${chalk.cyan('https://api.example.com')}`));
    }
    
    console.log(chalk.white(`  Logs:     ${chalk.cyan('npm run monitor:logs')}`));
    console.log(chalk.white(`  Health:   ${chalk.cyan('npm run health:check')}`));
    console.log(chalk.gray('━'.repeat(60)));

    console.log(chalk.bold.green('\n🎉 Deployment Complete!\n'));
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const wizard = new DeploymentWizard();
  wizard.run().catch((error) => {
    console.error(chalk.red('\n❌ Deployment failed:\n'));
    console.error(chalk.red(error.message));
    process.exit(1);
  });
}

export default DeploymentWizard;
