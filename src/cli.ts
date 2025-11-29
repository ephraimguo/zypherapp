import {
    AnthropicModelProvider,
    CheckpointManager,
    OpenAIModelProvider,
    ToolExecutionInterceptor,
    ZypherAgent,
    type ZypherAgentOptions,
    createZypherContext,
    printMessage,
} from "@corespeed/zypher";
import type { RuntimeConfig } from "./config.ts";
import { SENSITIVE_TOOLS } from "./constants.ts";
import { registerDefaultTools } from "./tools.ts";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
// deno-lint-ignore no-import-prefix
import chalk from "npm:chalk@5.6.2";
// deno-lint-ignore no-import-prefix
import {eachValueFrom} from "npm:rxjs-for-await@1.0.0"; // todo

type Prompt = {
    ask: (question: string) => Promise<string>;
    close: () => void;
};

export async function startCli(config: RuntimeConfig): Promise<void> {
    const contextOptions: Parameters<typeof createZypherContext>[1] = {};
    if (config.zypherHome) {
        contextOptions.zypherDir = config.zypherHome;
    }
    if (config.userId) {
        contextOptions.userId = config.userId;
    }

    const context = await createZypherContext(
        config.workspace,
        contextOptions,
    );

    const provider = config.provider === "openai"
        ? new OpenAIModelProvider({
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
        })
        : new AnthropicModelProvider({
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
        });

    const overrides: ZypherAgentOptions["config"] = {};
    if (config.maxIterations !== undefined) {
        overrides.maxIterations = config.maxIterations;
    }
    if (config.maxTokens !== undefined) {
        overrides.maxTokens = config.maxTokens;
    }
    if (config.taskTimeoutMs !== undefined) {
        overrides.taskTimeoutMs = config.taskTimeoutMs;
    }

    const agent = new ZypherAgent(context, provider, {
        checkpointManager: config.disableCheckpoints
            ? undefined
            : new CheckpointManager(context),
        config: Object.keys(overrides).length ? overrides : undefined,
    });

    await registerDefaultTools(agent, config);

    const prompt:Prompt = createCliPrompt()

    agent.loopInterceptor.unregister("tool-execution");
    agent.loopInterceptor.register(
      new ToolExecutionInterceptor(
        agent.mcp,
        (name, args, options) => handleToolApproval(name, args, config, prompt.ask, options?.signal)
      )
    );

    try {
        await runInteractiveLoop(agent, config, prompt);
    } finally {
        prompt.close();
    }
}

async function runInteractiveLoop(
    agent: ZypherAgent,
    config: RuntimeConfig,
    prompt: Prompt,
): Promise<void> {
    console.log(chalk.bold("\n+++ Welcome to Zypher Agent CLI +++\n"));
    console.log(`Provider:  ${config.provider}`);
    console.log(`Model:     ${config.model}`);
    console.log(`Workspace: ${config.workspace}\n`);

    const textEncoder = new TextEncoder();

    while(true) {
        // todo
        const task:string = (await prompt.ask(`Enter your task (or type exit): `)).trim();

        if (!task) {
            continue
        }

        if (task.toLowerCase() === "exit") {
            console.log("Goodbye!");
            break;
        }

        console.log(`\nStarting task execution...\n`);
        try {
            // todo
            const taskEvents = agent.runTask(task, config.model);
            let isStreamText = true;
            let cancelled = false;

            // todo
            for await (const event of eachValueFrom(taskEvents)) {
                if (isStreamText && event.type !== "text") {
                    await Deno.stdout.write(textEncoder.encode("\n"));
                    isStreamText = false;
                }

                if (event.type === "text") {
                    if (!isStreamText) {
                        await Deno.stdout.write(textEncoder.encode(chalk.blue("Agent: ")))
                        isStreamText = true;
                    }
                    await Deno.stdout.write(textEncoder.encode(event.content));
                } else if (event.type === "message") {
                    printMessage(event.message);
                    await Deno.stdout.write(textEncoder.encode("\n"));

                } else if (event.type === "tool_use") {
                    console.log(chalk.yellow(`\nUsing tool: ${event.toolName}`));

                } else if (event.type === "tool_use_input") {
                    await Deno.stdout.write(textEncoder.encode(event.partialInput));

                } else if (event.type === "cancelled") {
                    cancelled = true;
                    console.log("\nTask cancelled: ", event.reason, "\n");

                }
            }

            if (isStreamText) {
                await Deno.stdout.write(textEncoder.encode("\n"));
            }

            await Deno.stdout.write(textEncoder.encode("\n\n"));
            if (!cancelled) {
                console.log(chalk.green("Task completed successfully!\n"));
            }
        } catch(err) {
            console.error(chalk.red("\nError: ", formatError(err)));
            console.log("\nReady for next task...\n");
        }
    }
}

function createCliPrompt(): Prompt {
    const rl = readline.createInterface({
        input: stdin,
        output: stdout,
    });
    return {
        ask: (question: string): Promise<string> => rl.question(question),
        close: () => rl.close()
    };
}

async function handleToolApproval(
    name: string,
    parameters: Record<string, unknown>,
    config: RuntimeConfig,
    ask: Prompt["ask"],
    signal?: AbortSignal,
): Promise<boolean> {
    if (config.autoApproveTools) return true;
    if (!shouldPromptForApproval(name, parameters)) return true;

    console.log(
        chalk.red(
            `\n++++ Tool "${name}" requested approval with parameters:\n${
                JSON.stringify(parameters, null, 2)
            }\n`,
        )
    );

    while (!signal?.aborted) {
        const answer = (await ask("Approve tool execution? (y/N): "))
            .trim()
            .toLowerCase();
        if (answer === "y" || answer === "yes") return true;
        if (answer === "n" || answer === "no" || answer === "") return false;
    }

    return false;
}

export function shouldPromptForApproval(
    name: string,
    parameters: Record<string, unknown>,
): boolean {
    if ("requireUserApproval" in parameters) {
        return Boolean(parameters.requireUserApproval);
    }

    return SENSITIVE_TOOLS.has(name);
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function printHelp(): void {
    console.log(`Zypher CLI

Usage:
  deno run --allow-env --allow-run --allow-read --allow-write --allow-net main.ts [options]

Options:
  -p, --provider <openai|anthropic>   Choose the LLM provider (default: openai)
  -m, --model <id>                    Override the model id
  -w, --workspace <path>              Directory the agent should operate in
      --base-url <url>                Custom API base URL
      --api-key <key>                 Provider API key (or use provider-specific env)
      --openai-api-key <key>          OpenAI API key override
      --anthropic-api-key <key>       Anthropic API key override
      --image-api-key <key>           API key for image tools (defaults to OpenAI key)
      --zypher-home <path>            Override ~/.zypher directory
      --user-id <id>                  User identifier for telemetry/logging
      --max-iterations <n>            Limit agent loops
      --max-tokens <n>                Override Zypher max tokens
      --task-timeout <ms>             Override task timeout in milliseconds
      --auto-approve-tools, -y        Skip approval prompts (dangerous)
      --no-checkpoints                Disable git-based checkpoints
  -h, --help                          Show this help message

Environment shortcuts:
  OPENAI_API_KEY / ANTHROPIC_API_KEY  Provider keys
  ZYPHER_PROVIDER, ZYPHER_MODEL, ZYPHER_WORKDIR, ZYPHER_BASE_URL, ZYPHER_AUTO_APPROVE, ZYPHER_DISABLE_CHECKPOINTS, ZYPHER_MAX_ITERATIONS, ZYPHER_MAX_TOKENS, ZYPHER_TIMEOUT_MS`);
}
