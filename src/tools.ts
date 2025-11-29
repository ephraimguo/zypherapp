import type {ZypherAgent} from "@corespeed/zypher"
import {
    CopyFileTool,
    DeleteFileTool,
    FileSearchTool,
    GrepSearchTool,
    ListDirTool,
    ReadFileTool,
    RunTerminalCmdTool,
    createEditFileTools,
    createImageTools,
} from "@corespeed/zypher/tools";
import type { RuntimeConfig } from "./config.ts";

export async function registerDefaultTools(
    agent: ZypherAgent,
    config: RuntimeConfig,
): Promise<void> {
    const tools = [
        ReadFileTool,
        ListDirTool,
        RunTerminalCmdTool,
        GrepSearchTool,
        FileSearchTool,
        CopyFileTool,
        DeleteFileTool,
    ];

    for (const tool of tools) {
        agent.mcp.registerTool(tool);
    }

    const { EditFileTool, UndoFileTool } = createEditFileTools();
    agent.mcp.registerTool(EditFileTool);
    agent.mcp.registerTool(UndoFileTool);

    if (config.imageApiKey) {
        const { ImageGenTool, ImageEditTool } = createImageTools(
            config.imageApiKey,
        );
        agent.mcp.registerTool(ImageGenTool);
        agent.mcp.registerTool(ImageEditTool);
    }
}
