import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { getProvidersDir, getActiveFile, ensureConfigDirs } from './config.js';

const REQUIRED_KEYS = [
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
];

const OPTIONAL_KEYS = [
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
];

const ENV_KEYS = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

export function getEnvKeys() {
  return ENV_KEYS;
}

export function getRequiredKeys() {
  return REQUIRED_KEYS;
}

export function isRequiredKey(key) {
  return REQUIRED_KEYS.includes(key);
}

export function listProviders() {
  ensureConfigDirs();
  const dir = getProvidersDir();
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
    return { name: basename(f, '.json'), ...data };
  });
}

export function getProvider(name) {
  const file = join(getProvidersDir(), `${name}.json`);
  if (!existsSync(file)) {
    return null;
  }
  return JSON.parse(readFileSync(file, 'utf-8'));
}

export function saveProvider(name, data) {
  ensureConfigDirs();
  const file = join(getProvidersDir(), `${name}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function removeProvider(name) {
  const file = join(getProvidersDir(), `${name}.json`);
  if (!existsSync(file)) {
    throw new Error(`Provider "${name}" not found`);
  }
  unlinkSync(file);
  const active = getActiveProvider();
  if (active === name) {
    clearActiveProvider();
  }
}

export function getActiveProvider() {
  const file = getActiveFile();
  if (!existsSync(file)) {
    return null;
  }
  return readFileSync(file, 'utf-8').trim();
}

export function setActiveProvider(name, { skipCheck = false } = {}) {
  if (!skipCheck) {
    const provider = getProvider(name);
    if (!provider) {
      throw new Error(`Provider "${name}" not found`);
    }
  }
  ensureConfigDirs();
  writeFileSync(getActiveFile(), name + '\n');
}

export function clearActiveProvider() {
  const file = getActiveFile();
  if (existsSync(file)) {
    unlinkSync(file);
  }
}
