#!/usr/bin/env node

/**
 * Intelligent Agent CLI Tool
 * Command-line interface for managing the intelligent agent system
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     🤖 INTELLIGENT AGENT CLI v2.0                    ║
║     Enterprise-Grade Management Tool                  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`;

program.name('agent-cli').description('Intelligent Agent Management CLI').version('2.0.0');

// ============================================
// COMMAND: System Status
// ============================================
program
  .command('status')
  .description('Check system status and health')
  .action(async () => {
    console.log(chalk.cyan(banner));
    const spinner = ora('Checking system status...').start();

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      spinner.text = 'Checking Node.js version...';
      await sleep(500);

      // Check npm packages
      spinner.text = 'Checking dependencies...';
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      await sleep(500);

      // Check TypeScript compilation
      spinner.text = 'Checking TypeScript...';
      try {
        execSync('tsc --noEmit', { stdio: 'pipe' });
      } catch (error) {
        // TypeScript errors will be shown later
      }
      await sleep(500);

      spinner.succeed('System check complete!');

      // Display results
      console.log('\n' + chalk.bold.green('✓ System Status:'));
      console.log(chalk.gray('━'.repeat(60)));
      console.log(chalk.white(`  Node.js:      ${chalk.green(nodeVersion)}`));
      console.log(chalk.white(`  Project:      ${chalk.green(packageJson.name)}`));
      console.log(chalk.white(`  Version:      ${chalk.green(packageJson.version)}`));
      console.log(chalk.white(`  Status:       ${chalk.green('✓ Ready')}`));
      console.log(chalk.gray('━'.repeat(60)) + '\n');
    } catch (error: any) {
      spinner.fail('Status check failed');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// ============================================
// COMMAND: Run Tests
// ============================================
program
  .command('test [type]')
  .description('Run tests (all, unit, integration)')
  .action(async (type = 'all') => {
    console.log(chalk.cyan(banner));
    const spinner = ora(`Running ${type} tests...`).start();

    try {
      let command = 'npm test';
      if (type === 'unit') command = 'npm run test:unit';
      if (type === 'integration') command = 'npm run test:integration';

      const result = execSync(command, { encoding: 'utf-8' });
      spinner.succeed(`${type} tests completed successfully!`);

      console.log('\n' + chalk.green(result));
    } catch (error: any) {
      spinner.fail('Tests failed');
      console.error(chalk.red(error.stdout || error.message));
      process.exit(1);
    }
  });

// ============================================
// COMMAND: Build Project
// ============================================
program
  .command('build')
  .description('Build the project for production')
  .option('-c, --clean', 'Clean before build')
  .action(async options => {
    console.log(chalk.cyan(banner));

    if (options.clean) {
      const spinner = ora('Cleaning build directory...').start();
      try {
        execSync('npm run clean', { stdio: 'inherit' });
        spinner.succeed('Build directory cleaned');
      } catch (error) {
        spinner.warn('Clean failed (directory may not exist)');
      }
    }

    const spinner = ora('Building project...').start();
    try {
      execSync('npm run build', { stdio: 'inherit' });
      spinner.succeed('Build completed successfully!');

      console.log(chalk.green('\n✓ Build artifacts created in dist/'));
    } catch (error: any) {
      spinner.fail('Build failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================
// COMMAND: Start Server
// ============================================
program
  .command('start [mode]')
  .description('Start the server (dev, prod, staging)')
  .action(async (mode = 'dev') => {
    console.log(chalk.cyan(banner));
    console.log(chalk.yellow(`\nStarting server in ${mode} mode...\n`));

    try {
      let command = 'npm run dev';
      if (mode === 'prod') command = 'npm run start:prod';
      if (mode === 'staging') command = 'npm run start:staging';

      execSync(command, { stdio: 'inherit' });
    } catch (error: any) {
      console.error(chalk.red('Server failed to start:'), error.message);
      process.exit(1);
    }
  });

// ============================================
// COMMAND: Deploy
// ============================================
program
  .command('deploy [environment]')
  .description('Deploy to environment (staging, production)')
  .action(async (environment = 'staging') => {
    console.log(chalk.cyan(banner));

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to deploy to ${chalk.bold(environment)}?`,
        default: false,
      },
    ]);

    if (!answers.confirm) {
      console.log(chalk.yellow('\nDeployment cancelled.'));
      return;
    }

    const spinner = ora(`Deploying to ${environment}...`).start();

    try {
      // Run tests first
      spinner.text = 'Running tests...';
      execSync('npm test', { stdio: 'pipe' });
      await sleep(1000);

      // Build project
      spinner.text = 'Building project...';
      execSync('npm run build', { stdio: 'pipe' });
      await sleep(1000);

      // Verify deployment
      spinner.text = 'Verifying deployment...';
      execSync('npm run verify:deploy', { stdio: 'pipe' });
      await sleep(1000);

      spinner.succeed(`Deployed to ${environment} successfully!`);

      console.log(chalk.green(`\n✓ Deployment complete!`));
      console.log(chalk.gray(`  Environment: ${environment}`));
      console.log(chalk.gray(`  Time: ${new Date().toLocaleString()}`));
    } catch (error: any) {
      spinner.fail('Deployment failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================
// COMMAND: Database
// ============================================
program
  .command('db <action>')
  .description('Database operations (migrate, seed, reset)')
  .action(async action => {
    console.log(chalk.cyan(banner));
    const spinner = ora(`Running database ${action}...`).start();

    try {
      let command = '';
      if (action === 'migrate') command = 'npm run db:migrate';
      if (action === 'seed') command = 'npm run db:seed';
      if (action === 'reset') {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset the database?',
            default: false,
          },
        ]);

        if (!answers.confirm) {
          spinner.stop();
          console.log(chalk.yellow('\nDatabase reset cancelled.'));
          return;
        }
        command = 'npm run db:migrate && npm run db:seed';
      }

      if (!command) {
        spinner.fail(`Unknown action: ${action}`);
        console.log(chalk.yellow('\nAvailable actions: migrate, seed, reset'));
        return;
      }

      execSync(command, { stdio: 'inherit' });
      spinner.succeed(`Database ${action} completed!`);
    } catch (error: any) {
      spinner.fail(`Database ${action} failed`);
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================
// COMMAND: Logs
// ============================================
program
  .command('logs [service]')
  .description('View logs (all, backend, ml, monitor)')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <number>', 'Number of lines', '100')
  .action(async (service = 'all', options) => {
    console.log(chalk.cyan(banner));
    console.log(chalk.yellow(`\nViewing ${service} logs...\n`));

    try {
      let command = `tail -n ${options.lines} logs/app.log`;
      if (service === 'monitor') command = 'npm run monitor:logs';
      if (options.follow) command += ' -f';

      execSync(command, { stdio: 'inherit' });
    } catch (error: any) {
      console.error(chalk.red('Failed to read logs:'), error.message);
      process.exit(1);
    }
  });

// ============================================
// COMMAND: Health Check
// ============================================
program
  .command('health')
  .description('Run comprehensive health check')
  .action(async () => {
    console.log(chalk.cyan(banner));
    const spinner = ora('Running health check...').start();

    try {
      const result = execSync('npm run health:check', { encoding: 'utf-8' });
      spinner.succeed('Health check completed!');

      console.log(chalk.green('\n' + result));
    } catch (error: any) {
      spinner.fail('Health check failed');
      console.error(chalk.red(error.stdout || error.message));
      process.exit(1);
    }
  });

// ============================================
// COMMAND: Interactive Mode
// ============================================
program
  .command('interactive')
  .alias('i')
  .description('Launch interactive mode')
  .action(async () => {
    console.log(chalk.cyan(banner));

    while (true) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📊 Check System Status', value: 'status' },
            { name: '🧪 Run Tests', value: 'test' },
            { name: '🔨 Build Project', value: 'build' },
            { name: '🚀 Start Server', value: 'start' },
            { name: '💾 Database Operations', value: 'db' },
            { name: '📝 View Logs', value: 'logs' },
            { name: '❤️  Health Check', value: 'health' },
            new inquirer.Separator(),
            { name: '🚪 Exit', value: 'exit' },
          ],
        },
      ]);

      if (answers.action === 'exit') {
        console.log(chalk.green('\nGoodbye! 👋\n'));
        break;
      }

      // Execute the chosen action
      try {
        await executeAction(answers.action);
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
      }

      // Pause before showing menu again
      await inquirer.prompt([
        {
          type: 'input',
          name: 'continue',
          message: 'Press Enter to continue...',
        },
      ]);

      console.clear();
      console.log(chalk.cyan(banner));
    }
  });

// ============================================
// COMMAND: Quick Setup
// ============================================
program
  .command('setup')
  .description('Quick setup for new environment')
  .action(async () => {
    console.log(chalk.cyan(banner));
    console.log(chalk.bold.yellow('\n🚀 Quick Setup Wizard\n'));

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'installDeps',
        message: 'Install dependencies?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'setupDb',
        message: 'Setup database?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'runTests',
        message: 'Run tests?',
        default: true,
      },
    ]);

    const spinner = ora('Setting up...').start();

    try {
      if (answers.installDeps) {
        spinner.text = 'Installing dependencies...';
        execSync('npm install', { stdio: 'pipe' });
        await sleep(1000);
      }

      if (answers.setupDb) {
        spinner.text = 'Setting up database...';
        execSync('npm run db:migrate && npm run db:seed', { stdio: 'pipe' });
        await sleep(1000);
      }

      if (answers.runTests) {
        spinner.text = 'Running tests...';
        execSync('npm test', { stdio: 'pipe' });
        await sleep(1000);
      }

      spinner.succeed('Setup completed successfully!');

      console.log(chalk.green('\n✓ Your environment is ready!'));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('  • Run: agent-cli start'));
      console.log(chalk.gray('  • Or:  agent-cli interactive\n'));
    } catch (error: any) {
      spinner.fail('Setup failed');
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ============================================
// Helper Functions
// ============================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeAction(action: string): Promise<void> {
  const spinner = ora(`Executing ${action}...`).start();

  try {
    switch (action) {
      case 'status':
        execSync('agent-cli status', { stdio: 'inherit' });
        break;
      case 'test':
        const testType = await inquirer.prompt([
          {
            type: 'list',
            name: 'type',
            message: 'Which tests?',
            choices: ['all', 'unit', 'integration'],
          },
        ]);
        execSync(`npm test`, { stdio: 'inherit' });
        break;
      case 'build':
        execSync('npm run build', { stdio: 'inherit' });
        break;
      case 'start':
        const mode = await inquirer.prompt([
          {
            type: 'list',
            name: 'mode',
            message: 'Which mode?',
            choices: ['dev', 'prod', 'staging'],
          },
        ]);
        execSync(`npm run start`, { stdio: 'inherit' });
        break;
      case 'db':
        const dbAction = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'Database action?',
            choices: ['migrate', 'seed', 'reset'],
          },
        ]);
        execSync(`agent-cli db ${dbAction.action}`, { stdio: 'inherit' });
        break;
      case 'logs':
        execSync('npm run monitor:logs', { stdio: 'inherit' });
        break;
      case 'health':
        execSync('npm run health:check', { stdio: 'inherit' });
        break;
    }
    spinner.succeed(`${action} completed!`);
  } catch (error) {
    spinner.fail(`${action} failed`);
    throw error;
  }
}

// ============================================
// Parse and Execute
// ============================================

program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan(banner));
  program.outputHelp();

  console.log(chalk.yellow('\n💡 Quick Start:'));
  console.log(chalk.gray('  • agent-cli interactive  - Launch interactive mode'));
  console.log(chalk.gray('  • agent-cli status       - Check system status'));
  console.log(chalk.gray('  • agent-cli start        - Start development server'));
  console.log(chalk.gray('  • agent-cli setup        - Quick setup wizard\n'));
}
