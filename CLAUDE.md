# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Install deps:** `npm install`
- **Run all tests:** `npm test`
- **Run single test:** `node --test test/<name>.test.js`

## Architecture

Node.js ESM CLI tool (>=18) using Commander.js for command parsing, chalk for terminal styling, cli-table3 for table output.

**Entry point:** `bin/only-cc-env.js` — registers all commands and handles errors at the CLI boundary (try/catch + `process.exit(1)`).

**Library modules (`lib/`):**

- `config.js` — paths to config directory (`~/.config/only-cc-env/`), providers subdirectory, and active file. `ensureConfigDirs()` creates them lazily.
- `provider.js` — CRUD for provider JSON files in `~/.config/only-cc-env/providers/<name>.json`. Each file stores a subset of the 6 supported `ANTHROPIC_*` env vars. Tracks active provider via a plain text `active` file.
- `shell.js` — detects current shell (zsh/bash/fish via `$SHELL` or parent process), generates env files (`env.sh` or `env.fish`), and manages source lines in shell RC files with a `# only-cc-env` marker.

**Data flow for `use <name>`:** read provider JSON → detect shell → write env file with exports → ensure RC file sources the env file.

## Conventions

- Each CLI command's action is defined inline in `bin/only-cc-env.js`, delegating to `lib/` functions for logic.
- Interactive prompts use `node:readline/promises`.
- Token values are masked in `show` output by default (first 4 + last 4 chars).
- Tests use Node.js built-in test runner (`node:test` + `node:assert/strict`).
