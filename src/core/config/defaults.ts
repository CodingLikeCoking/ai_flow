import {
  DEFAULT_MCP_HTTP_HOST,
  DEFAULT_MCP_HTTP_PORT,
  DEFAULT_SCAN_INTERVAL_SECONDS
} from "../constants.js";
import { getAiFlowRootPaths } from "../fs/paths.js";
import type { AiFlowConfig } from "../types.js";

export interface ConfigPathOverrides {
  homeDir?: string;
  desktopDir?: string;
}

export function buildDefaultConfig(overrides: ConfigPathOverrides = {}): AiFlowConfig {
  const paths = getAiFlowRootPaths(overrides.homeDir, overrides.desktopDir);

  return {
    scanIntervalSeconds: DEFAULT_SCAN_INTERVAL_SECONDS,
    paths,
    mcp: {
      http: {
        host: DEFAULT_MCP_HTTP_HOST,
        port: DEFAULT_MCP_HTTP_PORT,
        requireToken: false
      }
    },
    notion: {
      enabled: true,
      tokenEnvVar: "NOTION_TOKEN",
      databaseIdEnvVar: "NOTION_DATABASE_ID"
    }
  };
}
