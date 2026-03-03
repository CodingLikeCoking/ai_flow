import { describe, expect, it } from "vitest";

import { buildAiFlowProgram } from "../../../src/bin/ai-flow.js";
import { buildAiFlowMcpProgram } from "../../../src/bin/ai-flow-mcp.js";

describe("CLI smoke tests", () => {
  it("registers expected ai-flow top-level commands", () => {
    const program = buildAiFlowProgram();
    const names = program.commands.map((command) => command.name());

    expect(names).toEqual([
      "init",
      "scan",
      "doctor",
      "migrate",
      "sync",
      "rebuild-status",
      "export",
      "install",
      "print",
      "finalize"
    ]);
  });

  it("registers ai-flow-mcp options", () => {
    const program = buildAiFlowMcpProgram();

    expect(program.opts()).toMatchObject({
      transport: "stdio",
      host: "127.0.0.1",
      port: 8787
    });
  });
});
