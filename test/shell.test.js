import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateEnvFile } from '../lib/shell.js';

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

  it('should skip empty values', () => {
    const result = generateEnvFile('bash', {
      ANTHROPIC_AUTH_TOKEN: 'sk-test',
      ANTHROPIC_BASE_URL: '',
      ANTHROPIC_MODEL: null,
    });
    assert.ok(result.includes('ANTHROPIC_AUTH_TOKEN'));
    assert.ok(!result.includes('ANTHROPIC_BASE_URL'));
    assert.ok(!result.includes('ANTHROPIC_MODEL'));
  });
});
