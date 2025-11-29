import { assertEquals, assertThrows } from "jsr:@std/assert";
import { buildRuntimeConfig, parseCliArgs } from "./src/config.ts";

Deno.test("parseCliArgs correctly parses arguments", () => {
    const args = [
        "-p",
        "anthropic",
        "--model",
        "claude-opus",
        "-w",
        "/tmp/workspace",
        "--max-iterations",
        "10",
        "-y",
    ];
    const flags = parseCliArgs(args);
    assertEquals(flags, {
        provider: "anthropic",
        model: "claude-opus",
        workspace: "/tmp/workspace",
        maxIterations: 10,
        autoApproveTools: true,
    });
});

Deno.test("parseCliArgs throws on unknown argument", () => {
    assertThrows(
        () => parseCliArgs(["--unknown-flag"]),
        Error,
        "Unknown option: --unknown-flag",
    );
});

Deno.test("buildRuntimeConfig uses defaults and environment variables", () => {
    const env = {
        OPENAI_API_KEY: "env-openai-key",
        ZYPHER_WORKDIR: "/env/workdir",
        HOME: "/home/user", // Add HOME to avoid errors in test environments
    };
    const config = buildRuntimeConfig({}, env);
    assertEquals(config.provider, "openai");
    assertEquals(config.apiKey, "env-openai-key");
    assertEquals(config.workspace, "/env/workdir");
    assertEquals(config.model, "gpt-4o-mini");
});

Deno.test("buildRuntimeConfig prioritizes CLI flags over environment variables", () => {
    const cliFlags = {
        provider: "anthropic",
        apiKey: "cli-key",
        workspace: "/cli/workdir",
    };
    const env = {
        ANTHROPIC_API_KEY: "env-anthropic-key",
        ZYPHER_PROVIDER: "openai",
        ZYPHER_WORKDIR: "/env/workdir",
        HOME: "/home/user",
    };
    const config = buildRuntimeConfig(cliFlags, env);
    assertEquals(config.provider, "anthropic");
    assertEquals(config.apiKey, "cli-key");
    assertEquals(config.workspace, "/cli/workdir");
    assertEquals(config.model, "claude-3.5-sonnet-20241022");
});

Deno.test("buildRuntimeConfig throws if API key is missing", () => {
    assertThrows(
        () => buildRuntimeConfig({ provider: "openai" }, { HOME: "/home/user" }),
        Error,
        'Missing API key for provider "openai"',
    );
    assertThrows(
        () => buildRuntimeConfig({ provider: "anthropic" }, { HOME: "/home/user" }),
        Error,
        'Missing API key for provider "anthropic"',
    );
});
