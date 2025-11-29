# zypherapp

An AI agent CLI that wraps [`@corespeed/zypher`](https://jsr.io/@corespeed/zypher) so you can run a local coding assistant with file-system tools, MCP integrations, and streaming feedback.

## Requirements

- [Deno](https://deno.com) 2.0+ with permission to `--allow-env --allow-read --allow-write --allow-run --allow-net`
- A supported model provider:
  - OpenAI: set `OPENAI_API_KEY`
  - Anthropic: set `ANTHROPIC_API_KEY`
- `git` available on your `PATH` if you want the checkpointing safety net (disable it with `--no-checkpoints`)

## Environment variables

| Name | Description |
| --- | --- |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Provider API key (or pass `--api-key`) |
| `ZYPHER_PROVIDER` | `openai` (default) or `anthropic` |
| `ZYPHER_MODEL` | Default model id (`gpt-4o-mini`, `claude-3.5-sonnet-20241022`, etc.) |
| `ZYPHER_WORKDIR` | Directory the agent should work inside (defaults to `cwd`) |
| `ZYPHER_HOME` | Home for Zypher metadata (defaults to `~/.zypher`) |
| `ZYPHER_AUTO_APPROVE` | `true`/`false` to skip tool approval prompts (dangerous) |
| `ZYPHER_DISABLE_CHECKPOINTS` | `true` to run without git checkpoints |
| `ZYPHER_MAX_ITERATIONS`, `ZYPHER_MAX_TOKENS`, `ZYPHER_TIMEOUT_MS` | Override Zypher loop config |

Any CLI flag beats the corresponding env var. Run `deno run ... main.ts --help` to see the complete list.

## Run the CLI

```bash
deno run --allow-env --allow-run --allow-read --allow-write --allow-net main.ts \
  --provider openai \
  --model gpt-4o-mini \
  --workspace .
```

That command bootstraps a Zypher agent for the current directory, registers the built-in file tools (read/write/search/copy/delete), enables terminal access (with approval prompts), and streams responses in your terminal.

### Useful flags

- `--base-url <url>` – talk to custom gateways (Azure, proxy, etc.)
- `--no-checkpoints` – skip git snapshots if you do not have git installed
- `--auto-approve-tools` / `-y` – run sensitive tools without confirmation (use with care)
- `--image-api-key <key>` – enable image generation/editing even when using Anthropic models

## Testing

```bash
deno test
```

The tests focus on the CLI configuration helpers so you can refactor confidently without invoking the full agent loop.
