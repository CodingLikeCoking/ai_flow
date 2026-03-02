import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { writeGlobalProjectMirror } from "../../../src/core/mirror/globalMirror.js";

describe("global mirror", () => {
  it("writes status and mirrored record files", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-global-mirror-"));
    const config = await loadAiFlowConfig({ homeDir: sandbox, desktopDir: sandbox });

    await writeGlobalProjectMirror(config, "demo", "Demo", {
      projectStatus: "# Status\n",
      timeline: "# Timeline\n",
      records: [{ fileName: "demo-task-prompt-001.md", contents: "# Record\n" }]
    });

    const status = readFileSync(join(sandbox, "prompt_global", "demo", "project-status.md"), "utf8");
    const record = readFileSync(
      join(sandbox, "prompt_global", "demo", "records", "demo-task-prompt-001.md"),
      "utf8"
    );

    expect(status).toContain("# Status");
    expect(record).toContain("# Record");
  });
});
