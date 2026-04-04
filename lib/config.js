import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.config', 'only-cc-env');
const PROVIDERS_DIR = join(CONFIG_DIR, 'providers');
const ACTIVE_FILE = join(CONFIG_DIR, 'active');

export function getConfigDir() {
  return CONFIG_DIR;
}

export function getProvidersDir() {
  return PROVIDERS_DIR;
}

export function getActiveFile() {
  return ACTIVE_FILE;
}

export function ensureConfigDirs() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!existsSync(PROVIDERS_DIR)) {
    mkdirSync(PROVIDERS_DIR, { recursive: true });
  }
}
