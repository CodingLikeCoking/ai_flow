import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

import { fileExists, readJsonFile, writeJsonFile } from "../fs/fileIO.js";
import type { AiFlowConfig } from "../types.js";
import { buildDefaultConfig, type ConfigPathOverrides } from "./defaults.js";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const configSchema = z.object({
  scanIntervalSeconds: z.number().int().min(1),
  paths: z.object({
    homeDir: z.string().min(1),
    desktopDir: z.string().min(1),
    aiFlowHome: z.string().min(1),
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
  }),
  ux: z.object({
    targetAudience: z.enum(["non_technical", "technical"]),
    guidedMode: z.boolean(),
    plainLanguageStatus: z.boolean()
  }),
  workflow: z.object({
    searchBeforeBuild: z.boolean(),
    planRequiredThreshold: z.enum(["non_trivial", "always"]),
    providerRules: z.object({
      openai: z.array(z.string().min(1)),
      anthropic: z.array(z.string().min(1)),
      deepseek: z.array(z.string().min(1))
    }),
    repeatedPromptRules: z.array(z.string().min(1))
  }),
  performance: z.object({
    streamingIngestion: z.boolean(),
    maxBytesPerScanPass: z.number().int().min(1024),
    notionBatchSize: z.number().int().min(1)
  }),
  release: z.object({
    enabled: z.boolean(),
    autoCommit: z.boolean(),
    autoPush: z.boolean(),
    refreshLocalApp: z.boolean(),
    gitRemote: z.string().min(1),
    commitMessageTemplate: z.string().min(1),
    preflightCommands: z.array(z.string().min(1)),
    refreshCommand: z.string().min(1)
  })
});

export interface LoadConfigOptions extends ConfigPathOverrides {
  rawConfig?: DeepPartial<AiFlowConfig>;
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

export async function saveAiFlowConfig(config: AiFlowConfig): Promise<void> {
  const parsed = configSchema.parse(config);
  await writeJsonFile(parsed.paths.configFile, parsed);
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

function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
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
