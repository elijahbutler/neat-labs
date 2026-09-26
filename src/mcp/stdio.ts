#!/usr/bin/env bun
// Local MCP server over stdio. Configure a client with: bun run /path/to/neat-labs-library/src/mcp/stdio.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { catalogue } from "../catalogue/load";
import { createLibraryServer } from "./tools";

const server = createLibraryServer(await catalogue(), { siteUrl: process.env.NEAT_LIBRARY_URL ?? null });
await server.connect(new StdioServerTransport());
