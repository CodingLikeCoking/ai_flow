import type { AiFlowConfig } from "../types.js";

export function runDoctor(config: AiFlowConfig): {
  ok: boolean;
  messages: string[];
} {
  const messages: string[] = [];

  messages.push(`ai-flow home: ${config.paths.aiFlowHome}`);
  messages.push(`scan interval: ${config.scanIntervalSeconds}s`);

  if (!process.env[config.notion.tokenEnvVar] || !process.env[config.notion.databaseIdEnvVar]) {
    messages.push("Notion is not fully configured.");
  }

  return {
    ok: messages.every((message) => !message.includes("not fully configured")),
    messages
  };
}
