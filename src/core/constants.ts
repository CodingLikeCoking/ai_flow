import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_SCAN_INTERVAL_SECONDS = 60;
export const DEFAULT_MCP_HTTP_HOST = "127.0.0.1";
export const DEFAULT_MCP_HTTP_PORT = 8787;
export const DEFAULT_HOME_DIR = homedir();
export const DEFAULT_DESKTOP_DIR = join(DEFAULT_HOME_DIR, "Desktop");
export const AI_FLOW_HOME_DIRNAME = ".ai-flow";
export const PROMPT_GLOBAL_DIRNAME = "prompt_global";
export const MANAGED_BLOCK_START = "AI_FLOW_MANAGED_START";
export const MANAGED_BLOCK_END = "AI_FLOW_MANAGED_END";
