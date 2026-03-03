import type { NormalizedRecord } from "../types.js";
import type { AiFlowDatabase, RecordRow } from "./database.js";

/**
 * Simple local embedding using term-frequency hashing.
 * This avoids external API dependencies while still enabling
 * meaningful similarity search. Replace with a real embedding
 * model (e.g. OpenAI text-embedding-3-small) for production
 * digital clone quality.
 */
const EMBEDDING_DIM = 256;

export function computeEmbedding(record: NormalizedRecord): Buffer {
  const text = [
    record.userText,
    record.assistantText,
    record.summary,
    record.onePromptNextTime,
    record.taskSlug.replace(/-/g, " "),
    ...record.reusablePatterns
  ].join(" ");

  const vec = new Float32Array(EMBEDDING_DIM);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const h = hashString(token);
    const idx = Math.abs(h) % EMBEDDING_DIM;
    vec[idx] += h > 0 ? 1 : -1;
  }

  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vec[i] /= norm;
  }

  return Buffer.from(vec.buffer);
}

export function embedAllRecords(db: AiFlowDatabase): number {
  const rows = db.db
    .prepare("SELECT * FROM records WHERE embedding IS NULL")
    .all() as RecordRow[];

  const updateStmt = db.db.prepare("UPDATE records SET embedding = ? WHERE record_id = ?");
  const transaction = db.db.transaction(() => {
    for (const row of rows) {
      const record = rowToMinimal(row);
      const embedding = computeEmbedding(record);
      updateStmt.run(embedding, row.record_id);
    }
  });

  transaction();
  return rows.length;
}

export function findSimilarRecords(
  db: AiFlowDatabase,
  queryText: string,
  projectSlug?: string,
  limit = 10
): Array<{ record: NormalizedRecord; score: number }> {
  const queryRecord: NormalizedRecord = {
    recordId: "",
    projectSlug: "",
    taskSlug: "",
    kind: "PROMPT",
    agent: "codex",
    captureFidelity: "full_fidelity",
    sessionId: "",
    sourcePath: "",
    startedAt: "",
    endedAt: "",
    status: "open",
    userText: queryText,
    assistantText: "",
    summary: "",
    filesChanged: [],
    deliverables: [],
    configNeeded: [],
    buildVsBuy: [],
    reusablePatterns: [],
    onePromptNextTime: "",
    nextDirections: [],
    notionPageId: null
  };

  const queryVec = new Float32Array(computeEmbedding(queryRecord).buffer);

  const whereClause = projectSlug
    ? "WHERE embedding IS NOT NULL AND project_slug = ?"
    : "WHERE embedding IS NOT NULL";
  const params = projectSlug ? [projectSlug] : [];

  const rows = db.db
    .prepare(`SELECT * FROM records ${whereClause}`)
    .all(...params) as RecordRow[];

  const scored: Array<{ row: RecordRow; score: number }> = [];

  for (const row of rows) {
    if (!row.embedding) continue;
    const rowVec = new Float32Array(
      row.embedding.buffer,
      row.embedding.byteOffset,
      EMBEDDING_DIM
    );
    const score = cosineSimilarity(queryVec, rowVec);
    scored.push({ row, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ row, score }) => ({
    record: rowToFull(row),
    score
  }));
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}

function rowToMinimal(row: RecordRow): NormalizedRecord {
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

const rowToFull = rowToMinimal;
