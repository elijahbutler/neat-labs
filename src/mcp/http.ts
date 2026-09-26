import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Catalogue } from "../catalogue/schema";
import { createLibraryServer, type LibraryOptions } from "./tools";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Stateless Streamable HTTP: every POST gets a fresh server and transport, and the reply comes back as JSON.
 * There are no sessions and nothing is written, so GET (a server-to-client stream) and DELETE are refused.
 */
export async function handleMcp(req: Request, catalogue: Catalogue, options: LibraryOptions): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return withCors(Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "This server is stateless. Send JSON-RPC requests with POST." } },
      { status: 405, headers: { Allow: "POST, OPTIONS" } },
    ));
  }
  // The endpoint before the split answered plain JSON POSTs. The SDK requires clients to accept both JSON and
  // event streams; since this server only ever replies with JSON, widen the header instead of refusing.
  const accept = req.headers.get("accept") ?? "";
  if (!accept.includes("text/event-stream") || !accept.includes("application/json")) {
    const headers = new Headers(req.headers);
    headers.set("accept", "application/json, text/event-stream");
    req = new Request(req, { headers });
  }
  const server = createLibraryServer(catalogue, options);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    return withCors(await transport.handleRequest(req));
  } finally {
    await server.close();
  }
}
