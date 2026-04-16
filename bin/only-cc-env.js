#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import readline from 'node:readline/promises';

import {
  listProviders,
  getProvider,
  saveProvider,
  removeProvider,
  getActiveProvider,
  setActiveProvider,
  getEnvKeys,
  isRequiredKey,
} from '../lib/provider.js';
import {
  detectShell,
  writeEnvFile,
  addSourceLine,
  removeSourceLine,
  getShellRcFile,
} from '../lib/shell.js';
import { ensureConfigDirs } from '../lib/config.js';
import { detectOfficialAccount, getOfficialName, isOfficialName } from '../lib/official.js';
import { getCompletionScript, installCompletion, uninstallCompletion } from '../lib/completion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('only-cc-env')
  .description('Manage multiple Anthropic/Claude API provider environments')
  .version(pkg.version);

// --- add ---
program
  .command('add <name>')
  .description('Add a new provider configuration')
  .option('--base-url <url>', 'ANTHROPIC_BASE_URL')
  .option('--auth-token <token>', 'ANTHROPIC_AUTH_TOKEN')
  .option('--model <model>', 'ANTHROPIC_MODEL')
  .option('--sonnet-model <model>', 'ANTHROPIC_DEFAULT_SONNET_MODEL')
  .option('--opus-model <model>', 'ANTHROPIC_DEFAULT_OPUS_MODEL')
  .option('--haiku-model <model>', 'ANTHROPIC_DEFAULT_HAIKU_MODEL')
  .action(async (name, options) => {
    try {
      if (isOfficialName(name)) {
        console.error(chalk.red(`Error: "${name}" is reserved for the official Claude account.`));
        process.exit(1);
      }

      const existing = getProvider(name);
      if (existing) {
        console.error(chalk.red(`Error: Provider "${name}" already exists. Use "edit" to modify it.`));
        process.exit(1);
      }

      let data = {};
      const hasOptions = options.baseUrl || options.authToken || options.model ||
        options.sonnetModel || options.opusModel || options.haikuModel;

      if (hasOptions) {
        if (options.baseUrl) data.ANTHROPIC_BASE_URL = options.baseUrl;
        if (options.authToken) data.ANTHROPIC_AUTH_TOKEN = options.authToken;
        if (options.model) data.ANTHROPIC_MODEL = options.model;
        if (options.sonnetModel) data.ANTHROPIC_DEFAULT_SONNET_MODEL = options.sonnetModel;
        if (options.opusModel) data.ANTHROPIC_DEFAULT_OPUS_MODEL = options.opusModel;
        if (options.haikuModel) data.ANTHROPIC_DEFAULT_HAIKU_MODEL = options.haikuModel;
      } else {
        const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
        const keys = getEnvKeys();
        for (const key of keys) {
          const required = isRequiredKey(key);
          const suffix = required ? chalk.red(' *') : chalk.dim(' (optional)');
          let answer = await rl.question(`${chalk.dim(key)}${suffix}${chalk.dim(': ')}`);
          answer = answer.trim();
          if (required && !answer) {
            rl.close();
            console.error(chalk.red(`\nError: ${key} is required.`));
            process.exit(1);
          }
          if (answer) {
            data[key] = answer;
          }
        }
        rl.close();
      }

      saveProvider(name, data);
      console.log(chalk.green(`Provider "${name}" added.`));
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- edit ---
program
  .command('edit <name>')
  .description('Edit an existing provider configuration')
  .option('--base-url <url>', 'ANTHROPIC_BASE_URL')
  .option('--auth-token <token>', 'ANTHROPIC_AUTH_TOKEN')
  .option('--model <model>', 'ANTHROPIC_MODEL')
  .option('--sonnet-model <model>', 'ANTHROPIC_DEFAULT_SONNET_MODEL')
  .option('--opus-model <model>', 'ANTHROPIC_DEFAULT_OPUS_MODEL')
  .option('--haiku-model <model>', 'ANTHROPIC_DEFAULT_HAIKU_MODEL')
  .action(async (name, options) => {
    try {
      if (isOfficialName(name)) {
        console.error(chalk.red(`Error: "${name}" is the official Claude account and cannot be edited.`));
        process.exit(1);
      }

      const existing = getProvider(name);
      if (!existing) {
        console.error(chalk.red(`Error: Provider "${name}" not found.`));
        process.exit(1);
      }

      let data = { ...existing };
      const hasOptions = options.baseUrl || options.authToken || options.model ||
        options.sonnetModel || options.opusModel || options.haikuModel;

      if (hasOptions) {
        if (options.baseUrl) data.ANTHROPIC_BASE_URL = options.baseUrl;
        if (options.authToken) data.ANTHROPIC_AUTH_TOKEN = options.authToken;
        if (options.model) data.ANTHROPIC_MODEL = options.model;
        if (options.sonnetModel) data.ANTHROPIC_DEFAULT_SONNET_MODEL = options.sonnetModel;
        if (options.opusModel) data.ANTHROPIC_DEFAULT_OPUS_MODEL = options.opusModel;
        if (options.haikuModel) data.ANTHROPIC_DEFAULT_HAIKU_MODEL = options.haikuModel;
      } else {
        const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
        const keys = getEnvKeys();
        for (const key of keys) {
          const current = existing[key] || '';
          const required = isRequiredKey(key);
          const suffix = required ? chalk.red(' *') : chalk.dim(' (optional)');
          const display = current ? chalk.dim(` [${maskValue(current)}]`) : '';
          const answer = await rl.question(`${chalk.dim(key)}${suffix}${display}${chalk.dim(': ')}`);
          if (answer.trim()) {
            data[key] = answer.trim();
          }
        }
        rl.close();
      }

      saveProvider(name, data);
      console.log(chalk.green(`Provider "${name}" updated.`));

      // refresh env file if this is the active provider
      const active = getActiveProvider();
      if (active === name) {
        applyProvider(name);
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- list ---
program
  .command('list')
  .description('List all configured providers')
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      const providers = listProviders();
      const active = getActiveProvider();
      const official = detectOfficialAccount();

      if (providers.length === 0 && !official.loggedIn) {
        console.log(chalk.dim('No providers configured. Use "only-cc-env add <name>" to add one.'));
        return;
      }

      if (options.json) {
        const list = providers.map(p => ({
          ...p,
          active: p.name === active,
        }));
        if (official.loggedIn) {
          list.unshift({
            name: getOfficialName(),
            type: 'official',
            email: official.email,
            subscriptionType: official.subscriptionType,
            active: getOfficialName() === active,
          });
        }
        console.log(JSON.stringify(list, null, 2));
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan(''),
          chalk.cyan('Name'),
          chalk.cyan('Base URL'),
          chalk.cyan('Model'),
        ],
        style: { head: [], border: [] },
      });

      // official account row
      if (official.loggedIn) {
        const isActive = getOfficialName() === active;
        const label = official.email
          ? `${getOfficialName()} (${official.email})`
          : getOfficialName();
        table.push([
          isActive ? chalk.green('*') : ' ',
          isActive ? chalk.green(label) : label,
          chalk.dim('api.anthropic.com'),
          chalk.dim('-'),
        ]);
      }

      for (const p of providers) {
        const isActive = p.name === active;
        table.push([
          isActive ? chalk.green('*') : ' ',
          isActive ? chalk.green(p.name) : p.name,
          p.ANTHROPIC_BASE_URL || chalk.dim('-'),
          p.ANTHROPIC_MODEL || chalk.dim('-'),
        ]);
      }

      console.log(table.toString());
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- show ---
program
  .command('show [name]')
  .description('Show provider details (defaults to active provider)')
  .option('--unmask', 'Show full token values')
  .action((name, options) => {
    try {
      const targetName = name || getActiveProvider();
      if (!targetName) {
        console.error(chalk.red('Error: No provider specified and no active provider set.'));
        process.exit(1);
      }

      if (isOfficialName(targetName)) {
        const official = detectOfficialAccount();
        const active = getActiveProvider();
        const isActive = targetName === active;
        console.log(chalk.bold(targetName) + (isActive ? chalk.green(' (active)') : ''));
        console.log();
        if (official.loggedIn) {
          console.log(`  ${chalk.dim('Email:')} ${official.email}`);
          console.log(`  ${chalk.dim('Org:')} ${official.orgName}`);
          console.log(`  ${chalk.dim('Plan:')} ${official.subscriptionType}`);
          console.log(`  ${chalk.dim('Auth:')} ${official.authMethod}`);
        } else {
          console.log(chalk.dim('  Not logged in'));
        }
        return;
      }

      const data = getProvider(targetName);
      if (!data) {
        console.error(chalk.red(`Error: Provider "${targetName}" not found.`));
        process.exit(1);
      }

      const active = getActiveProvider();
      const isActive = targetName === active;

      console.log(chalk.bold(targetName) + (isActive ? chalk.green(' (active)') : ''));
      console.log();

      // Show predefined keys first, then any custom keys
      const predefined = getEnvKeys();
      const custom = Object.keys(data).filter(k => !predefined.includes(k));
      const allKeys = [...predefined, ...custom];
      for (const key of allKeys) {
        const value = data[key];
        if (value) {
          const display = options.unmask ? value : maskValue(value);
          console.log(`  ${chalk.dim(key + ':')} ${display}`);
        } else if (predefined.includes(key)) {
          console.log(`  ${chalk.dim(key + ':')} ${chalk.dim('-')}`);
        }
      }
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- use ---
program
  .command('use <name>')
  .description('Set the active provider and apply environment variables')
  .action((name) => {
    try {
      if (isOfficialName(name)) {
        const official = detectOfficialAccount();
        if (!official.loggedIn) {
          console.error(chalk.red('Error: No official Claude account logged in. Run "claude login" first.'));
          process.exit(1);
        }
        // Clear env vars to fall back to official account
        setActiveProvider(name, { skipCheck: true });
        clearProviderEnv();
        console.log(chalk.green(`Switched to official account${official.email ? ` (${official.email})` : ''}.`));
        return;
      }

      setActiveProvider(name);
      applyProvider(name);
      console.log(chalk.green(`Switched to provider "${name}".`));
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- remove ---
program
  .command('remove <name>')
  .description('Remove a provider configuration')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (name, options) => {
    try {
      if (isOfficialName(name)) {
        console.error(chalk.red(`Error: "${name}" is the official Claude account and cannot be removed.`));
        process.exit(1);
      }

      const data = getProvider(name);
      if (!data) {
        console.error(chalk.red(`Error: Provider "${name}" not found.`));
        process.exit(1);
      }

      if (!options.yes) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
        const answer = await rl.question(chalk.yellow(`Remove provider "${name}"? (y/N) `));
        rl.close();
        if (answer.toLowerCase() !== 'y') {
          console.log(chalk.dim('Cancelled.'));
          return;
        }
      }

      removeProvider(name);
      console.log(chalk.green(`Provider "${name}" removed.`));
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- init ---
program
  .command('init')
  .description('Initialize only-cc-env and configure shell integration')
  .action(() => {
    try {
      ensureConfigDirs();

      const shell = detectShell();
      if (!shell) {
        console.error(chalk.red('Error: Could not detect shell (supported: zsh, bash, fish).'));
        process.exit(1);
      }

      console.log(chalk.dim(`Detected shell: ${shell}`));

      // Remove old config first to ensure upgrade works
      removeSourceLine(shell);
      uninstallCompletion(shell);

      const rcFile = getShellRcFile(shell);
      addSourceLine(shell);
      console.log(chalk.green(`Shell integration configured in ${rcFile}`));

      // Install completion
      const compResult = installCompletion(shell);
      if (compResult) {
        console.log(chalk.green(`Completion installed: ${compResult.file}`));
      }

      console.log(chalk.green('Initialized successfully.'));
      console.log();
      console.log(chalk.dim('Next steps:'));
      console.log(chalk.dim('  1. only-cc-env add <provider-name> -i'));
      console.log(chalk.dim('  2. only-cc-env use <provider-name>'));
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- uninit ---
program
  .command('uninit')
  .description('Remove shell integration added by init')
  .action(() => {
    try {
      const shell = detectShell();
      if (!shell) {
        console.error(chalk.red('Error: Could not detect shell (supported: zsh, bash, fish).'));
        process.exit(1);
      }

      const rcFile = getShellRcFile(shell);
      removeSourceLine(shell);
      uninstallCompletion(shell);
      console.log(chalk.green(`Shell integration removed from ${rcFile}`));
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- __complete (hidden) ---
program
  .command('__complete', { hidden: true })
  .description('Output provider names for shell completion')
  .action(() => {
    try {
      const official = detectOfficialAccount();
      if (official.loggedIn) {
        console.log(getOfficialName());
      }
      const providers = listProviders();
      for (const p of providers) {
        console.log(p.name);
      }
    } catch {
      // silent
    }
  });

// --- completion ---
program
  .command('completion')
  .description('Generate shell completion script')
  .option('-s, --shell <shell>', 'Shell type (zsh, bash, fish)')
  .action((options) => {
    try {
      const shell = options.shell || detectShell();
      if (!shell) {
        console.error(chalk.red('Error: Could not detect shell. Use --shell to specify.'));
        process.exit(1);
      }
      const script = getCompletionScript(shell);
      if (!script) {
        console.error(chalk.red(`Error: Unsupported shell: ${shell}`));
        process.exit(1);
      }
      process.stdout.write(script);
    } catch (err) {
      console.error(chalk.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

// --- helper ---
function maskValue(value) {
  if (!value) return '';
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '****' + value.slice(-4);
}

function getAllKnownKeys() {
  const keys = new Set(getEnvKeys());
  for (const p of listProviders()) {
    for (const key of Object.keys(p)) {
      if (key !== 'name') keys.add(key);
    }
  }
  return [...keys];
}

function clearProviderEnv() {
  const shell = detectShell();
  if (!shell) {
    throw new Error('Could not detect shell (supported: zsh, bash, fish)');
  }

  const allKeys = getAllKnownKeys();
  const envFile = writeEnvFile(shell, {}, allKeys);
  const { rcFile, alreadyPresent } = addSourceLine(shell);

  return { envFile, rcFile, alreadyPresent };
}

function applyProvider(name) {
  const data = getProvider(name);
  if (!data) {
    throw new Error(`Provider "${name}" not found`);
  }

  const shell = detectShell();
  if (!shell) {
    throw new Error('Could not detect shell (supported: zsh, bash, fish)');
  }

  const allKeys = getAllKnownKeys();
  const envVars = {};
  for (const key of Object.keys(data)) {
    if (data[key]) {
      envVars[key] = data[key];
    }
  }

  const envFile = writeEnvFile(shell, envVars, allKeys);
  const { rcFile, alreadyPresent } = addSourceLine(shell);

  return { envFile, rcFile, alreadyPresent };
}

program.parse();
