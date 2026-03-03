import { join } from "node:path";
import { mkdirSync } from "node:fs";

import Database from "better-sqlite3";

import type {
  AiFlowConfig,
  NormalizedRecord,
  ProjectRegistryEntry
} from "../types.js";

export interface RecordRow {
  record_id: string;
  project_slug: string;
  task_slug: string;
  kind: string;
  agent: string;
  fidelity: string;
  session_id: string;
  source_path: string;
  started_at: string;
  ended_at: string;
  status: string;
  user_text: string;
  assistant_text: string;
  summary: string;
  one_prompt: string;
  files_changed: string;
  deliverables: string;
  config_needed: string;
  build_vs_buy: string;
  patterns: string;
  next_dirs: string;
  notion_page_id: string | null;
  embedding: Buffer | null;
  created_at: string;
}

export interface RecordFilters {
  agent?: string;
  kind?: string;
  status?: string;
  since?: string;
  until?: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS records (
  record_id      TEXT PRIMARY KEY,
  project_slug   TEXT NOT NULL,
  task_slug      TEXT NOT NULL,
  kind           TEXT NOT NULL,
  agent          TEXT NOT NULL,
  fidelity       TEXT NOT NULL,
  session_id     TEXT NOT NULL,
  source_path    TEXT NOT NULL,
  started_at     TEXT NOT NULL,
  ended_at       TEXT NOT NULL,
  status         TEXT NOT NULL,
  user_text      TEXT NOT NULL,
  assistant_text TEXT NOT NULL,
  summary        TEXT NOT NULL,
  one_prompt     TEXT NOT NULL,
  files_changed  TEXT NOT NULL DEFAULT '[]',
  deliverables   TEXT NOT NULL DEFAULT '[]',
  config_needed  TEXT NOT NULL DEFAULT '[]',
  build_vs_buy   TEXT NOT NULL DEFAULT '[]',
  patterns       TEXT NOT NULL DEFAULT '[]',
  next_dirs      TEXT NOT NULL DEFAULT '[]',
  notion_page_id TEXT,
  embedding      BLOB,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_records_project ON records(project_slug);
CREATE INDEX IF NOT EXISTS idx_records_task    ON records(project_slug, task_slug);
CREATE INDEX IF NOT EXISTS idx_records_agent   ON records(agent);
CREATE INDEX IF NOT EXISTS idx_records_time    ON records(ended_at);

CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(
  record_id,
  user_text,
  assistant_text,
  summary,
  one_prompt,
  content=records,
  content_rowid=rowid
);

CREATE TABLE IF NOT EXISTS projects (
  project_slug  TEXT PRIMARY KEY,
  project_name  TEXT NOT NULL,
  project_path  TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS records_ai AFTER INSERT ON records BEGIN
  INSERT INTO records_fts(rowid, record_id, user_text, assistant_text, summary, one_prompt)
  VALUES (new.rowid, new.record_id, new.user_text, new.assistant_text, new.summary, new.one_prompt);
END;

CREATE TRIGGER IF NOT EXISTS records_ad AFTER DELETE ON records BEGIN
  INSERT INTO records_fts(records_fts, rowid, record_id, user_text, assistant_text, summary, one_prompt)
  VALUES ('delete', old.rowid, old.record_id, old.user_text, old.assistant_text, old.summary, old.one_prompt);
END;

CREATE TRIGGER IF NOT EXISTS records_au AFTER UPDATE ON records BEGIN
  INSERT INTO records_fts(records_fts, rowid, record_id, user_text, assistant_text, summary, one_prompt)
  VALUES ('delete', old.rowid, old.record_id, old.user_text, old.assistant_text, old.summary, old.one_prompt);
  INSERT INTO records_fts(rowid, record_id, user_text, assistant_text, summary, one_prompt)
  VALUES (new.rowid, new.record_id, new.user_text, new.assistant_text, new.summary, new.one_prompt);
END;
`;

export class AiFlowDatabase {
  readonly db: Database.Database;

  constructor(dbPath: string | ":memory:") {
    if (dbPath !== ":memory:") {
      mkdirSync(join(dbPath, ".."), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(SCHEMA_SQL);
  }

  close(): void {
    this.db.close();
  }

  // ── Records ──────────────────────────────────────────────

  upsertRecord(record: NormalizedRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO records (
        record_id, project_slug, task_slug, kind, agent, fidelity,
        session_id, source_path, started_at, ended_at, status,
        user_text, assistant_text, summary, one_prompt,
        files_changed, deliverables, config_needed, build_vs_buy,
        patterns, next_dirs, notion_page_id
      ) VALUES (
        @record_id, @project_slug, @task_slug, @kind, @agent, @fidelity,
        @session_id, @source_path, @started_at, @ended_at, @status,
        @user_text, @assistant_text, @summary, @one_prompt,
        @files_changed, @deliverables, @config_needed, @build_vs_buy,
        @patterns, @next_dirs, @notion_page_id
      )
      ON CONFLICT(record_id) DO UPDATE SET
        status         = excluded.status,
        user_text      = excluded.user_text,
        assistant_text = excluded.assistant_text,
        summary        = excluded.summary,
        one_prompt     = excluded.one_prompt,
        files_changed  = excluded.files_changed,
        deliverables   = excluded.deliverables,
        config_needed  = excluded.config_needed,
        build_vs_buy   = excluded.build_vs_buy,
        patterns       = excluded.patterns,
        next_dirs      = excluded.next_dirs,
        notion_page_id = excluded.notion_page_id
    `);

    stmt.run({
      record_id: record.recordId,
      project_slug: record.projectSlug,
      task_slug: record.taskSlug,
      kind: record.kind,
      agent: record.agent,
      fidelity: record.captureFidelity,
      session_id: record.sessionId,
      source_path: record.sourcePath,
      started_at: record.startedAt,
      ended_at: record.endedAt,
      status: record.status,
      user_text: record.userText,
      assistant_text: record.assistantText,
      summary: record.summary,
      one_prompt: record.onePromptNextTime,
      files_changed: JSON.stringify(record.filesChanged),
      deliverables: JSON.stringify(record.deliverables),
      config_needed: JSON.stringify(record.configNeeded),
      build_vs_buy: JSON.stringify(record.buildVsBuy),
      patterns: JSON.stringify(record.reusablePatterns),
      next_dirs: JSON.stringify(record.nextDirections),
      notion_page_id: record.notionPageId
    });
  }

  getRecord(recordId: string): NormalizedRecord | null {
    const row = this.db
      .prepare("SELECT * FROM records WHERE record_id = ?")
      .get(recordId) as RecordRow | undefined;
    return row ? rowToNormalized(row) : null;
  }

  listRecords(
    projectSlug: string,
    filters: RecordFilters = {},
    limit = 20,
    offset = 0
  ): { total: number; items: NormalizedRecord[] } {
    const clauses = ["project_slug = @project_slug"];
    const params: Record<string, string | number> = { project_slug: projectSlug };

    if (filters.agent) {
      clauses.push("agent = @agent");
      params.agent = filters.agent;
    }
    if (filters.kind) {
      clauses.push("kind = @kind");
      params.kind = filters.kind;
    }
    if (filters.status) {
      clauses.push("status = @status");
      params.status = filters.status;
    }
    if (filters.since) {
      clauses.push("ended_at >= @since");
      params.since = filters.since;
    }
    if (filters.until) {
      clauses.push("ended_at <= @until");
      params.until = filters.until;
    }

    const where = clauses.join(" AND ");

    const total = (
      this.db
        .prepare(`SELECT COUNT(*) as cnt FROM records WHERE ${where}`)
        .get(params) as { cnt: number }
    ).cnt;

    const rows = this.db
      .prepare(
        `SELECT * FROM records WHERE ${where} ORDER BY ended_at DESC LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit, offset }) as RecordRow[];

    return { total, items: rows.map(rowToNormalized) };
  }

  searchRecords(
    projectSlug: string,
    query: string,
    limit = 20,
    offset = 0
  ): { total: number; items: NormalizedRecord[] } {
    const ftsQuery = sanitizeFtsQuery(query);

    const countRow = this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM records_fts
         JOIN records ON records.rowid = records_fts.rowid
         WHERE records_fts MATCH @query AND records.project_slug = @project_slug`
      )
      .get({ query: ftsQuery, project_slug: projectSlug }) as { cnt: number };

    const rows = this.db
      .prepare(
        `SELECT records.* FROM records_fts
         JOIN records ON records.rowid = records_fts.rowid
         WHERE records_fts MATCH @query AND records.project_slug = @project_slug
         ORDER BY rank
         LIMIT @limit OFFSET @offset`
      )
      .all({ query: ftsQuery, project_slug: projectSlug, limit, offset }) as RecordRow[];

    return { total: countRow.cnt, items: rows.map(rowToNormalized) };
  }

  countRecords(projectSlug?: string): number {
    if (projectSlug) {
      return (
        this.db
          .prepare("SELECT COUNT(*) as cnt FROM records WHERE project_slug = ?")
          .get(projectSlug) as { cnt: number }
      ).cnt;
    }
    return (this.db.prepare("SELECT COUNT(*) as cnt FROM records").get() as { cnt: number }).cnt;
  }

  allRecords(projectSlug?: string): NormalizedRecord[] {
    const rows = projectSlug
      ? (this.db
          .prepare("SELECT * FROM records WHERE project_slug = ? ORDER BY ended_at")
          .all(projectSlug) as RecordRow[])
      : (this.db.prepare("SELECT * FROM records ORDER BY ended_at").all() as RecordRow[]);
    return rows.map(rowToNormalized);
  }

  updateEmbedding(recordId: string, embedding: Buffer): void {
    this.db
      .prepare("UPDATE records SET embedding = ? WHERE record_id = ?")
      .run(embedding, recordId);
  }

  updateNotionPageId(recordId: string, notionPageId: string): void {
    this.db
      .prepare("UPDATE records SET notion_page_id = ? WHERE record_id = ?")
      .run(notionPageId, recordId);
  }

  // ── Projects ─────────────────────────────────────────────

  upsertProject(entry: ProjectRegistryEntry): void {
    this.db
      .prepare(
        `INSERT INTO projects (project_slug, project_name, project_path, created_at, updated_at)
         VALUES (@projectSlug, @projectName, @projectPath, @createdAt, @updatedAt)
         ON CONFLICT(project_slug) DO UPDATE SET
           project_name = excluded.project_name,
           project_path = excluded.project_path,
           updated_at   = excluded.updated_at`
      )
      .run(entry);
  }

  getProject(projectSlug: string): ProjectRegistryEntry | null {
    const row = this.db
      .prepare("SELECT * FROM projects WHERE project_slug = ?")
      .get(projectSlug) as
      | { project_slug: string; project_name: string; project_path: string; created_at: string; updated_at: string }
      | undefined;
    if (!row) return null;
    return {
      projectSlug: row.project_slug,
      projectName: row.project_name,
      projectPath: row.project_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  listProjects(limit = 100, offset = 0): { total: number; items: ProjectRegistryEntry[] } {
    const total = (
      this.db.prepare("SELECT COUNT(*) as cnt FROM projects").get() as { cnt: number }
    ).cnt;

    const rows = this.db
      .prepare("SELECT * FROM projects ORDER BY updated_at DESC LIMIT ? OFFSET ?")
      .all(limit, offset) as Array<{
      project_slug: string;
      project_name: string;
      project_path: string;
      created_at: string;
      updated_at: string;
    }>;

    return {
      total,
      items: rows.map((row) => ({
        projectSlug: row.project_slug,
        projectName: row.project_name,
        projectPath: row.project_path,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  }
}

// ── Helpers ────────────────────────────────────────────────

function rowToNormalized(row: RecordRow): NormalizedRecord {
  return {
    recordId: row.record_id,
    projectSlug: row.project_slug,
    taskSlug: row.task_slug,
    kind: row.kind as NormalizedRecord["kind"],
    agent: row.agent as NormalizedRecord["agent"],
    captureFidelity: row.fidelity as NormalizedRecord["captureFidelity"],
    sessionId: row.session_id,
    sourcePath: row.source_path,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status as NormalizedRecord["status"],
    userText: row.user_text,
    assistantText: row.assistant_text,
    summary: row.summary,
    filesChanged: JSON.parse(row.files_changed),
    deliverables: JSON.parse(row.deliverables),
    configNeeded: JSON.parse(row.config_needed),
    buildVsBuy: JSON.parse(row.build_vs_buy),
    reusablePatterns: JSON.parse(row.patterns),
    onePromptNextTime: row.one_prompt,
    nextDirections: JSON.parse(row.next_dirs),
    notionPageId: row.notion_page_id
  };
}

function sanitizeFtsQuery(query: string): string {
  const escaped = query.replace(/['"*(){}[\]:^~!\\]/g, " ").trim();
  if (!escaped) return '""';
  const tokens = escaped.split(/\s+/).filter(Boolean);
  return tokens.map((t) => `"${t}"`).join(" ");
}

export function openDatabase(config: AiFlowConfig): AiFlowDatabase {
  const dbPath = join(config.paths.aiFlowHome, "ai-flow.db");
  return new AiFlowDatabase(dbPath);
}
