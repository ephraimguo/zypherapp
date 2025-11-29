import {buildRuntimeConfig, parseCliArgs} from "./src/config.ts";
import {printHelp, startCli} from "./src/cli.ts";

if (import.meta.main) {
    try {
        const cliFlags = parseCliArgs(Deno.args);
        if (cliFlags.showHelp) {
            printHelp();
            Deno.exit(0); // todo why??
        }

        const config = buildRuntimeConfig(cliFlags);
        await startCli(config);
    } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        Deno.exit(1);
    }
}
