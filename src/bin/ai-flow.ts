#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { runDoctor } from "../core/actions/doctor.js";
import { exportDataset } from "../core/actions/exportDataset.js";
import { rebuildProjectStatus } from "../core/actions/rebuildStatus.js";
import { runScan } from "../core/actions/runScan.js";
import { syncNotionRecords } from "../core/actions/syncNotion.js";
import { installClaudeHooks } from "../core/adapters/claudeHookInstaller.js";
import { readProjectRegistryEntry } from "../core/registry/projectRegistry.js";
import { loadAiFlowConfig } from "../core/config/loadConfig.js";
import { initProject } from "../core/actions/initProject.js";

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

  const sync = program.command("sync");
  sync.command("notion").option("--project <slug>").action((options) =>
    runWithConfig(async (config) => {
      const entry = options.project
        ? await readProjectRegistryEntry(config, options.project)
        : null;
      const result = await syncNotionRecords(config, [], {
        projectSlug: entry?.projectSlug
      });
      process.stdout.write(
        `${JSON.stringify({ project: entry?.projectSlug ?? null, ...result }, null, 2)}\n`
      );
    })
  );

  program
    .command("rebuild-status")
    .requiredOption("--project <slug>")
    .action((options) =>
      runWithConfig(async (config) => {
        const entry = await readProjectRegistryEntry(config, options.project);
        if (!entry) {
          throw new Error(`Unknown project slug: ${options.project}`);
        }

        await rebuildProjectStatus(
          config,
          entry.projectName,
          entry.projectPath,
          entry.projectSlug,
          []
        );
        process.stdout.write(`Rebuilt status for ${entry.projectSlug}\n`);
      })
    );

  const exportCommand = program.command("export");
  exportCommand.command("dataset").action(() =>
    runWithConfig(async (config) => {
      await exportDataset(config, []);
      process.stdout.write("Exported empty dataset scaffold.\n");
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

  program
    .command("finalize")
    .option("--debug-hook <event>")
    .action((options) => {
      if (options.debugHook) {
        return;
      }

      process.stdout.write("finalize is reserved for debug overrides in v1.\n");
    });

  return program;
}

async function runWithConfig(
  callback: (config: Awaited<ReturnType<typeof loadAiFlowConfig>>) => Promise<void>
): Promise<void> {
  const config = await loadAiFlowConfig();
  await callback(config);
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
