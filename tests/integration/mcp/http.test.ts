import { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { loadAiFlowConfig } from "../../../src/core/config/loadConfig.js";
import { createHttpServer } from "../../../src/http/createHttpServer.js";
import { createAiFlowMcpServer } from "../../../src/mcp/server.js";

describe("mcp http transport", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    for (const fn of cleanups) {
      fn();
    }
    cleanups.length = 0;
  });

  it("rejects invalid origin headers", async () => {
    const config = await loadAiFlowConfig();
    const bundle = await createAiFlowMcpServer(config);
    cleanups.push(() => bundle.context.db.close());
    const server = await createHttpServer({
      server: bundle.server,
      host: "127.0.0.1",
      port: 0
    });
    cleanups.push(() => server.close());
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
    cleanups.push(() => bundle.context.db.close());
    const server = await createHttpServer({
      server: bundle.server,
      host: "127.0.0.1",
      port: 0,
      token: "secret-token"
    });
    cleanups.push(() => server.close());
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
