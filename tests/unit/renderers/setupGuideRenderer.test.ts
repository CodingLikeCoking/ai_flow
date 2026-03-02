import { describe, expect, it } from "vitest";

import { renderSetupGuideMarkdown } from "../../../src/core/renderers/setupGuideRenderer.js";

describe("setup guide renderer", () => {
  it("renders each setup step", () => {
    const markdown = renderSetupGuideMarkdown({
      id: "guide",
      projectSlug: "demo",
      title: "Setup",
      summary: "Do this",
      createdAt: "2026-03-02T10:00:00.000Z",
      steps: [
        {
          title: "Open settings",
          action: "Click settings",
          reason: "Required",
          verification: "You see the page"
        }
      ]
    });

    expect(markdown).toContain("## Step 1: Open settings");
  });
});
