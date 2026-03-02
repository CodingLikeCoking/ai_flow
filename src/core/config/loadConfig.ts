import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

import { fileExists, readJsonFile, writeJsonFile } from "../fs/fileIO.js";
import type { AiFlowConfig } from "../types.js";
import { buildDefaultConfig, type ConfigPathOverrides } from "./defaults.js";

const configSchema = z.object({
  scanIntervalSeconds: z.number().int().min(1),
  paths: z.object({
    homeDir: z.string().min(1),
    desktopDir: z.string().min(1),
    aiFlowHome: z.string().min(1),
    promptGlobalDir: z.string().min(1),
    configFile: z.string().min(1),
    projectsDir: z.string().min(1),
    stateDir: z.string().min(1),
    datasetDir: z.string().min(1),
    rawDir: z.string().min(1),
    errorsLogFile: z.string().min(1)
  }),
  mcp: z.object({
    http: z.object({
      host: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      requireToken: z.boolean()
    })
  }),
  notion: z.object({
    enabled: z.boolean(),
    tokenEnvVar: z.string().min(1),
    databaseIdEnvVar: z.string().min(1)
  })
});

export interface LoadConfigOptions extends ConfigPathOverrides {
  rawConfig?: Partial<AiFlowConfig>;
}

export async function loadAiFlowConfig(
  options: LoadConfigOptions = {}
): Promise<AiFlowConfig> {
  await loadRuntimeEnv(options.homeDir);

  const defaults = buildDefaultConfig(options);

  if (options.rawConfig) {
    const merged = deepMerge(defaults, options.rawConfig);
    return configSchema.parse(merged);
  }

  if (!(await fileExists(defaults.paths.configFile))) {
    await writeJsonFile(defaults.paths.configFile, defaults);
    return defaults;
  }

  const stored = await readJsonFile<AiFlowConfig>(defaults.paths.configFile);
  const merged = deepMerge(defaults, stored ?? {});
  return configSchema.parse(merged);
}

async function loadRuntimeEnv(homeDirOverride?: string): Promise<void> {
  const candidatePaths: string[] = [];
  const explicitEnvFile = process.env.AI_FLOW_ENV_FILE?.trim();

  if (explicitEnvFile) {
    candidatePaths.push(explicitEnvFile);
  }

  if (process.cwd() !== "/") {
    candidatePaths.push(join(process.cwd(), ".env"));
  }

  const homeDir = homeDirOverride ?? process.env.HOME ?? "";
  if (homeDir) {
    candidatePaths.push(join(homeDir, ".ai-flow", ".env"));
  }

  for (const envPath of candidatePaths) {
    if (!(await fileExists(envPath))) {
      continue;
    }

    const contents = await readFile(envPath, "utf8");
    applyDotEnv(contents);
  }
}

function applyDotEnv(contents: string): void {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (value === "") {
      continue;
    }

    process.env[key] = value;
  }
}

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (Array.isArray(base) || Array.isArray(patch)) {
    return (patch ?? base) as T;
  }

  if (!isRecord(base) || !isRecord(patch)) {
    return (patch ?? base) as T;
  }

  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    const current = result[key];
    result[key] =
      isRecord(current) && isRecord(value)
        ? deepMerge(current, value)
        : value;
  }

  return result as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
