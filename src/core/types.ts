export const AGENT_NAMES = ["codex", "claude", "cursor"] as const;
export const RECORD_KINDS = [
  "PROMPT",
  "PLAN",
  "STATUS",
  "SUGGESTION",
  "SETUP_GUIDE"
] as const;
export const CAPTURE_FIDELITIES = ["full_fidelity", "summary_fidelity"] as const;
export const RECORD_STATUSES = ["open", "resolved", "interrupted"] as const;
export const SUGGESTION_CATEGORIES = [
  "global_config",
  "project_config",
  "skill",
  "reusable_method",
  "asset",
  "automation",
  "setup",
  "provider_best_practice"
] as const;

export type AgentName = (typeof AGENT_NAMES)[number];
export type RecordKind = (typeof RECORD_KINDS)[number];
export type CaptureFidelity = (typeof CAPTURE_FIDELITIES)[number];
export type RecordStatus = (typeof RECORD_STATUSES)[number];
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export interface AiFlowConfig {
  scanIntervalSeconds: number;
  paths: {
    homeDir: string;
    desktopDir: string;
    aiFlowHome: string;
    configFile: string;
    projectsDir: string;
    stateDir: string;
    datasetDir: string;
    rawDir: string;
    errorsLogFile: string;
  };
  mcp: {
    http: {
      host: string;
      port: number;
      requireToken: boolean;
    };
  };
  notion: {
    enabled: boolean;
    tokenEnvVar: string;
    databaseIdEnvVar: string;
  };
}

export interface ProjectRegistryEntry {
  projectSlug: string;
  projectName: string;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuildVsBuyOption {
  source: string;
  name: string;
  url?: string;
  rationale: string;
}

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  projectSlug: string;
  summary: string;
  targetFile?: string;
  confidence: number;
  actionText?: string;
  createdAt: string;
}

export interface SetupGuideStep {
  title: string;
  action: string;
  reason: string;
  verification: string;
}

export interface SetupGuide {
  id: string;
  projectSlug: string;
  title: string;
  summary: string;
  steps: SetupGuideStep[];
  createdAt: string;
}

export interface NormalizedRecord {
  recordId: string;
  projectSlug: string;
  taskSlug: string;
  kind: RecordKind;
  agent: AgentName;
  captureFidelity: CaptureFidelity;
  sessionId: string;
  sourcePath: string;
  startedAt: string;
  endedAt: string;
  status: RecordStatus;
  userText: string;
  assistantText: string;
  summary: string;
  filesChanged: string[];
  deliverables: string[];
  configNeeded: string[];
  buildVsBuy: BuildVsBuyOption[];
  reusablePatterns: string[];
  onePromptNextTime: string;
  nextDirections: string[];
  notionPageId: string | null;
}

export interface ProjectStatusSnapshot {
  projectSlug: string;
  projectName: string;
  purpose: string;
  phase: string;
  completedTasks: string[];
  openTasks: string[];
  timelineHighlights: string[];
  deliverables: string[];
  blockers: string[];
  nextDirections: string[];
  updatedAt: string;
}

export interface ScanResult {
  scannedAt: string;
  recordsCreated: number;
  recordsUpdated: number;
  suggestionsApplied: number;
  warnings: string[];
}

export interface TaskBoundaryDecision {
  taskSlug: string;
  shouldCloseTask: boolean;
  status: RecordStatus;
  score: number;
  reasons: string[];
}

export interface ProviderAdviceRule {
  provider: "openai" | "anthropic";
  slug: string;
  summary: string;
  recommendation: string;
}

export interface AdapterEvent {
  agent: AgentName;
  sessionId: string;
  projectPath?: string;
  sourcePath: string;
  timestamp: string;
  role: "user" | "assistant" | "tool" | "system";
  text: string;
  metadata?: Record<string, unknown>;
}
