import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { initProject } from "../../../src/core/actions/initProject.js";
import { readProjectRegistryEntry } from "../../../src/core/registry/projectRegistry.js";

describe("project registry", () => {
  it("registers a project and creates prompt skeleton directories", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "ai-flow-registry-"));
    const projectRoot = join(sandbox, "My Project");
    const config = await loadAiFlowConfig({
      homeDir: sandbox,
      desktopDir: sandbox
    });

    const result = await initProject({
      config,
      projectPath: projectRoot,
      projectName: "My Project"
    });

    const entry = await readProjectRegistryEntry(config, result.projectSlug);

    expect(result.projectSlug).toBe("my-project");
    expect(entry?.projectPath).toBe(projectRoot);
  });
});
