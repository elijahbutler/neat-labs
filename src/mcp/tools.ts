import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Catalogue, ComponentRecord, StyleRecord } from "../catalogue/schema";
import { ROLE_DESCRIPTIONS } from "../catalogue/schema";
import { themePackage } from "../catalogue/theme";

export const SERVER_INFO = { name: "neat-labs", version: "0.1.0" };

/** The current tools. find_components and theme_component are kept as older names for these. */
export const PRIMARY_TOOLS = ["search_components", "get_component", "list_styles", "get_style"] as const;

export interface LibraryOptions {
  /** Public site origin for preview links, such as https://library.example. Null leaves previewUrl empty. */
  siteUrl: string | null;
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const ok = (value: unknown): CallToolResult => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
const fail = (message: string): CallToolResult => ({ content: [{ type: "text", text: message }], isError: true });

export function previewUrl(options: LibraryOptions, componentId: string, styleId?: string): string | null {
  if (!options.siteUrl) return null;
  const url = new URL(`/components/${componentId}`, options.siteUrl);
  if (styleId) url.searchParams.set("style", styleId);
  return url.toString();
}

export function componentSummary(c: ComponentRecord, options: LibraryOptions) {
  return { id: c.id, type: c.type, name: c.name, summary: c.summary, revision: c.revision, tags: c.tags, tokens: c.tokens, previewUrl: previewUrl(options, c.id) };
}

export function styleSummary(s: StyleRecord, options: LibraryOptions) {
  return {
    id: s.id, name: s.name, summary: s.summary, revision: s.revision,
    swatches: Object.entries(s.colors.light).map(([role, value]) => ({ role, value })),
    modes: s.colors.dark ? ["light", "dark"] : ["light"],
    missing: s.missing,
    pageUrl: options.siteUrl ? new URL(`/styles/${s.id}`, options.siteUrl).toString() : null,
  };
}

/** Case-insensitive match on every word of the query against id, name, type, summary, and tags. */
export function searchComponents(catalogue: Catalogue, query?: string, type?: string): ComponentRecord[] {
  const words = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return catalogue.components.filter((c) => {
    if (type && c.type !== type.toLowerCase()) return false;
    const haystack = [c.id, c.name, c.type, c.summary, ...c.tags].join(" ").toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

/** Accepts "hero-split", or the older { type: "hero", id: "split" } form. */
export function findComponent(catalogue: Catalogue, id: string, type?: string): ComponentRecord | undefined {
  const wanted = id.toLowerCase();
  return catalogue.components.find((c) => c.id === wanted) ?? (type ? catalogue.components.find((c) => c.id === `${type.toLowerCase()}-${wanted}`) : undefined);
}

function unknownComponent(catalogue: Catalogue, id: string) {
  return fail(`No component "${id}" in catalogue ${catalogue.version}. Known IDs: ${catalogue.components.map((c) => c.id).join(", ")}.`);
}

function unknownStyle(catalogue: Catalogue, id: string) {
  return fail(`No style "${id}" in the public catalogue ${catalogue.version}. Available styles: ${catalogue.styles.map((s) => s.id).join(", ")}.`);
}

function componentResult(catalogue: Catalogue, options: LibraryOptions, component: ComponentRecord, styleId?: string): CallToolResult {
  const base = {
    ...componentSummary(component, options),
    export: component.export,
    requires: component.requires,
    tokenRoles: component.tokens.map((role) => ({ role, variable: `--nl-${role}`, description: ROLE_DESCRIPTIONS[role] })),
    accessibility: component.accessibility,
    states: component.states,
    examples: component.examples,
    provenance: component.provenance,
    catalogueVersion: catalogue.version,
  };
  if (!styleId) {
    return ok({ ...base, source: component.source, note: "Pass style to get a theme.css that sets every token this component reads. Adapt the component to your own components and tokens rather than pasting it unchanged." });
  }
  const style = catalogue.styles.find((s) => s.id === styleId.toLowerCase());
  if (!style) return unknownStyle(catalogue, styleId);
  const pkg = themePackage(catalogue, component, style);
  return ok({ ...base, previewUrl: previewUrl(options, component.id, style.id), style: { ...pkg.style, provenance: style.provenance }, files: pkg.files, unresolved: pkg.unresolved, fonts: pkg.fonts, instructions: pkg.instructions });
}

/** Register the read-only catalogue tools. Used by both the stdio and HTTP transports. */
export function createLibraryServer(catalogue: Catalogue, options: LibraryOptions): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions: `Read-only Neat Labs component catalogue ${catalogue.version}. Components are copyable React and Tailwind source; styles are permitted color, type, and spacing rules. Treat both as references: adapt them to the project's own components and tokens.`,
  });

  server.registerTool("search_components", {
    title: "Search components",
    description: "Search the public component catalogue by keyword and type. Returns IDs, revisions, token roles, and preview links.",
    inputSchema: {
      query: z.string().max(200).optional().describe("Words to match against name, summary, and tags"),
      type: z.string().max(40).optional().describe("Component type, such as hero, pricing, or faq"),
      limit: z.number().int().min(1).max(50).optional(),
    },
    annotations: READ_ONLY,
  }, async ({ query, type, limit }) => {
    const found = searchComponents(catalogue, query, type).slice(0, limit ?? 20);
    return ok({ catalogueVersion: catalogue.version, count: found.length, components: found.map((c) => componentSummary(c, options)) });
  });

  server.registerTool("get_component", {
    title: "Get component",
    description: "Get one component's source, requirements, token roles, accessibility notes, and provenance. Pass style to also get a theme.css for that style, with any unresolved tokens and fonts listed.",
    inputSchema: {
      id: z.string().max(80).describe("Component ID, such as hero-split"),
      type: z.string().max(40).optional().describe("Older clients: component type, combined with id as type-id"),
      style: z.string().max(80).optional().describe("Style ID from list_styles"),
    },
    annotations: READ_ONLY,
  }, async ({ id, type, style }) => {
    const component = findComponent(catalogue, id, type);
    return component ? componentResult(catalogue, options, component, style) : unknownComponent(catalogue, type ? `${type}/${id}` : id);
  });

  server.registerTool("list_styles", {
    title: "List styles",
    description: "List the permitted styles with their light-mode swatches, modes, and any fields they leave unset.",
    inputSchema: {},
    annotations: READ_ONLY,
  }, async () => ok({ catalogueVersion: catalogue.version, styles: catalogue.styles.map((s) => styleSummary(s, options)) }));

  server.registerTool("get_style", {
    title: "Get style",
    description: "Get one style's color roles for each mode, typography with font licenses, radius and spacing, written guidelines, missing fields, and provenance.",
    inputSchema: { id: z.string().max(80).describe("Style ID from list_styles") },
    annotations: READ_ONLY,
  }, async ({ id }) => {
    const style = catalogue.styles.find((s) => s.id === id.toLowerCase());
    if (!style) return unknownStyle(catalogue, id);
    const roles = (set: Record<string, string | null>) => Object.entries(set).map(([role, value]) => ({ role, variable: `--nl-${role}`, value, status: value ? "set" : "missing", description: ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS] }));
    return ok({
      ...styleSummary(style, options),
      colors: { light: roles(style.colors.light), dark: style.colors.dark ? roles(style.colors.dark) : null },
      typography: style.typography,
      radius: style.radius,
      spacing: style.spacing,
      guidelines: style.guidelines,
      inferred: style.inferred,
      provenance: style.provenance,
      catalogueVersion: catalogue.version,
    });
  });

  // Names the neatlabs.design endpoint used before the split. Kept so existing client configurations keep working.
  server.registerTool("find_components", {
    title: "Find components (older name)",
    description: "Older name for search_components. Browse components by type or keyword.",
    inputSchema: { type: z.string().max(40).optional(), query: z.string().max(200).optional() },
    annotations: READ_ONLY,
  }, async ({ type, query }) => ok(searchComponents(catalogue, query, type).map((c) => componentSummary(c, options))));

  server.registerTool("theme_component", {
    title: "Theme component (older name)",
    description: "Older form of get_component with a style. brand is a style ID from list_styles; the brand catalogue from before the split is not public.",
    inputSchema: {
      type: z.string().max(40),
      id: z.string().max(80),
      brand: z.string().max(80),
      theme: z.enum(["light", "dark"]).optional(),
    },
    annotations: READ_ONLY,
  }, async ({ type, id, brand }) => {
    const component = findComponent(catalogue, id, type);
    return component ? componentResult(catalogue, options, component, brand) : unknownComponent(catalogue, `${type}/${id}`);
  });

  return server;
}
