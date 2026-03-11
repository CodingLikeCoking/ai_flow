#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { runDoctor } from "../core/actions/doctor.js";
import { exportDataset } from "../core/actions/exportDataset.js";
import { rebuildProjectStatus } from "../core/actions/rebuildStatus.js";
import { runScan } from "../core/actions/runScan.js";
import { syncNotionRecords } from "../core/actions/syncNotion.js";
import { installClaudeHooks } from "../core/adapters/claudeHookInstaller.js";
import { loadAiFlowConfig, saveAiFlowConfig } from "../core/config/loadConfig.js";
import { initProject } from "../core/actions/initProject.js";
import { openDatabase } from "../core/db/database.js";
import { migrateToDatabase } from "../core/db/migrate.js";
import { exportClone } from "../core/actions/exportClone.js";
import type { AiFlowConfig, ScanResult } from "../core/types.js";

export function buildAiFlowProgram(): Command {
  const program = new Command();

  program
    .name("ai-flow")
    .description("Passive local-first AI workflow memory system.");

  program
    .command("init")
    .requiredOption("--project <path>")
    .requiredOption("--project-name <name>")
    .action(async (options) => {
      const config = await loadAiFlowConfig();
      const result = await initProject({
        config,
        projectPath: options.project,
        projectName: options.projectName
      });
      process.stdout.write(`Initialized ${result.projectSlug}\n`);
    });

  program
    .command("setup")
    .option("--guided", "Ask plain-language setup questions")
    .action((options) =>
      runWithConfig(async (config) => {
        if (!options.guided) {
          process.stdout.write(`Config file: ${config.paths.configFile}\n`);
          return;
        }

        const updated = await runGuidedSetup(config);
        await saveAiFlowConfig(updated);
        process.stdout.write(`Saved guided setup to ${updated.paths.configFile}\n`);
      })
    );

  program.command("scan").action(() =>
    runWithConfig(async (config) => {
      const result = await runScan({ config });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
  );

  program.command("doctor").action(() =>
    runWithConfig(async (config) => {
      const result = runDoctor(config);
      process.stdout.write(`${result.messages.join("\n")}\n`);
    })
  );

  program.command("migrate").action(() =>
    runWithConfig(async (config) => {
      const db = openDatabase(config);
      try {
        const result = await migrateToDatabase(db, config);
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } finally {
        db.close();
      }
    })
  );

  const sync = program.command("sync");
  sync.command("notion").option("--project <slug>").action((options) =>
    runWithConfig(async (config) => {
      const db = openDatabase(config);
      try {
        const entry = options.project ? db.getProject(options.project) : null;
        const result = await syncNotionRecords(config, [], {
          projectSlug: entry?.projectSlug
        });
        process.stdout.write(
          `${JSON.stringify({ project: entry?.projectSlug ?? null, ...result }, null, 2)}\n`
        );
      } finally {
        db.close();
      }
    })
  );

  program
    .command("rebuild-status")
    .requiredOption("--project <slug>")
    .action((options) =>
      runWithConfig(async (config) => {
        const db = openDatabase(config);
        try {
          const entry = db.getProject(options.project);
          if (!entry) {
            throw new Error(`Unknown project slug: ${options.project}`);
          }
          const view = await rebuildProjectStatus(
            config,
            entry.projectName,
            entry.projectPath,
            entry.projectSlug,
            [],
            db
          );
          process.stdout.write(`${view.statusMarkdown}\n`);
        } finally {
          db.close();
        }
      })
    );

  const exportCommand = program.command("export");
  exportCommand.command("dataset").action(() =>
    runWithConfig(async (config) => {
      await exportDataset(config, []);
      process.stdout.write("Dataset exported.\n");
    })
  );
  exportCommand
    .command("clone")
    .option("--format <format>", "Export format: openai, anthropic, ndjson", "openai")
    .option("--project <slug>", "Filter by project slug")
    .option("--agent <agent>", "Filter by agent")
    .option("--since <date>", "Include records after this ISO date")
    .option("--output <path>", "Output file path")
    .action((options) =>
      runWithConfig(async (config) => {
        const outputPath = await exportClone(config, {
          format: options.format,
          projectSlug: options.project,
          agent: options.agent,
          since: options.since,
          outputPath: options.output
        });
        process.stdout.write(`Clone training data exported to ${outputPath}\n`);
      })
    );

  const install = program.command("install");
  install.command("claude-hooks").action(async () => {
    const result = await installClaudeHooks();
    process.stdout.write(`Installed hooks in ${result.settingsPath}\n`);
  });

  const print = program.command("print");
  print.command("codex-mcp-config").action(() => {
    process.stdout.write(JSON.stringify(buildMcpClientSnippet("codex"), null, 2));
    process.stdout.write("\n");
  });
  print.command("cursor-mcp-config").action(() => {
    process.stdout.write(JSON.stringify(buildMcpClientSnippet("cursor"), null, 2));
    process.stdout.write("\n");
  });
  print.command("global-rules").action(() =>
    runWithConfig(async (config) => {
      process.stdout.write(
        `${JSON.stringify(
          {
            targetAudience: config.ux.targetAudience,
            repeatedPromptRules: config.workflow.repeatedPromptRules,
            providerRules: config.workflow.providerRules
          },
          null,
          2
        )}\n`
      );
    })
  );

  program
    .command("release")
    .option("--message <message>", "Commit message override")
    .action((options) =>
      runWithConfig(async (config) => {
        const result = await runReleaseAutomation(config, {
          commitMessage: options.message
        });
        process.stdout.write(`${result.message}\n`);
      })
    );

  program
    .command("finalize")
    .option("--debug-hook <event>")
    .action((options) =>
      runWithConfig(async (config) => {
        const summary = await runFinalizeCommand(config, {
          eventName: options.debugHook
        });
        process.stdout.write(`${summary}\n`);
      })
    );

  return program;
}

async function runWithConfig(
  callback: (config: Awaited<ReturnType<typeof loadAiFlowConfig>>) => Promise<void>
): Promise<void> {
  const config = await loadAiFlowConfig();
  await callback(config);
}

interface GuidedSetupAnswers {
  targetAudience: AiFlowConfig["ux"]["targetAudience"];
  enableNotion: boolean;
  enableRelease: boolean;
  autoPush: boolean;
}

interface ReleaseAutomationOptions {
  commitMessage?: string;
  exec?: (command: string, args: string[]) => Promise<{ stdout?: string } | void>;
}

interface FinalizeCommandOptions {
  eventName?: string;
  runner?: (options: { config: AiFlowConfig }) => Promise<ScanResult>;
}

export function applyGuidedSetupAnswers(
  config: AiFlowConfig,
  answers: GuidedSetupAnswers
): AiFlowConfig {
  return {
    ...config,
    notion: {
      ...config.notion,
      enabled: answers.enableNotion
    },
    ux: {
      ...config.ux,
      targetAudience: answers.targetAudience,
      guidedMode: true,
      plainLanguageStatus: answers.targetAudience === "non_technical"
    },
    release: {
      ...config.release,
      enabled: answers.enableRelease,
      autoPush: answers.enableRelease ? answers.autoPush : false
    }
  };
}

export function normalizeTargetAudience(
  value: string,
  fallback: AiFlowConfig["ux"]["targetAudience"]
): AiFlowConfig["ux"]["targetAudience"] {
  const normalized = value.trim().toLowerCase();
  if (normalized === "technical") {
    return "technical";
  }
  if (normalized === "non_technical" || normalized === "non-technical") {
    return "non_technical";
  }
  return fallback;
}

export async function runReleaseAutomation(
  config: AiFlowConfig,
  options: ReleaseAutomationOptions = {}
): Promise<{ ran: boolean; message: string }> {
  if (!config.release.enabled) {
    return {
      ran: false,
      message: "Release automation is disabled in ai-flow config."
    };
  }

  const exec = options.exec ?? execCommand;
  for (const commandLine of config.release.preflightCommands) {
    const { command, args } = splitCommand(commandLine);
    await exec(command, args);
  }

  if (config.release.refreshLocalApp) {
    const { command, args } = splitCommand(config.release.refreshCommand);
    await exec(command, args);
  }

  const statusResult = await exec("git", ["status", "--porcelain"]);
  const statusText = statusResult?.stdout?.trim() ?? "";
  if (!statusText) {
    return {
      ran: true,
      message: "Release checks passed and the working tree is already clean."
    };
  }
  if (statusText.split("\n").some((line) => line.startsWith("?? "))) {
    throw new Error(
      "Release automation refuses to auto-commit untracked files. Stage or remove them first."
    );
  }

  const commitMessage = options.commitMessage ?? config.release.commitMessageTemplate;
  if (config.release.autoCommit) {
    await exec("git", ["add", "-A"]);
    await exec("git", ["commit", "-m", commitMessage]);
  }

  if (config.release.autoPush) {
    await exec("git", ["push", config.release.gitRemote, "HEAD"]);
  }

  return {
    ran: true,
    message: `Release automation completed with commit message: ${commitMessage}`
  };
}

export async function runFinalizeCommand(
  config: AiFlowConfig,
  options: FinalizeCommandOptions = {}
): Promise<string> {
  const runner = options.runner ?? ((runnerOptions) => runScan(runnerOptions));
  const result = await runner({ config });
  const eventName = options.eventName ?? "manual";
  return `finalize event=${eventName} created=${result.recordsCreated} updated=${result.recordsUpdated} suggestions=${result.suggestionsApplied} warnings=${result.warnings.length}`;
}

async function runGuidedSetup(config: AiFlowConfig): Promise<AiFlowConfig> {
  const rl = createInterface({ input, output });

  try {
    const targetAudience = (await rl.question(
      "Target audience (`non_technical` or `technical`) [non_technical]: "
    )).trim() as GuidedSetupAnswers["targetAudience"];
    const enableNotion = await askYesNo(rl, "Enable Notion mirroring?", config.notion.enabled);
    const enableRelease = await askYesNo(
      rl,
      "Enable release automation (`ai-flow release`)?",
      config.release.enabled
    );
    const autoPush = enableRelease
      ? await askYesNo(rl, "Auto-push after validation and commit?", config.release.autoPush)
      : false;

    return applyGuidedSetupAnswers(config, {
      targetAudience: normalizeTargetAudience(targetAudience, config.ux.targetAudience),
      enableNotion,
      enableRelease,
      autoPush
    });
  } finally {
    rl.close();
  }
}

async function askYesNo(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultValue: boolean
): Promise<boolean> {
  const suffix = defaultValue ? "Y/n" : "y/N";
  const answer = (await rl.question(`${question} [${suffix}] `)).trim().toLowerCase();
  if (!answer) {
    return defaultValue;
  }
  return answer === "y" || answer === "yes";
}

async function execCommand(command: string, args: string[]): Promise<{ stdout?: string }> {
  return await new Promise<{ stdout?: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["inherit", "pipe", "pipe"]
    });
    let stdoutText = "";
    let stderrText = "";

    child.stdout?.on("data", (chunk: Buffer | string) => {
      const text = chunk.toString();
      stdoutText += text;
      process.stdout.write(text);
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      const text = chunk.toString();
      stderrText += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout: stdoutText });
        return;
      }

      const stderrSuffix = stderrText.trim() ? `\n${stderrText.trim()}` : "";
      reject(
        new Error(
          `Command failed: ${command} ${args.join(" ")} (exit ${code ?? "null"})${stderrSuffix}`
        )
      );
    });
  });
}

function splitCommand(commandLine: string): { command: string; args: string[] } {
  const parts = commandLine.trim().split(/\s+/);
  const [command = "", ...args] = parts;
  return { command, args };
}

function buildMcpClientSnippet(client: "codex" | "cursor") {
  return {
    client,
    mcpServers: {
      aiFlow: {
        command: "ai-flow-mcp",
        args: ["--transport", "stdio"]
      }
    }
  };
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  await buildAiFlowProgram().parseAsync(process.argv);
}

function isDirectExecution(moduleUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) {
    return false;
  }

  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argvPath);
  } catch {
    return false;
  }
}
