import { basename } from "node:path";

import type { AdapterEvent } from "../types.js";
import { slugifyProjectName } from "../fs/paths.js";

export function deriveTaskSlug(events: AdapterEvent[], fallbackProjectSlug: string): string {
  const userEvent = events.find((event) => event.role === "user" && event.text.trim());
  const sourceText = userEvent?.text ?? fallbackProjectSlug;
  const firstLine = sourceText.split("\n").find((line) => line.trim()) ?? fallbackProjectSlug;
  const trimmed = firstLine
    .replace(/^please\s+/i, "")
    .replace(/^i want /i, "")
    .replace(/[.?!:]+$/g, "")
    .slice(0, 80);

  const slug = slugifyProjectName(trimmed);
  if (slug) {
    return slug;
  }

  return slugifyProjectName(basename(fallbackProjectSlug));
}
