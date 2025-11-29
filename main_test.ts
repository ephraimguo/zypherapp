import { assertEquals, assertThrows } from "@std/assert";
import { buildRuntimeConfig, parseCliArgs } from "./main.ts";

Deno.test("parseCliArgs reads numeric and boolean flags", () => {
  const flags = parseCliArgs([
    "-p",
    "anthropic",
    "--max-iterations",
    "5",
    "--max-tokens",
    "1024",
    "--task-timeout",
    "0",
    "--auto-approve-tools",
    "--no-checkpoints",
  ]);

  assertEquals(flags.provider, "anthropic");
  assertEquals(flags.maxIterations, 5);
  assertEquals(flags.maxTokens, 1024);
  assertEquals(flags.taskTimeoutMs, 0);
  assertEquals(flags.autoApproveTools, true);
  assertEquals(flags.disableCheckpoints, true);
});

Deno.test("buildRuntimeConfig merges CLI and environment values", () => {
  const env = {
    HOME: "/home/tester",
    OPENAI_API_KEY: "test-openai-key",
    ZYPHER_MODEL: "gpt-4o-mini",
    ZYPHER_AUTO_APPROVE: "false",
  };

  const config = buildRuntimeConfig({
    provider: "openai",
    workspace: "/tmp/cli-workspace",
    model: "gpt-4.1-mini",
    maxIterations: 9,
    autoApproveTools: true,
  }, env);

  assertEquals(config.workspace, "/tmp/cli-workspace");
  assertEquals(config.model, "gpt-4.1-mini");
  assertEquals(config.apiKey, "test-openai-key");
  assertEquals(config.maxIterations, 9);
  assertEquals(config.autoApproveTools, true);
  assertEquals(config.provider, "openai");
});

Deno.test("buildRuntimeConfig errors when API key missing", () => {
  assertThrows(
    () => buildRuntimeConfig({ provider: "anthropic" }, {}),
    Error,
    "Missing API key",
  );
});
