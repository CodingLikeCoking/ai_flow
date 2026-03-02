import { Client } from "@notionhq/client";

import type { AiFlowConfig } from "../types.js";

export function getNotionClient(config: AiFlowConfig): Client | null {
  const token = process.env[config.notion.tokenEnvVar];
  if (!token) {
    return null;
  }

  return new Client({ auth: token });
}
