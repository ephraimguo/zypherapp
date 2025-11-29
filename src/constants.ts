export const DEFAULT_MODELS = {
    openai: "gpt-4o-mini",
    anthropic: "claude-3.5-sonnet-20241022",
} as const;

export const SENSITIVE_TOOLS = new Set(["run_terminal_cmd"]);