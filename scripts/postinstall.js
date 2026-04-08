#!/usr/bin/env node

// Re-run shell integration on upgrade so new wrapper functions take effect.

import { detectShell, removeSourceLine, addSourceLine } from '../lib/shell.js';
import { ensureConfigDirs } from '../lib/config.js';
import { installCompletion, uninstallCompletion } from '../lib/completion.js';

try {
  const shell = detectShell();
  if (!shell) process.exit(0);

  ensureConfigDirs();
  removeSourceLine(shell);
  addSourceLine(shell);

  uninstallCompletion(shell);
  installCompletion(shell);
} catch {
  // never fail the install
}
