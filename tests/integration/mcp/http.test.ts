import { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { createHttpServer } from "../../../src/http/createHttpServer.js";
import { createAiFlowMcpServer } from "../../../src/mcp/server.js";

describe("mcp http transport", () => {
  const servers: Array<{ close: () => void }> = [];

  afterEach(() => {
    for (const server of servers) {
      server.close();
    }
  });

  it("rejects invalid origin headers", async () => {
    const config = await loadAiFlowConfig();
    const bundle = await createAiFlowMcpServer(config);
    const server = await createHttpServer({
      server: bundle.server,
      host: "127.0.0.1",
      port: 0
    });
    servers.push(server);
    const address = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example"
      },
      body: JSON.stringify({})
    });

    expect(response.status).toBe(403);
  });

  it("rejects requests without the expected bearer token", async () => {
    const config = await loadAiFlowConfig();
    const bundle = await createAiFlowMcpServer(config);
    const server = await createHttpServer({
      server: bundle.server,
      host: "127.0.0.1",
      port: 0,
      token: "secret-token"
    });
    servers.push(server);
    const address = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1"
      },
      body: JSON.stringify({})
    });

    expect(response.status).toBe(401);
  });
});
