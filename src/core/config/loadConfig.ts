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
