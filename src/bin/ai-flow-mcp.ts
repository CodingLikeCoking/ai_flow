#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadAiFlowConfig } from "../core/config/loadConfig.js";
import { createHttpServer } from "../http/createHttpServer.js";
import { createAiFlowMcpServer } from "../mcp/server.js";

export function buildAiFlowMcpProgram(): Command {
  const program = new Command();

  program
    .name("ai-flow-mcp")
    .description("MCP server for ai-flow data and operations.")
    .option("--transport <transport>", "Transport to use", "stdio")
    .option("--host <host>", "Host for HTTP transport", "127.0.0.1")
    .option("--port <port>", "Port for HTTP transport", parsePort, 8787);

  program.setOptionValue("transport", "stdio");
  program.setOptionValue("host", "127.0.0.1");
  program.setOptionValue("port", 8787);

  program.action(async () => {
    const config = await loadAiFlowConfig();
    config.mcp.http.host = program.opts().host;
    config.mcp.http.port = program.opts().port;
    const serverBundle = await createAiFlowMcpServer(config);

    if (program.opts().transport === "http") {
      await createHttpServer({
        server: serverBundle.server,
        host: program.opts().host,
        port: program.opts().port,
        token: process.env.AI_FLOW_MCP_TOKEN
      });
      return;
    }

    const transport = new StdioServerTransport();
    await serverBundle.server.connect(transport);
  });

  return program;
}

function parsePort(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("port must be a positive integer");
  }
  return parsed;
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  await buildAiFlowMcpProgram().parseAsync(process.argv);
}

function isDirectExecution(moduleUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) {
    return false;
  }

  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argvPath);
  } catch {
    return false;
  }
}
