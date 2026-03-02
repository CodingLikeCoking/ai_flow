import { Server } from "node:http";

import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface CreateHttpServerOptions {
  server: McpServer;
  host: string;
  port: number;
  token?: string;
}

export async function createHttpServer(
  options: CreateHttpServerOptions
): Promise<Server> {
  const app = createMcpExpressApp({ host: options.host });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  await options.server.connect(transport);
  app.use(express.json({ limit: "1mb" }));

  const handler = async (req: express.Request, res: express.Response) => {
    if (!isOriginAllowed(req, options.host)) {
      res.status(403).send("Forbidden origin");
      return;
    }

    if (options.token) {
      const expected = `Bearer ${options.token}`;
      if (req.headers.authorization !== expected) {
        res.status(401).send("Unauthorized");
        return;
      }
    }

    await transport.handleRequest(req, res, req.body);
  };

  app.post("/mcp", (req, res) => void handler(req, res));
  app.get("/mcp", (req, res) => void handler(req, res));
  app.delete("/mcp", (req, res) => void handler(req, res));

  return new Promise((resolve) => {
    const server = app.listen(options.port, options.host, () => resolve(server));
  });
}

function isOriginAllowed(req: express.Request, host: string): boolean {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return parsed.hostname === host || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}
