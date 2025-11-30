# zypherapp

An AI agent CLI that wraps [`@corespeed/zypher`](https://jsr.io/@corespeed/zypher) so you can run a local coding assistant with file-system tools, MCP integrations, and streaming feedback.

## Requirements

- [Deno](https://deno.com) 2.0+ with permission to `--allow-env --allow-read --allow-write --allow-run --allow-net --allow-sys`
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

## Local run

1. Copy `.env` (or export the vars listed above) and set `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`, `ZYPHER_MODEL`, and any overrides you need.
2. Install dependencies (Deno will fetch them automatically) and make sure `git` is available if you want checkpoints.
3. From the repo root, run:

```bash
deno run --allow-env --allow-run --allow-read --allow-write --allow-net main.ts \
  --provider openai \
  --model gpt-4o-mini \
  --workspace .
```
or
```bash
deno task start # make sure the deno.json is correctly updated
```
```json
// deno.json, add task block
"tasks": {
"start": "deno run --allow-env --allow-run --allow-read --allow-write --allow-net --allow-sys main.ts --workspace ."
}
```

- Replace `--workspace` with the project you want the agent to operate on (absolute path recommended).
- Add `--auto-approve-tools` to skip approval prompts or `--no-checkpoints` if `git` is unavailable.
- Use the `--help` flag to discover additional knobs (timeouts, custom base URLs, etc.).

> Tip: `deno task test` or `deno test` keeps the CLI helpers honest before you ship changes.

## Docker run

1. Build the container image (runs `deno compile` and installs git for checkpoints):

```bash
docker build -t zypher-app .
```

2. Run the agent against your current directory without overwriting `/app` inside the container:

```bash
docker run -it --rm \
  --env-file ./.env \
  -e ZYPHER_HOME=/app/zypher-home \
  -e ZYPHER_AUTO_APPROVE=true \
  -v "$(pwd):/workspace" \
  zypher-app --workspace /workspace --auto-approve-tools
```

- `--env-file` injects provider keys and Zypher tuning knobs; keep secrets out of the image.
- `-v "$(pwd):/workspace"` shares your repo with the container while leaving `/app` (where the binary lives) untouched.
- `ZYPHER_HOME` points checkpoints/logs to a writable location inside the image; change it if you want them in the mounted directory.
- Remove `ZYPHER_AUTO_APPROVE`/`--auto-approve-tools` if you prefer manual confirmation for sensitive tools.

When the container starts, you will see the same interactive CLI as the local run; type your task, answer prompts if required, and use `exit` to shut it down cleanly.

## Run the CLI

```bash
deno run --allow-env --allow-run --allow-read --allow-write --allow-net main.ts \
  --provider openai \
  --model gpt-4o-mini \
  --workspace .
```
or 
```bash
deno task start # make sure the deno.json is correctly updated
```
```js
// deno.json, add task block
"tasks": {
  "start": "deno run --allow-env --allow-run --allow-read --allow-write --allow-net --allow-sys main.ts --workspace ."
}
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
