import type { NormalizedRecord, Suggestion } from "../types.js";

import { getProviderAdviceRules } from "./providerAdvice.js";

export function detectReusablePatterns(record: NormalizedRecord): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const combined = `${record.userText}\n${record.assistantText}`;
  const now = new Date().toISOString();

  if (/\.env|environment variable|api key/i.test(combined)) {
    suggestions.push({
      id: `${record.recordId}-setup`,
      category: "setup",
      projectSlug: record.projectSlug,
      summary: "Capture missing configuration steps in a reusable setup guide.",
      confidence: 0.85,
      createdAt: now
    });
  }

  if (/user agent|scrap/i.test(combined)) {
    suggestions.push({
      id: `${record.recordId}-scraping-user-agent`,
      category: "reusable_method",
      projectSlug: record.projectSlug,
      summary: "Add a reusable web scraping rule about setting a user agent header.",
      confidence: 0.91,
      createdAt: now
    });
  }

  for (const rule of getProviderAdviceRules()) {
    if (!combined.toLowerCase().includes(rule.provider)) {
      continue;
    }

    suggestions.push({
      id: `${record.recordId}-${rule.slug}`,
      category: "provider_best_practice",
      projectSlug: record.projectSlug,
      summary: rule.summary,
      confidence: 0.8,
      actionText: rule.recommendation,
      createdAt: now
    });
  }

  return suggestions;
}
