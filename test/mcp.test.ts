import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createHandler } from "../src/site/server";

const ROOT = join(import.meta.dir, "..");
let server: ReturnType<typeof Bun.serve>;
let endpoint: URL;

beforeAll(() => {
  server = Bun.serve({ port: 0, fetch: createHandler() });
  endpoint = new URL("/api/mcp", server.url);
});
afterAll(() => server.stop(true));

const text = (result: unknown) => (result as CallToolResult).content.map((c) => (c.type === "text" ? c.text : "")).join("");
const json = (result: unknown) => JSON.parse(text(result));

const EXPECTED_TOOLS = ["find_components", "get_component", "get_style", "list_styles", "search_components", "theme_component"];

async function exercise(client: Client) {
  const { tools } = await client.listTools();
  expect(tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);
  expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);

  const search = json(await client.callTool({ name: "search_components", arguments: { type: "faq" } }));
  expect(search.components.map((c: { id: string }) => c.id)).toEqual(["faq-disclosure"]);
  expect(json(await client.callTool({ name: "search_components", arguments: { query: "no javascript" } })).count).toBeGreaterThan(0);

  const component = json(await client.callTool({ name: "get_component", arguments: { id: "pricing-tiers", style: "paper" } }));
  expect(component.revision).toMatch(/^[0-9a-f]{12}$/);
  expect(component.files.map((f: { path: string }) => f.path)).toEqual(["components/PricingTiers.tsx", "styles/neat-paper.css"]);
  expect(component.provenance.license).toBe("MIT");
  expect(component.unresolved).toEqual([]);

  const style = json(await client.callTool({ name: "get_style", arguments: { id: "signal" } }));
  expect(style.missing).toContain("colors.dark");
  expect(style.colors.light.find((c: { role: string }) => c.role === "focus").status).toBe("missing");

  const invalid = await client.callTool({ name: "search_components", arguments: { limit: 0 } });
  expect(invalid.isError).toBe(true);

  const unknown = await client.callTool({ name: "get_component", arguments: { id: "does-not-exist" } });
  expect(unknown.isError).toBe(true);
  expect(text(unknown)).toContain("Known IDs");

  const unknownStyle = await client.callTool({ name: "get_style", arguments: { id: "linear" } });
  expect(unknownStyle.isError).toBe(true);
}

describe("MCP over Streamable HTTP", () => {
  test("discovery, search, fetches, and errors with the SDK client", async () => {
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(endpoint));
    expect(client.getServerVersion()?.name).toBe("neat-labs");
    await exercise(client);
    const component = json(await client.callTool({ name: "get_component", arguments: { id: "hero-split" } }));
    expect(component.previewUrl).toBe(new URL("/components/hero-split", server.url).toString());
    await client.close();
  });

  test("older tool names and argument shapes keep working", async () => {
    const client = new Client({ name: "old-config", version: "0.0.1" });
    await client.connect(new StreamableHTTPClientTransport(endpoint));
    const found = json(await client.callTool({ name: "find_components", arguments: { type: "hero" } }));
    expect(found.map((c: { id: string }) => c.id)).toEqual(["hero-split"]);
    const byType = json(await client.callTool({ name: "get_component", arguments: { type: "hero", id: "split" } }));
    expect(byType.id).toBe("hero-split");
    const themed = json(await client.callTool({ name: "theme_component", arguments: { type: "cta", id: "band", brand: "signal" } }));
    expect(themed.unresolved.map((u: { token: string }) => u.token)).toContain("--nl-focus");
    const oldBrand = await client.callTool({ name: "theme_component", arguments: { type: "cta", id: "band", brand: "linear" } });
    expect(oldBrand.isError).toBe(true);
    expect(text(oldBrand)).toContain("Available styles: harbor, paper, signal");
    await client.close();
  });

  test("a plain JSON POST, as the old endpoint accepted, gets a JSON reply", async () => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "curl", version: "0" } } }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = (await res.json()) as { result: { protocolVersion: string; serverInfo: { name: string } } };
    expect(body.result.protocolVersion).toBe("2025-03-26");
    expect(body.result.serverInfo.name).toBe("neat-labs");
  });

  test("GET and DELETE are refused because the server keeps no sessions", async () => {
    for (const method of ["GET", "DELETE"]) {
      const res = await fetch(endpoint, { method, headers: { Accept: "text/event-stream" } });
      expect(res.status).toBe(405);
    }
    expect((await fetch(endpoint, { method: "OPTIONS" })).status).toBe(204);
  });
});

describe("MCP over stdio", () => {
  test("same tools and results, then a clean disconnect", async () => {
    const transport = new StdioClientTransport({ command: process.execPath, args: [join(ROOT, "src/mcp/stdio.ts")], cwd: ROOT, stderr: "pipe" });
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(transport);
    await exercise(client);
    const component = json(await client.callTool({ name: "get_component", arguments: { id: "hero-split" } }));
    expect(component.previewUrl).toBeNull();
    const pid = transport.pid!;
    await client.close();
    await Bun.sleep(200);
    expect(() => process.kill(pid, 0)).toThrow();
  });
});
