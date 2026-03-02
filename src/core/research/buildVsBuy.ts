import type { BuildVsBuyOption } from "../types.js";
import { BUILD_VS_BUY_PROVIDERS } from "./providers.js";

const NEW_BUILD_PATTERN = /\b(build|create|make|implement)\b/i;

export function runBuildVsBuyResearch(promptText: string): BuildVsBuyOption[] {
  if (!NEW_BUILD_PATTERN.test(promptText)) {
    return [];
  }

  return BUILD_VS_BUY_PROVIDERS.map((provider) => ({
    source: provider,
    name: `${provider} candidate`,
    rationale: "Check this source before building from scratch."
  }));
}
