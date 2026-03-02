import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { syncRecordsToNotion } from "../../../src/core/notion/syncService.js";

describe("notion sync service", () => {
  it("returns a setup guide when credentials are missing", async () => {
    const config = await loadAiFlowConfig();
    const result = await syncRecordsToNotion(config, []);

    expect(result.syncedCount).toBe(0);
    expect(result.setupGuide?.title).toContain("Connect Notion");
  });
});
