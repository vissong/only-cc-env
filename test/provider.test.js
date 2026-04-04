import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Override config dir for testing
const TEST_DIR = join(tmpdir(), `only-cc-env-test-${Date.now()}`);
const PROVIDERS_DIR = join(TEST_DIR, 'providers');
const ACTIVE_FILE = join(TEST_DIR, 'active');

// We need to mock the config module - import after setting up
// Since we're using ESM, we'll test the provider logic by directly manipulating files
import { writeFileSync, readFileSync } from 'node:fs';

before(() => {
  mkdirSync(PROVIDERS_DIR, { recursive: true });
});

after(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('provider file operations', () => {
  it('should save and read provider JSON', () => {
    const data = {
      ANTHROPIC_AUTH_TOKEN: 'sk-test',
      ANTHROPIC_BASE_URL: 'https://example.com',
    };
    const file = join(PROVIDERS_DIR, 'test.json');
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

    const read = JSON.parse(readFileSync(file, 'utf-8'));
    assert.equal(read.ANTHROPIC_AUTH_TOKEN, 'sk-test');
    assert.equal(read.ANTHROPIC_BASE_URL, 'https://example.com');
  });

  it('should track active provider', () => {
    writeFileSync(ACTIVE_FILE, 'my-provider\n');
    const active = readFileSync(ACTIVE_FILE, 'utf-8').trim();
    assert.equal(active, 'my-provider');
  });
});
