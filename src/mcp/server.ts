import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import packageJson from "../../package.json" with { type: "json" };

import { loadAiFlowConfig } from "../core/config/loadConfig.js";
import type { AiFlowConfig } from "../core/types.js";
import { AiFlowDatabase, openDatabase } from "../core/db/database.js";
import { registerAiFlowResources } from "./registerResources.js";
import { registerAiFlowTools } from "./registerTools.js";

export interface AiFlowMcpContext {
  config: AiFlowConfig;
  db: AiFlowDatabase;
}

export async function createAiFlowMcpServer(config?: AiFlowConfig): Promise<{
  server: McpServer;
  context: AiFlowMcpContext;
  toolNames: string[];
  resourceNames: string[];
}> {
  const resolvedConfig = config ?? (await loadAiFlowConfig());
  const db = openDatabase(resolvedConfig);
  const context: AiFlowMcpContext = { config: resolvedConfig, db };
  const server = new McpServer({
    name: "ai-flow-mcp-server",
    version: packageJson.version
  });

  const toolNames = registerAiFlowTools(server, context);
  const resourceNames = registerAiFlowResources(server, context);

  return {
    server,
    context,
    toolNames,
    resourceNames
  };
}
