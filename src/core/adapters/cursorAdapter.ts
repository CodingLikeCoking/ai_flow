import Database from "better-sqlite3";

import type { AdapterEvent, AiFlowConfig } from "../types.js";
import { fileExists } from "../fs/fileIO.js";

interface CursorScanOptions {
  dbPath?: string;
}

export async function readCursorEvents(
  config: AiFlowConfig,
  options: CursorScanOptions = {}
): Promise<AdapterEvent[]> {
  const dbPath = options.dbPath ?? `${config.paths.homeDir}/.cursor/ai-tracking/ai-code-tracking.db`;
  if (!(await fileExists(dbPath))) {
    return [];
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const statement = db.prepare(`
      SELECT conversationId, title, tldr, overview, model, mode, updatedAt
      FROM conversation_summaries
      ORDER BY updatedAt ASC
    `);
    const rows = statement.all() as Array<Record<string, any>>;

    return rows.map((row) => ({
      agent: "cursor",
      sessionId: String(row.conversationId ?? "cursor-session"),
      projectPath: "",
      sourcePath: dbPath,
      timestamp: new Date(Number(row.updatedAt ?? Date.now())).toISOString(),
      role: "assistant",
      text: [row.title, row.tldr, row.overview].filter(Boolean).join("\n\n"),
      metadata: {
        model: row.model ?? "",
        mode: row.mode ?? "",
        summaryOnly: true
      }
    }));
  } catch {
    return [];
  } finally {
    db.close();
  }
}
