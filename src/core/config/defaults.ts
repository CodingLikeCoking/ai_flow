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
    },
    ux: {
      targetAudience: "non_technical",
      guidedMode: true,
      plainLanguageStatus: true
    },
    workflow: {
      searchBeforeBuild: true,
      planRequiredThreshold: "non_trivial",
      providerRules: {
        openai: [
          "Keep coding prompts concise and explicit about success criteria.",
          "Prefer tool-limited workflows and validate with tests."
        ],
        anthropic: [
          "Persist repeated rules in CLAUDE.md instead of repeating them in chat.",
          "Use focused subagents and scope tools tightly."
        ],
        deepseek: [
          "Use explicit output schemas and concrete formatting instructions.",
          "Treat DeepSeek as a model backend, not the workflow source of truth."
        ]
      },
      repeatedPromptRules: [
        "Optimize for non-technical users by default.",
        "Search existing tools before building from scratch.",
        "Plan first for non-trivial work, then implement with tests."
      ]
    },
    performance: {
      streamingIngestion: true,
      maxBytesPerScanPass: 8_388_608,
      notionBatchSize: 25
    },
    release: {
      enabled: true,
      autoCommit: true,
      autoPush: true,
      refreshLocalApp: true,
      gitRemote: "origin",
      commitMessageTemplate: "chore: update ai-flow",
      preflightCommands: ["npm run typecheck", "npm test", "npm run build"],
      refreshCommand: "npm link"
    }
  };
}
