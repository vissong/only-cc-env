import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { getConfigDir } from './config.js';

const SOURCE_MARKER = '# only-cc-env';

export function detectShell() {
  const shell = process.env.SHELL || '';
  if (shell.endsWith('/zsh')) return 'zsh';
  if (shell.endsWith('/bash')) return 'bash';
  if (shell.endsWith('/fish')) return 'fish';

  // fallback: check running parent process
  try {
    const ppid = process.ppid;
    const parentCmd = execSync(`ps -p ${ppid} -o comm=`, { encoding: 'utf-8' }).trim();
    if (parentCmd.includes('zsh')) return 'zsh';
    if (parentCmd.includes('bash')) return 'bash';
    if (parentCmd.includes('fish')) return 'fish';
  } catch {
    // ignore
  }

  return null;
}

export function getShellRcFile(shell) {
  const home = homedir();
  switch (shell) {
    case 'zsh':
      return join(home, '.zshrc');
    case 'bash':
      // prefer .bashrc, fall back to .bash_profile on macOS
      if (existsSync(join(home, '.bashrc'))) return join(home, '.bashrc');
      return join(home, '.bash_profile');
    case 'fish':
      return join(home, '.config', 'fish', 'config.fish');
    default:
      return null;
  }
}

export function getEnvFilePath(shell) {
  const configDir = getConfigDir();
  if (shell === 'fish') {
    return join(configDir, 'env.fish');
  }
  return join(configDir, 'env.sh');
}

export function generateEnvFile(shell, envVars) {
  const lines = [];
  if (shell === 'fish') {
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        lines.push(`set -gx ${key} "${value}"`);
      }
    }
  } else {
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        lines.push(`export ${key}="${value}"`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

export function writeEnvFile(shell, envVars) {
  const filePath = getEnvFilePath(shell);
  const content = generateEnvFile(shell, envVars);
  writeFileSync(filePath, content);
  return filePath;
}

export function getSourceLine(shell) {
  const envFile = getEnvFilePath(shell);
  if (shell === 'fish') {
    return `${SOURCE_MARKER}\nif test -f "${envFile}"\n    source "${envFile}"\nend`;
  }
  return `${SOURCE_MARKER}\n[ -f "${envFile}" ] && source "${envFile}"`;
}

export function isSourceLinePresent(rcFile) {
  if (!existsSync(rcFile)) return false;
  const content = readFileSync(rcFile, 'utf-8');
  return content.includes(SOURCE_MARKER);
}

export function addSourceLine(shell) {
  const rcFile = getShellRcFile(shell);
  if (!rcFile) {
    throw new Error(`Cannot determine RC file for shell: ${shell}`);
  }
  if (isSourceLinePresent(rcFile)) {
    return { rcFile, alreadyPresent: true };
  }
  const sourceLine = getSourceLine(shell);
  appendFileSync(rcFile, '\n' + sourceLine + '\n');
  return { rcFile, alreadyPresent: false };
}

export function removeSourceLine(shell) {
  const rcFile = getShellRcFile(shell);
  if (!rcFile || !existsSync(rcFile)) return;
  const content = readFileSync(rcFile, 'utf-8');
  if (!content.includes(SOURCE_MARKER)) return;

  // Remove the source block (marker line + the following source/if block)
  const lines = content.split('\n');
  const filtered = [];
  let skip = false;
  for (const line of lines) {
    if (line.trim() === SOURCE_MARKER.trim()) {
      skip = true;
      continue;
    }
    if (skip) {
      // skip lines that are part of the source block
      if (shell === 'fish') {
        if (line.trim() === 'end') {
          skip = false;
          continue;
        }
      } else {
        // for bash/zsh it's a single line after the marker
        skip = false;
        continue;
      }
      continue;
    }
    filtered.push(line);
  }
  writeFileSync(rcFile, filtered.join('\n'));
}
