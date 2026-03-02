import { readFile } from "node:fs/promises";

import type { SetupGuide } from "../types.js";
import { fileExists, writeJsonFile } from "../fs/fileIO.js";

export interface InstallClaudeHooksOptions {
  settingsPath?: string;
  aiFlowBinaryPath?: string;
}

const HOOK_EVENTS = ["UserPromptSubmit", "Stop", "TaskCompleted", "SessionEnd"] as const;

export async function installClaudeHooks(
  options: InstallClaudeHooksOptions = {}
): Promise<{ installed: boolean; settingsPath: string }> {
  const settingsPath =
    options.settingsPath ?? `${process.env.HOME ?? ""}/.claude/settings.json`;
  const aiFlowBinaryPath = options.aiFlowBinaryPath ?? "ai-flow";

  const current = await readSettingsJson(settingsPath);
  const hooks = { ...(current.hooks ?? {}) };

  for (const eventName of HOOK_EVENTS) {
    const existing = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
    const command = `${aiFlowBinaryPath} finalize --debug-hook ${eventName}`;
    if (!existing.some((entry: any) => entry?.command === command)) {
      existing.push({
        matcher: "*",
        hooks: [
          {
            type: "command",
            command
          }
        ]
      });
    }
    hooks[eventName] = existing;
  }

  await writeJsonFile(settingsPath, { ...current, hooks });
  return { installed: true, settingsPath };
}

export function buildClaudeHookSetupGuide(projectSlug: string): SetupGuide {
  return {
    id: "claude-hooks-setup",
    projectSlug,
    title: "Install Claude Code Hooks",
    summary: "Add lifecycle hooks so ai-flow receives stronger passive task-completion signals.",
    createdAt: new Date().toISOString(),
    steps: [
      {
        title: "Open Claude settings",
        action: "Open ~/.claude/settings.json in your editor.",
        reason: "Claude Code reads hook configuration from this file.",
        verification: "The settings file is visible and editable."
      },
      {
        title: "Install hooks",
        action: "Run `ai-flow install claude-hooks`.",
        reason: "This adds UserPromptSubmit, Stop, TaskCompleted, and SessionEnd hooks.",
        verification: "The hooks object now contains those four event keys."
      }
    ]
  };
}

async function readSettingsJson(path: string): Promise<Record<string, any>> {
  if (!(await fileExists(path))) {
    return {};
  }

  try {
    const contents = await readFile(path, "utf8");
    return JSON.parse(contents) as Record<string, any>;
  } catch {
    return {};
  }
}
