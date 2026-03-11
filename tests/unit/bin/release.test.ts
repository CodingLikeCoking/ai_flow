import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyGuidedSetupAnswers,
  normalizeTargetAudience,
  runFinalizeCommand,
  runReleaseAutomation
} from "../../../src/bin/ai-flow.js";
import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";

describe("guided setup", () => {
  it("applies recommended defaults from guided answers", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-guided-setup-"));
    const config = await loadAiFlowConfig({ homeDir });

    const updated = applyGuidedSetupAnswers(config, {
      targetAudience: "non_technical",
      enableNotion: false,
      enableRelease: true,
      autoPush: true
    });

    expect(updated.ux.targetAudience).toBe("non_technical");
    expect(updated.notion.enabled).toBe(false);
    expect(updated.release.enabled).toBe(true);
    expect(updated.release.autoPush).toBe(true);
  });

  it("falls back to the existing audience when guided input is invalid", () => {
    expect(normalizeTargetAudience("nontechnical", "technical")).toBe("technical");
    expect(normalizeTargetAudience("technical", "non_technical")).toBe("technical");
  });
});

describe("release automation", () => {
  it("runs validation, link, commit, and push in order when enabled", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-release-"));
    const config = await loadAiFlowConfig({ homeDir });
    const commands: string[] = [];

    const result = await runReleaseAutomation(config, {
      commitMessage: "feat: ship ai-flow core upgrade",
      exec: async (command, args) => {
        commands.push([command, ...args].join(" "));
        if (command === "git" && args[0] === "status") {
          return { stdout: " M src/bin/ai-flow.ts\n" };
        }
      }
    });

    expect(result.ran).toBe(true);
    expect(commands).toEqual([
      "npm run typecheck",
      "npm test",
      "npm run build",
      "npm link",
      "git status --porcelain",
      "git add -A",
      "git commit -m feat: ship ai-flow core upgrade",
      "git push origin HEAD"
    ]);
  });

  it("skips git actions when release automation is disabled", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-release-disabled-"));
    const config = await loadAiFlowConfig({
      homeDir,
      rawConfig: {
        release: {
          enabled: false
        }
      }
    });
    const commands: string[] = [];

    const result = await runReleaseAutomation(config, {
      exec: async (command, args) => {
        commands.push([command, ...args].join(" "));
      }
    });

    expect(result.ran).toBe(false);
    expect(commands).toEqual([]);
  });

  it("treats a clean worktree as a no-op release after validation", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-release-clean-"));
    const config = await loadAiFlowConfig({ homeDir });
    const commands: string[] = [];

    const result = await runReleaseAutomation(config, {
      exec: async (command, args) => {
        commands.push([command, ...args].join(" "));
        if (command === "git" && args[0] === "status") {
          return { stdout: "" };
        }
      }
    });

    expect(result.ran).toBe(true);
    expect(result.message).toContain("already clean");
    expect(commands).toEqual([
      "npm run typecheck",
      "npm test",
      "npm run build",
      "npm link",
      "git status --porcelain"
    ]);
  });

  it("refuses to auto-commit untracked files", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-release-untracked-"));
    const config = await loadAiFlowConfig({ homeDir });

    await expect(
      runReleaseAutomation(config, {
        exec: async (command, args) => {
          if (command === "git" && args[0] === "status") {
            return { stdout: "?? notes.txt\n" };
          }
        }
      })
    ).rejects.toThrow("untracked files");
  });
});

describe("finalize command", () => {
  it("runs a scan and returns a compact hook summary", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "ai-flow-finalize-"));
    const config = await loadAiFlowConfig({ homeDir });

    const result = await runFinalizeCommand(config, {
      eventName: "Stop",
      runner: async () => ({
        scannedAt: "2026-03-11T12:00:00.000Z",
        recordsCreated: 2,
        recordsUpdated: 1,
        suggestionsApplied: 3,
        warnings: ["One warning"]
      })
    });

    expect(result).toContain("event=Stop");
    expect(result).toContain("created=2");
    expect(result).toContain("updated=1");
    expect(result).toContain("suggestions=3");
    expect(result).toContain("warnings=1");
  });
});
