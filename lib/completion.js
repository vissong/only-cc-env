import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { getConfigDir } from './config.js';

export function getCompletionScript(shell) {
  switch (shell) {
    case 'zsh':
      return zshCompletion();
    case 'bash':
      return bashCompletion();
    case 'fish':
      return fishCompletion();
    default:
      return null;
  }
}

export function installCompletion(shell) {
  switch (shell) {
    case 'zsh':
      return installZshCompletion();
    case 'bash':
      return installBashCompletion();
    case 'fish':
      return installFishCompletion();
    default:
      return null;
  }
}

export function uninstallCompletion(shell) {
  const paths = {
    zsh: join(getConfigDir(), '_only-cc-env'),
    bash: join(getConfigDir(), 'only-cc-env.bash'),
    fish: join(homedir(), '.config', 'fish', 'completions', 'only-cc-env.fish'),
  };
  const file = paths[shell];
  if (file && existsSync(file)) {
    unlinkSync(file);
  }
}

function installZshCompletion() {
  const dir = getConfigDir();
  const file = join(dir, '_only-cc-env');
  writeFileSync(file, zshCompletion());
  return { file, fpathLine: `fpath=(${dir} $fpath)` };
}

function installBashCompletion() {
  const dir = getConfigDir();
  const file = join(dir, 'only-cc-env.bash');
  writeFileSync(file, bashCompletion());
  return { file };
}

function installFishCompletion() {
  const dir = join(homedir(), '.config', 'fish', 'completions');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const file = join(dir, 'only-cc-env.fish');
  writeFileSync(file, fishCompletion());
  return { file };
}

function zshCompletion() {
  return `#compdef only-cc-env

_only-cc-env() {
  local -a commands providers

  commands=(
    'add:Add a new provider configuration'
    'edit:Edit an existing provider configuration'
    'list:List all configured providers'
    'show:Show provider details'
    'use:Set the active provider'
    'remove:Remove a provider configuration'
    'init:Initialize and configure shell integration'
    'completion:Generate shell completion script'
  )

  _arguments -C \\
    '1:command:->command' \\
    '*::arg:->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case $words[1] in
        use|edit|show|remove)
          providers=(\${(f)"$(command only-cc-env __complete 2>/dev/null)"})
          _describe 'provider' providers
          ;;
      esac
      ;;
  esac
}

compdef _only-cc-env only-cc-env
`;
}

function bashCompletion() {
  return `# bash completion for only-cc-env

_only_cc_env() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="add edit list show use remove init completion"

  case "\${COMP_WORDS[1]}" in
    use|edit|show|remove)
      local providers
      providers="$(command only-cc-env __complete 2>/dev/null)"
      COMPREPLY=( $(compgen -W "\${providers}" -- "\${cur}") )
      return 0
      ;;
  esac

  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    return 0
  fi
}

complete -F _only_cc_env only-cc-env
`;
}

function fishCompletion() {
  return `# fish completion for only-cc-env

# Disable file completions
complete -c only-cc-env -f

# Commands
complete -c only-cc-env -n '__fish_use_subcommand' -a add -d 'Add a new provider configuration'
complete -c only-cc-env -n '__fish_use_subcommand' -a edit -d 'Edit an existing provider configuration'
complete -c only-cc-env -n '__fish_use_subcommand' -a list -d 'List all configured providers'
complete -c only-cc-env -n '__fish_use_subcommand' -a show -d 'Show provider details'
complete -c only-cc-env -n '__fish_use_subcommand' -a use -d 'Set the active provider'
complete -c only-cc-env -n '__fish_use_subcommand' -a remove -d 'Remove a provider configuration'
complete -c only-cc-env -n '__fish_use_subcommand' -a init -d 'Initialize and configure shell integration'
complete -c only-cc-env -n '__fish_use_subcommand' -a completion -d 'Generate shell completion script'

# Provider name completions for use/edit/show/remove
complete -c only-cc-env -n '__fish_seen_subcommand_from use edit show remove' -a '(command only-cc-env __complete 2>/dev/null)'
`;
}
