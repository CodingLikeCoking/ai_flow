import { readFile } from "node:fs/promises";

import type { Suggestion } from "../types.js";
import { fileExists, writeTextFile } from "../fs/fileIO.js";
import { replaceManagedBlock } from "./managedBlocks.js";

export async function applySuggestionToManagedBlock(
  suggestion: Suggestion
): Promise<boolean> {
  if (!suggestion.targetFile || suggestion.confidence < 0.9) {
    return false;
  }

  if (!(await fileExists(suggestion.targetFile))) {
    return false;
  }

  const existing = await readFile(suggestion.targetFile, "utf8");
  const updated = replaceManagedBlock(existing, `- ${suggestion.summary}`);
  if (!updated) {
    return false;
  }

  await writeTextFile(suggestion.targetFile, updated);
  return true;
}
