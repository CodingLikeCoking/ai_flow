import { describe, expect, it } from "vitest";

import { buildAiFlowProgram } from "../../../src/bin/ai-flow.js";
import { buildAiFlowMcpProgram } from "../../../src/bin/ai-flow-mcp.js";

describe("CLI smoke tests", () => {
  it("registers expected ai-flow top-level commands", () => {
    const program = buildAiFlowProgram();
    const names = program.commands.map((command) => command.name());

    expect(names).toEqual([
      "init",
      "setup",
      "scan",
      "doctor",
      "migrate",
      "sync",
      "rebuild-status",
      "export",
      "install",
      "print",
      "release",
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

  it("registers the expected print subcommands", () => {
    const program = buildAiFlowProgram();
    const print = program.commands.find((command) => command.name() === "print");

    expect(print?.commands.map((command) => command.name())).toEqual([
      "codex-mcp-config",
      "cursor-mcp-config",
      "global-rules"
    ]);
  });
});
