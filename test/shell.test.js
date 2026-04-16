import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateEnvFile, getSourceLine } from '../lib/shell.js';

describe('generateEnvFile', () => {
  it('should generate bash/zsh export lines', () => {
    const result = generateEnvFile('zsh', {
      ANTHROPIC_AUTH_TOKEN: 'sk-test',
      ANTHROPIC_BASE_URL: 'https://example.com',
    });
    assert.ok(result.includes('export ANTHROPIC_AUTH_TOKEN="sk-test"'));
    assert.ok(result.includes('export ANTHROPIC_BASE_URL="https://example.com"'));
  });

  it('should generate fish set lines', () => {
    const result = generateEnvFile('fish', {
      ANTHROPIC_AUTH_TOKEN: 'sk-test',
      ANTHROPIC_BASE_URL: 'https://example.com',
    });
    assert.ok(result.includes('set -gx ANTHROPIC_AUTH_TOKEN "sk-test"'));
    assert.ok(result.includes('set -gx ANTHROPIC_BASE_URL "https://example.com"'));
  });

  it('should unset empty values when allKeys provided', () => {
    const allKeys = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_MODEL'];
    const result = generateEnvFile('bash', {
      ANTHROPIC_AUTH_TOKEN: 'sk-test',
    }, allKeys);
    assert.ok(result.includes('export ANTHROPIC_AUTH_TOKEN="sk-test"'));
    assert.ok(result.includes('unset ANTHROPIC_BASE_URL'));
    assert.ok(result.includes('unset ANTHROPIC_MODEL'));
  });

  it('should unset with set -e in fish', () => {
    const allKeys = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL'];
    const result = generateEnvFile('fish', {
      ANTHROPIC_AUTH_TOKEN: 'sk-test',
    }, allKeys);
    assert.ok(result.includes('set -gx ANTHROPIC_AUTH_TOKEN "sk-test"'));
    assert.ok(result.includes('set -e ANTHROPIC_BASE_URL'));
  });
});

describe('getSourceLine', () => {
  it('should include start and end markers for zsh', () => {
    const result = getSourceLine('zsh');
    assert.ok(result.startsWith('# only-cc-env'));
    assert.ok(result.endsWith('# /only-cc-env'));
  });

  it('should include start and end markers for bash', () => {
    const result = getSourceLine('bash');
    assert.ok(result.startsWith('# only-cc-env'));
    assert.ok(result.endsWith('# /only-cc-env'));
  });

  it('should include start and end markers for fish', () => {
    const result = getSourceLine('fish');
    assert.ok(result.startsWith('# only-cc-env'));
    assert.ok(result.endsWith('# /only-cc-env'));
  });

  it('should include both only-cc-env and ccenv functions for zsh', () => {
    const result = getSourceLine('zsh');
    assert.ok(result.includes('only-cc-env() {'));
    assert.ok(result.includes('ccenv() {'));
  });
});
