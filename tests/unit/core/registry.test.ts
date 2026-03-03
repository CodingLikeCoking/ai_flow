import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { initProject } from "../../../src/core/actions/initProject.js";
import { AiFlowDatabase } from "../../../src/core/db/database.js";

describe("project registry", () => {
  it("registers a project in the database", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-registry-"));
    const projectRoot = join(sandbox, "My Project");
    const config = await loadAiFlowConfig({
      homeDir: sandbox,
      desktopDir: sandbox
    });
    const db = new AiFlowDatabase(":memory:");

    try {
      const result = await initProject({
        config,
        projectPath: projectRoot,
        projectName: "My Project",
        db
      });

      const entry = db.getProject(result.projectSlug);

      expect(result.projectSlug).toBe("my-project");
      expect(entry?.projectPath).toBe(projectRoot);
    } finally {
      db.close();
    }
  });
});
