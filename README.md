# only-cc-env

[English](./README_EN.md)

管理多个 Claude Code 兼容 API 供应商的环境变量，在不同供应商之间快速切换。

## 为什么需要这个工具

越来越多的第三方供应商提供了兼容 Claude API 的服务。使用这些服务时，你需要手动设置 `ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN` 等环境变量。当你有多个供应商时，来回切换非常麻烦。

only-cc-env 帮你把每个供应商的配置保存为独立文件，一条命令即可切换。

## 安全承诺

**only-cc-env 不会读取或修改 Claude 的任何配置文件。**

它只做两件事：
1. 在 `~/.config/only-cc-env/` 目录下管理供应商配置
2. 在你的 shell 配置文件（如 `.zshrc`）中添加一行 `source` 语句来加载环境变量

不碰 `~/.claude/`，不碰 Claude 的设置、认证、会话数据。

## 安装

```bash
npm install -g only-cc-env
```

## 快速开始

```bash
# 1. 初始化（检测 shell 并配置自动加载）
only-cc-env init

# 2. 添加供应商（交互式）
only-cc-env add kimi
# ANTHROPIC_AUTH_TOKEN *: sk-xxx
# ANTHROPIC_BASE_URL *: https://api.kimi.com/coding/
# ANTHROPIC_MODEL (optional):
# ...

# 3. 切换到该供应商
only-cc-env use kimi

# 4. 在当前终端生效
source ~/.config/only-cc-env/env.sh
```

## 命令

### `init`

初始化工具，自动检测 shell 类型（zsh / bash / fish），在对应的配置文件中添加环境变量加载语句。

### `add <name>`

添加新的供应商配置。不带选项时进入交互模式，带 `*` 标记的为必填项。

也可以通过选项直接指定：

```bash
only-cc-env add my-provider \
  --auth-token "sk-xxx" \
  --base-url "https://api.example.com"
```

### `edit <name>`

编辑已有的供应商配置。不带选项时进入交互模式，回车跳过的字段保持原值。

### `list`

列出所有供应商。如果检测到 Claude 官方账号已登录，会自动在列表首行显示。

```
┌───┬────────────────────────────────┬──────────────────────────────┬───────┐
│   │ Name                           │ Base URL                     │ Model │
├───┼────────────────────────────────┼──────────────────────────────┼───────┤
│ * │ official (user@example.com)    │ api.anthropic.com            │ -     │
├───┼────────────────────────────────┼──────────────────────────────┼───────┤
│   │ kimi                           │ https://api.kimi.com/coding/ │ -     │
└───┴────────────────────────────────┴──────────────────────────────┴───────┘
```

支持 `--json` 输出 JSON 格式。

### `show [name]`

查看供应商详情，默认显示当前激活的供应商。Token 等敏感值默认脱敏，加 `--unmask` 显示完整值。

### `use <name>`

切换当前激活的供应商。切换后需要 `source` 环境变量文件或开启新终端才能在当前会话中生效。

`use official` 会清除所有自定义环境变量，回退到 Claude 官方账号。

### `remove <name>`

删除供应商配置。`-y` 跳过确认。

## 管理的环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `ANTHROPIC_AUTH_TOKEN` | 是 | API 认证令牌 |
| `ANTHROPIC_BASE_URL` | 是 | API 基础地址 |
| `ANTHROPIC_MODEL` | 否 | 默认模型 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 否 | 默认 Sonnet 模型 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 否 | 默认 Opus 模型 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 否 | 默认 Haiku 模型 |

## 配置文件位置

```
~/.config/only-cc-env/
├── providers/          # 供应商配置（每个一个 JSON 文件）
│   ├── kimi.json
│   └── other.json
├── active              # 当前激活的供应商名
└── env.sh              # 生成的环境变量文件（或 env.fish）
```

## License

MIT
