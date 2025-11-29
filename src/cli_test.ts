import { assertEquals } from "jsr:@std/assert";
import { shouldPromptForApproval } from "./cli.ts";
import type { RuntimeConfig } from "./config.ts";

Deno.test("shouldPromptForApproval returns true for sensitive tools", () => {
    const result = shouldPromptForApproval("run_terminal_cmd", {});
    assertEquals(result, true);
});

Deno.test("shouldPromptForApproval returns false for non-sensitive tools", () => {
    const result = shouldPromptForApproval("read_file", { path: "test.txt" });
    assertEquals(result, false);
});

Deno.test("shouldPromptForApproval respects requireUserApproval parameter", () => {
    const result = shouldPromptForApproval("read_file", { requireUserApproval: true });
    assertEquals(result, true);
});
