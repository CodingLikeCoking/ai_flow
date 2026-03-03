import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { AiFlowMcpContext } from "./server.js";
import { registerApplySuggestionTool } from "./tools/applySuggestion.js";
import { registerGetProjectStatusTool } from "./tools/getProjectStatus.js";
import { registerGetRecordTool } from "./tools/getRecord.js";
import { registerGetSetupGuideTool } from "./tools/getSetupGuide.js";
import { registerListProjectsTool } from "./tools/listProjects.js";
import { registerListRecordsTool } from "./tools/listRecords.js";
import { registerListSuggestionsTool } from "./tools/listSuggestions.js";
import { registerRegisterProjectTool } from "./tools/registerProject.js";
import { registerRunScanTool } from "./tools/runScan.js";
import { registerSearchRecordsTool } from "./tools/searchRecords.js";
import { registerSimilarRecordsTool } from "./tools/similarRecords.js";
import { registerSyncNotionTool } from "./tools/syncNotion.js";

export function registerAiFlowTools(
  server: McpServer,
  context: AiFlowMcpContext
): string[] {
  return [
    registerListProjectsTool(server, context),
    registerGetProjectStatusTool(server, context),
    registerListRecordsTool(server, context),
    registerGetRecordTool(server, context),
    registerSearchRecordsTool(server, context),
    registerListSuggestionsTool(server, context),
    registerGetSetupGuideTool(server, context),
    registerRunScanTool(server, context),
    registerSyncNotionTool(server, context),
    registerRegisterProjectTool(server, context),
    registerSimilarRecordsTool(server, context),
    registerApplySuggestionTool(server)
  ];
}
