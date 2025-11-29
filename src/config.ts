import { resolve } from "jsr:@std/path@^1.1.3";
import { DEFAULT_MODELS } from "./constants.ts";

export type ProviderName = keyof typeof DEFAULT_MODELS;

export interface CliFlags {
    provider?: string;
    model?: string;
    baseUrl?: string;
    workspace?: string;
    zypherHome?: string;
    userId?: string;
    apiKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    imageApiKey?: string;
    disableCheckpoints?: boolean;
    autoApproveTools?: boolean;
    maxIterations?: number;
    maxTokens?: number;
    taskTimeoutMs?: number;
    showHelp?: boolean;
}

export interface RuntimeConfig {
    provider: ProviderName;
    model: string;
    apiKey: string;
    workspace: string;
    baseUrl?: string;
    zypherHome?: string;
    userId?: string;
    imageApiKey?: string;
    disableCheckpoints: boolean;
    autoApproveTools: boolean;
    maxIterations?: number;
    maxTokens?: number;
    taskTimeoutMs?: number;
}

export function parseCliArgs(args: string[]): CliFlags {
    const flags: CliFlags = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--") {
            break;
        }

        const readValue = (name: string): string => {
            if (i + 1 >= args.length) {
                throw new Error(`Missing value for ${name}`);
            }
            return args[++i];
        };

        switch (arg) {
            case "-p":
            case "--provider":
                flags.provider = readValue(arg);
                break;
            case "-m":
            case "--model":
                flags.model = readValue(arg);
                break;
            case "-w":
            case "--workspace":
                flags.workspace = readValue(arg);
                break;
            case "--base-url":
                flags.baseUrl = readValue(arg);
                break;
            case "--api-key":
                flags.apiKey = readValue(arg);
                break;
            case "--openai-api-key":
                flags.openaiApiKey = readValue(arg);
                break;
            case "--anthropic-api-key":
                flags.anthropicApiKey = readValue(arg);
                break;
            case "--image-api-key":
                flags.imageApiKey = readValue(arg);
                break;
            case "--zypher-home":
                flags.zypherHome = readValue(arg);
                break;
            case "--user-id":
                flags.userId = readValue(arg);
                break;
            case "--max-iterations":
                flags.maxIterations = parsePositiveInteger(
                    readValue(arg),
                    "max-iterations",
                );
                break;
            case "--max-tokens":
                flags.maxTokens = parsePositiveInteger(
                    readValue(arg),
                    "max-tokens",
                );
                break;
            case "--task-timeout":
                flags.taskTimeoutMs = parseNonNegativeInteger(
                    readValue(arg),
                    "task-timeout",
                );
                break;
            case "--auto-approve-tools":
            case "-y":
            case "--yes":
                flags.autoApproveTools = true;
                break;
            case "--no-checkpoints":
                flags.disableCheckpoints = true;
                break;
            case "-h":
            case "--help":
                flags.showHelp = true;
                break;
            default:
                if (arg.startsWith("-")) {
                    throw new Error(`Unknown option: ${arg}`);
                } else {
                    throw new Error(
                        `Unexpected positional argument "${arg}". This CLI is interactive so no positional arguments are supported.`,
                    );
                }
        }
    }

    return flags;
}

export function buildRuntimeConfig(
    cliFlags: CliFlags,
    env: Record<string, string> = Deno.env.toObject(),
): RuntimeConfig {
    const provider = normalizeProvider(
        cliFlags.provider ?? env.ZYPHER_PROVIDER ?? "openai",
    );

    const workspace = resolvePath(
        cliFlags.workspace ?? env.ZYPHER_WORKDIR ?? Deno.cwd(),
        env,
    );

    const zypherHome = cliFlags.zypherHome
        ? resolvePath(cliFlags.zypherHome, env)
        : env.ZYPHER_HOME
            ? resolvePath(env.ZYPHER_HOME, env)
            : undefined;

    const model = cliFlags.model ?? env.ZYPHER_MODEL ?? DEFAULT_MODELS[provider];
    const userId = cliFlags.userId ?? env.ZYPHER_USER_ID;
    const baseUrl = cliFlags.baseUrl ?? env.ZYPHER_BASE_URL ??
        (provider === "openai" ? env.OPENAI_BASE_URL : env.ANTHROPIC_BASE_URL);

    const disableCheckpoints = cliFlags.disableCheckpoints ??
        parseBool(env.ZYPHER_DISABLE_CHECKPOINTS) ?? false;
    const autoApproveTools = cliFlags.autoApproveTools ??
        parseBool(env.ZYPHER_AUTO_APPROVE) ?? false;

    const maxIterations = cliFlags.maxIterations ??
        parseOptionalPositive(env.ZYPHER_MAX_ITERATIONS, "ZYPHER_MAX_ITERATIONS");
    const maxTokens = cliFlags.maxTokens ??
        parseOptionalPositive(env.ZYPHER_MAX_TOKENS, "ZYPHER_MAX_TOKENS");
    const taskTimeoutMs = cliFlags.taskTimeoutMs ??
        parseOptionalNonNegative(env.ZYPHER_TIMEOUT_MS, "ZYPHER_TIMEOUT_MS");

    const apiKey = resolveApiKey(provider, cliFlags, env);

    const imageApiKey = cliFlags.imageApiKey ??
        env.ZYPHER_IMAGE_API_KEY ??
        (provider === "openai"
            ? apiKey
            : env.OPENAI_API_KEY ?? cliFlags.openaiApiKey);

    return {
        provider,
        model,
        apiKey,
        workspace,
        baseUrl,
        zypherHome,
        userId,
        imageApiKey,
        disableCheckpoints,
        autoApproveTools,
        maxIterations,
        maxTokens,
        taskTimeoutMs,
    };
}

function normalizeProvider(value: string): ProviderName {
    const normalized = value.toLowerCase();
    if (normalized === "openai" || normalized === "anthropic") {
        return normalized;
    }

    throw new Error(
        `Unsupported provider "${value}". Supported providers: openai, anthropic.`,
    );
}

function parseBool(value?: string): boolean | undefined {
    if (value === undefined) {
        return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }
    return ["1", "true", "yes", "y", "on"].includes(normalized);
}

function parsePositiveInteger(raw: string, flag: string): number {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Expected ${flag} to be a positive integer. Got "${raw}".`);
    }
    return parsed;
}

function parseNonNegativeInteger(raw: string, flag: string): number {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(
            `Expected ${flag} to be a non-negative integer. Got "${raw}".`,
        );
    }
    return parsed;
}

function parseOptionalPositive(
    value: string | undefined,
    label: string,
): number | undefined {
    if (value === undefined) return undefined;
    return parsePositiveInteger(value, label);
}

function parseOptionalNonNegative(
    value: string | undefined,
    label: string,
): number | undefined {
    if (value === undefined) return undefined;
    return parseNonNegativeInteger(value, label);
}

function resolvePath(pathValue: string, env: Record<string, string>): string {
    if (pathValue.startsWith("~/")) {
        const homeDir = env.HOME ?? env.USERPROFILE;
        if (!homeDir) {
            throw new Error("Cannot resolve '~' because HOME is not set.");
        }
        return resolve(homeDir, pathValue.slice(2));
    }

    return resolve(pathValue);
}

function resolveApiKey(
    provider: ProviderName,
    flags: CliFlags,
    env: Record<string, string>,
): string {
    const generalKey = flags.apiKey ?? env.ZYPHER_API_KEY;
    if (provider === "openai") {
        const key = generalKey ?? flags.openaiApiKey ?? env.OPENAI_API_KEY;
        if (key) return key;
    } else {
        const key = generalKey ?? flags.anthropicApiKey ?? env.ANTHROPIC_API_KEY;
        if (key) return key;
    }

    throw new Error(
        `Missing API key for provider "${provider}". Set ${
            provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"
        }, ZYPHER_API_KEY, or pass --api-key.`,
    );
}
