import type { AiFlowConfig } from "../types.js";

export function runDoctor(config: AiFlowConfig): {
  ok: boolean;
  messages: string[];
} {
  const messages: string[] = [];
  let ok = true;

  messages.push("What is working:");
  messages.push(`- ai-flow home: ${config.paths.aiFlowHome}`);
  messages.push(`- Scan interval: every ${config.scanIntervalSeconds}s`);
  messages.push(`- Target audience: ${renderAudience(config.ux.targetAudience)}`);
  messages.push(
    `- Streaming ingestion: ${config.performance.streamingIngestion ? "enabled" : "disabled"}`
  );

  messages.push("");
  messages.push("Needs attention:");

  if (config.notion.enabled) {
    if (!process.env[config.notion.tokenEnvVar] || !process.env[config.notion.databaseIdEnvVar]) {
      ok = false;
      messages.push(
        `- Notion mirroring is enabled but credentials are missing. Set ${config.notion.tokenEnvVar} and ${config.notion.databaseIdEnvVar} in ~/.ai-flow/.env or your shell.`
      );
    } else {
      messages.push("- Notion mirroring is configured.");
    }
  } else {
    messages.push("- Notion mirroring is disabled by config.");
  }

  messages.push(
    `- Release automation: ${config.release.enabled ? "enabled" : "disabled"} (${config.release.preflightCommands.join(" -> ")}${config.release.refreshLocalApp ? ` -> ${config.release.refreshCommand}` : ""})`
  );
  messages.push("");
  messages.push("Next step:");
  messages.push("- Run `ai-flow setup --guided` to update defaults for this machine.");

  return {
    ok,
    messages
  };
}

function renderAudience(value: AiFlowConfig["ux"]["targetAudience"]): string {
  return value === "non_technical" ? "non-technical users first" : "technical users";
}
