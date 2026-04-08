import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { getConfigDir } from './config.js';

const SOURCE_MARKER = '# only-cc-env';
const COMMAND_NAMES = ['only-cc-env', 'ccenv'];

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

export function generateEnvFile(shell, envVars, allKeys) {
  const lines = [];
  const keys = allKeys || Object.keys(envVars);
  if (shell === 'fish') {
    for (const key of keys) {
      const value = envVars[key];
      if (value) {
        lines.push(`set -gx ${key} "${value}"`);
      } else {
        lines.push(`set -e ${key}`);
      }
    }
  } else {
    for (const key of keys) {
      const value = envVars[key];
      if (value) {
        lines.push(`export ${key}="${value}"`);
      } else {
        lines.push(`unset ${key}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

export function writeEnvFile(shell, envVars, allKeys) {
  const filePath = getEnvFilePath(shell);
  const content = generateEnvFile(shell, envVars, allKeys);
  writeFileSync(filePath, content);
  return filePath;
}

export function getSourceLine(shell) {
  const envFile = getEnvFilePath(shell);
  if (shell === 'fish') {
    const lines = [
      SOURCE_MARKER,
      `if test -f "${envFile}"`,
      `    source "${envFile}"`,
      `end`,
    ];
    for (const name of COMMAND_NAMES) {
      lines.push(
        `function ${name}`,
        `    command only-cc-env $argv`,
        `    if test "$argv[1]" = "use"`,
        `        test -f "${envFile}"; and source "${envFile}"`,
        `    end`,
        `end`,
      );
    }
    return lines.join('\n');
  }
  const configDir = getConfigDir();
  const compFile = shell === 'zsh'
    ? join(configDir, '_only-cc-env')
    : join(configDir, 'only-cc-env.bash');
  const lines = [
    SOURCE_MARKER,
    `[ -f "${envFile}" ] && source "${envFile}"`,
    `[ -f "${compFile}" ] && source "${compFile}"`,
  ];
  for (const name of COMMAND_NAMES) {
    lines.push(
      `${name}() {`,
      `  command only-cc-env "$@"`,
      `  if [ "$1" = "use" ]; then`,
      `    [ -f "${envFile}" ] && source "${envFile}"`,
      `  fi`,
      `}`,
    );
  }
  return lines.join('\n');
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

  // Remove the entire block from marker to the closing brace/end
  const lines = content.split('\n');
  const filtered = [];
  let skip = false;
  for (const line of lines) {
    if (line.trim() === SOURCE_MARKER.trim()) {
      skip = true;
      continue;
    }
    if (skip) {
      if (shell === 'fish') {
        // fish block ends with a standalone 'end' (the function's end)
        if (line.trim() === 'end') {
          // Check if next non-empty content is still part of our block
          // We have two 'end' keywords (if-end and function-end), skip both
          continue;
        }
        // skip lines that are part of the block
        const t = line.trim();
        if (t.startsWith('source ') || t.startsWith('if ') ||
            t.startsWith('test ') || t.startsWith('command only-cc-env') || t === '' ||
            COMMAND_NAMES.some(n => t === `function ${n}`)) {
          continue;
        }
        skip = false;
      } else {
        // bash/zsh: block ends with '}'
        if (line.trim() === '}') {
          skip = false;
          continue;
        }
        continue;
      }
    }
    filtered.push(line);
  }
  writeFileSync(rcFile, filtered.join('\n'));
}
