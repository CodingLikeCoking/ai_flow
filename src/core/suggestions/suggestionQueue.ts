import type { Suggestion } from "../types.js";
import { writeTextFile } from "../fs/fileIO.js";

export async function appendSuggestionsToMarkdown(
  path: string,
  suggestions: Suggestion[]
): Promise<void> {
  const body = [
    "# Suggestions",
    "",
    ...suggestions.map(
      (suggestion) =>
        `- [${suggestion.category}] ${suggestion.summary} (confidence: ${suggestion.confidence})`
    ),
    ""
  ].join("\n");

  await writeTextFile(path, body);
}
