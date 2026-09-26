import { join } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogue as loadDefault } from "../catalogue/load";
import type { Catalogue } from "../catalogue/schema";
import type { Mode } from "../catalogue/theme";
import { handleMcp } from "../mcp/http";
import { searchComponents } from "../mcp/tools";
import { CataloguePage, ComponentPage, ConnectPage, NotFoundPage, StylePage, StylesPage } from "./pages";
import { specimenHtml } from "./specimen";

/** Paper is the one seed style with every field set, so it is the fairest first impression. */
const DEFAULT_STYLE = "paper";
const ROOT = join(import.meta.dir, "..", "..");
const ASSETS: Record<string, { path: string; type: string }> = {
  "site.css": { path: join(ROOT, "dist", "site.css"), type: "text/css; charset=utf-8" },
  "specimen.css": { path: join(ROOT, "dist", "specimen.css"), type: "text/css; charset=utf-8" },
  "site.js": { path: join(ROOT, "public", "site.js"), type: "text/javascript; charset=utf-8" },
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function page(element: ReactElement, status = 200) {
  return new Response(`<!doctype html>${renderToStaticMarkup(element)}`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS, "X-Frame-Options": "DENY" },
  });
}

/** The public origin used in links handed to agents. PUBLIC_URL overrides the request's own origin behind a proxy. */
function originOf(req: Request) {
  return process.env.PUBLIC_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
}

export function createHandler(getCatalogue: () => Promise<Catalogue> = loadDefault) {
  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const catalogue = await getCatalogue();
    const origin = originOf(req);
    const styleParam = url.searchParams.get("style");
    const style = catalogue.styles.find((s) => s.id === styleParam) ?? catalogue.styles.find((s) => s.id === DEFAULT_STYLE) ?? catalogue.styles[0]!;

    if (path === "/api/mcp" || path === "/mcp") return handleMcp(req, catalogue, { siteUrl: origin });
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });

    if (path.startsWith("/assets/")) {
      const asset = ASSETS[path.slice("/assets/".length)];
      const file = asset && Bun.file(asset.path);
      if (!asset || !file || !(await file.exists())) return new Response("Not found. Run `bun run build:css` first.", { status: 404 });
      return new Response(file, { headers: { "Content-Type": asset.type, "Cache-Control": "public, max-age=300", ...SECURITY_HEADERS } });
    }

    if (path === "/health") return Response.json({ ok: true, catalogueVersion: catalogue.version, components: catalogue.components.length, styles: catalogue.styles.length });

    if (path === "/catalogue.json") {
      return Response.json({ ...catalogue, siteUrl: origin }, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60", ...SECURITY_HEADERS } });
    }

    if (path === "/" || path === "/components") {
      const query = url.searchParams.get("q")?.slice(0, 200) ?? "";
      const type = url.searchParams.get("type")?.slice(0, 40) ?? "";
      return page(<CataloguePage catalogue={catalogue} results={searchComponents(catalogue, query, type)} query={query} type={type} style={style} />);
    }

    const componentMatch = /^\/components\/([a-z0-9-]+)$/.exec(path);
    if (componentMatch) {
      const component = catalogue.components.find((c) => c.id === componentMatch[1]);
      if (!component) return page(<NotFoundPage catalogue={catalogue} what={`There's no component "${componentMatch[1]}".`} />, 404);
      const example = Number(url.searchParams.get("example") ?? 0);
      return page(<ComponentPage catalogue={catalogue} component={component} style={style} example={Number.isInteger(example) && component.examples[example] ? example : 0} />);
    }

    const specimenMatch = /^\/specimen\/([a-z0-9-]+)$/.exec(path);
    if (specimenMatch) {
      const component = catalogue.components.find((c) => c.id === specimenMatch[1]);
      const mode = url.searchParams.get("mode") ?? "light";
      if (!component || (mode !== "light" && mode !== "dark")) return new Response("Unknown component or mode.", { status: 404 });
      const { status, html } = await specimenHtml(catalogue, { component, style, mode: mode as Mode, example: Number(url.searchParams.get("example") ?? 0) });
      // Specimens are only framed by this site.
      return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS, "Content-Security-Policy": "frame-ancestors 'self'; script-src 'none'" } });
    }

    if (path === "/styles") return page(<StylesPage catalogue={catalogue} />);
    const styleMatch = /^\/styles\/([a-z0-9-]+)$/.exec(path);
    if (styleMatch) {
      const found = catalogue.styles.find((s) => s.id === styleMatch[1]);
      return found ? page(<StylePage catalogue={catalogue} style={found} />) : page(<NotFoundPage catalogue={catalogue} what={`There's no style "${styleMatch[1]}".`} />, 404);
    }

    if (path === "/connect") return page(<ConnectPage catalogue={catalogue} origin={origin} />);
    return page(<NotFoundPage catalogue={catalogue} what="There's no page at this address." />, 404);
  };
}

if (import.meta.main) {
  const server = Bun.serve({ port: Number(process.env.PORT ?? 3100), fetch: createHandler() });
  console.log(`Neat Labs Library on ${server.url}`);
}
