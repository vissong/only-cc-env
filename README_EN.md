# only-cc-env

[中文](./README.md)

Manage environment variables for multiple Claude Code compatible API providers. Switch between providers with a single command.

## Why

More and more third-party providers offer Claude API compatible services. Using them requires manually setting `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, and other environment variables. Switching between multiple providers is tedious.

only-cc-env saves each provider's config as a separate file and lets you switch with one command.

## Safety Promise

**only-cc-env never reads or modifies any Claude configuration files.**

It only does two things:
1. Manages provider configs under `~/.config/only-cc-env/`
2. Adds a single `source` line to your shell config (e.g. `.zshrc`) to load environment variables

It does not touch `~/.claude/`, Claude's settings, authentication, or session data.

## Install

```bash
npm install -g only-cc-env --registry https://registry.npmjs.org
```

After installation, both `only-cc-env` and the short alias `ccenv` are available — they are identical. The examples below use `ccenv`, but you can use `only-cc-env` interchangeably.

## Quick Start

```bash
# 1. Initialize (detect shell and set up auto-loading)
ccenv init

# 2. Add a provider (interactive)
ccenv add kimi
# ANTHROPIC_AUTH_TOKEN *: sk-xxx
# ANTHROPIC_BASE_URL *: https://api.kimi.com/coding/
# ANTHROPIC_MODEL (optional):
# ...

# 3. Switch to that provider (env vars apply automatically)
ccenv use kimi
```

## Commands

### `init`

Initialize the tool. Auto-detects your shell (zsh / bash / fish) and adds environment variable loading to the corresponding config file.

### `add <name>`

Add a new provider. Without options, enters interactive mode — fields marked with `*` are required.

You can also pass options directly:

```bash
only-cc-env add my-provider \
  --auth-token "sk-xxx" \
  --base-url "https://api.example.com"
```

### `edit <name>`

Edit an existing provider. Without options, enters interactive mode. Press Enter to keep current values.

### `list`

List all providers. If a Claude official account is detected as logged in, it appears as the first row.

```
┌───┬────────────────────────────────┬──────────────────────────────┬───────┐
│   │ Name                           │ Base URL                     │ Model │
├───┼────────────────────────────────┼──────────────────────────────┼───────┤
│ * │ official (user@example.com)    │ api.anthropic.com            │ -     │
├───┼────────────────────────────────┼──────────────────────────────┼───────┤
│   │ kimi                           │ https://api.kimi.com/coding/ │ -     │
└───┴────────────────────────────────┴──────────────────────────────┴───────┘
```

Use `--json` for JSON output.

### `show [name]`

Show provider details. Defaults to the active provider. Sensitive values are masked by default — use `--unmask` to reveal.

### `use <name>`

Switch the active provider. Thanks to the shell wrapper function installed by `init`, environment variables take effect immediately in the current session.

`use official` clears all custom environment variables, falling back to the official Claude account.

### `remove <name>`

Remove a provider. Use `-y` to skip confirmation.

## Managed Environment Variables

The following predefined variables are prompted during interactive `add`:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_AUTH_TOKEN` | Yes | API authentication token |
| `ANTHROPIC_BASE_URL` | Yes | API base URL |
| `ANTHROPIC_MODEL` | No | Default model |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | No | Default Sonnet model |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | No | Default Opus model |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | No | Default Haiku model |

### Custom Environment Variables

Beyond the predefined variables above, you can edit `~/.config/only-cc-env/providers/<name>.json` directly to add any custom environment variables:

```json
{
  "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
  "ANTHROPIC_BASE_URL": "https://api.example.com",
  "MY_CUSTOM_VAR": "some-value"
}
```

When switching with `use`, all fields in the JSON are exported as environment variables. When switching to another provider or `official`, the previous provider's custom variables are automatically `unset`.

## Config File Locations

```
~/.config/only-cc-env/
├── providers/          # Provider configs (one JSON file each)
│   ├── kimi.json
│   └── other.json
├── active              # Currently active provider name
└── env.sh              # Generated env file (or env.fish)
```

## Local Development

```bash
# Install dependencies
npm install

# Run the entry file directly
node bin/only-cc-env.js list

# Or use npm link to create a global symlink
npm link
ccenv list
# Clean up when done: npm unlink -g only-cc-env

# Run tests
npm test
```

## License

MIT
