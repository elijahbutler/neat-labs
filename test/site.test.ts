import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { loadCatalogue } from "../src/catalogue/load";
import { themePackage } from "../src/catalogue/theme";
import { renderComponent } from "../src/site/render";
import { createHandler } from "../src/site/server";
import { addToWaitlist, handleWaitlist, parseEmail, RateLimiter } from "../src/site/waitlist";

const ROOT = join(import.meta.dir, "..");
let server: ReturnType<typeof Bun.serve>;
const get = (path: string) => fetch(new URL(path, server.url));

beforeAll(() => {
  server = Bun.serve({ port: 0, fetch: createHandler() });
});
afterAll(() => server.stop(true));

describe("site", () => {
  test("pages answer", async () => {
    for (const path of ["/", "/components", "/components?q=pricing", "/components?type=faq", "/components/hero-split", "/components/hero-split?style=signal&example=1", "/styles", "/styles/signal", "/connect", "/health"]) {
      expect(`${path} ${(await get(path)).status}`).toBe(`${path} 200`);
    }
    for (const path of ["/components/nope", "/styles/nope", "/nope"]) expect((await get(path)).status).toBe(404);
  });

  test("search filters the grid", async () => {
    const html = await (await get("/components?type=faq")).text();
    expect(html).toContain("1 of 7 components");
    expect(html).toContain("/components/faq-disclosure");
    expect(html).not.toContain('href="/components/hero-split"');
  });

  test("a specimen renders the component with the exact theme.css the package exports", async () => {
    const c = await loadCatalogue();
    const component = c.components.find((x) => x.id === "pricing-tiers")!;
    const style = c.styles.find((s) => s.id === "harbor")!;
    const html = await (await get("/specimen/pricing-tiers?style=harbor&mode=dark&example=1")).text();
    expect(html).toContain('data-theme="dark"');
    expect((await get("/specimen/pricing-tiers")).headers.get("cache-control")).toBe("no-transform");
    expect(html).toContain(themePackage(c, component, style).themeCss);
    expect(html).toContain(await renderComponent(component, component.examples[1]!.props));
  });

  test("state specimens force the component's own hover and focus rules, and leave the package alone", async () => {
    const plain = await (await get("/specimen/cta-band?style=paper")).text();
    const hover = await (await get("/specimen/cta-band?style=paper&state=hover")).text();
    const focus = await (await get("/specimen/cta-band?style=paper&state=focus")).text();
    expect(plain).not.toContain("nl-force");
    expect(hover).toContain('data-forced-state="hover"');
    expect(hover).toMatch(/<a [^>]*class="nl-force-hover /);
    expect(focus).toContain(".nl-force-focus");
    const page = await (await get("/components/cta-band")).text();
    expect(page).toContain("state=hover");
    expect(await (await get("/components/stat-row")).text()).not.toContain("state=hover");
  });

    test("a specimen that can't render says so", async () => {
    const missingExample = await get("/specimen/hero-split?example=9");
    expect(missingExample.status).toBe(404);
    expect(await missingExample.text()).toContain("Specimen failed to render");
    const noDark = await get("/specimen/hero-split?style=signal&mode=dark");
    expect(await noDark.text()).toContain("Signal has no dark mode");
  });

  test("a render failure shows a notice without server details", async () => {
    const c = await loadCatalogue();
    const broken = { ...c, components: [{ ...c.components[0]!, id: "not-on-disk" }] };
    const handle = createHandler(async () => broken);
    const originalError = console.error;
    console.error = () => {};
    try {
      const res = await handle(new Request("http://site.test/specimen/not-on-disk"));
      const html = await res.text();
      expect(res.status).toBe(500);
      expect(html).toContain("Specimen failed to render");
      expect(html).not.toContain(ROOT);
      expect(html).not.toContain("component.tsx");
    } finally {
      console.error = originalError;
    }
  });

  test("the style page shows missing values instead of inventing them", async () => {
    const html = await (await get("/styles/signal")).text();
    expect(html).toContain("colors.light.focus");
    expect(html).toContain("doesn&#x27;t define a dark mode");
  });

  test("catalogue.json is the published data artifact, without local paths", async () => {
    const res = await get("/catalogue.json");
    const body = (await res.json()) as { schemaVersion: number; components: Array<{ source: string }> };
    expect(body.schemaVersion).toBe(1);
    expect(body.components[0]?.source).toContain("export function");
    const raw = JSON.stringify(body);
    expect(raw).not.toContain(ROOT);
    expect(raw).not.toContain("/Users/");
  });
});

describe("marketing site", () => {
  test("the home page has the pitch, two waitlist forms, and live catalogue counts", async () => {
    const html = await (await get("/")).text();
    expect(html).toContain("Get the pull request.");
    expect(html.match(/data-waitlist/g)).toHaveLength(2);
    expect(html).toContain('href="/components"');
    const joined = await (await get("/?waitlist=joined")).text();
    expect(joined).toContain("You&#x27;re on the list.");
  });

  test("pages from the earlier site redirect", async () => {
    for (const [from, to] of [["/catalog", "/styles"], ["/flows", "/components"], ["/scanner", "/"], ["/favicon.ico", "/assets/favicon.svg"]]) {
      const res = await fetch(new URL(from!, server.url), { redirect: "manual" });
      expect(`${from} ${res.status} ${res.headers.get("location")}`).toBe(`${from} 301 ${to}`);
    }
  });

  test("/api/sse and /api/health keep answering for older clients and health checks", async () => {
    const init = await fetch(new URL("/api/sse", server.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(init.status).toBe(200);
    expect((await get("/api/health")).status).toBe(200);
    expect((await get("/assets/favicon.svg")).headers.get("content-type")).toBe("image/svg+xml");
    // The earlier site also answered GET on both paths with 405; there was never a working SSE stream.
    expect((await fetch(new URL("/api/sse", server.url), { headers: { Accept: "text/event-stream" } })).status).toBe(405);
  });
});

describe("waitlist", () => {
  const dir = mkdtempSync(join(tmpdir(), "waitlist-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test("parseEmail normalizes and rejects", () => {
    expect(parseEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    for (const bad of ["", "not-an-email", "a@b", "a b@example.com", `${"x".repeat(250)}@example.com`]) expect(parseEmail(bad)).toBeNull();
  });

  test("appends one line per new address and ignores repeats", async () => {
    const file = join(dir, "nested", "waitlist.jsonl");
    expect(await addToWaitlist(file, "ada@example.com", new Date("2026-09-22T00:00:00Z"))).toBe("added");
    expect(await addToWaitlist(file, "ada@example.com")).toBe("exists");
    expect(await addToWaitlist(file, "grace@example.com")).toBe("added");
    const lines = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { email: string; at: string });
    expect(lines.map((l) => l.email)).toEqual(["ada@example.com", "grace@example.com"]);
    expect(lines[0]!.at).toBe("2026-09-22T00:00:00.000Z");
  });

  test("rate limiter allows a few requests per window per key", () => {
    const limiter = new RateLimiter(2, 60_000);
    expect([limiter.allow("ip", 0), limiter.allow("ip", 1), limiter.allow("ip", 2), limiter.allow("other", 2), limiter.allow("ip", 60_001)]).toEqual([true, true, false, true, true]);
  });

  test("JSON posts get JSON replies; plain form posts redirect home with the outcome", async () => {
    const file = join(dir, "handler.jsonl");
    const post = (body: string, type: string) =>
      handleWaitlist(new Request("http://site.test/api/waitlist", { method: "POST", headers: { "Content-Type": type }, body }), { file, limiter: new RateLimiter(100, 60_000) });

    const json = await post(JSON.stringify({ email: "ada@example.com" }), "application/json");
    expect(json.status).toBe(200);
    expect(await json.json()).toEqual({ ok: true });

    const bad = await post(JSON.stringify({ email: "nope" }), "application/json");
    expect(bad.status).toBe(400);

    const form = await post("email=grace%40example.com&website=", "application/x-www-form-urlencoded");
    expect(form.status).toBe(303);
    expect(form.headers.get("location")).toBe("/?waitlist=joined#waitlist");

    const badForm = await post("email=nope", "application/x-www-form-urlencoded");
    expect(badForm.headers.get("location")).toBe("/?waitlist=invalid#waitlist");

    const bot = await post(JSON.stringify({ email: "bot@example.com", website: "x" }), "application/json");
    expect(bot.status).toBe(200);

    expect(readFileSync(file, "utf8").trim().split("\n").map((l) => (JSON.parse(l) as { email: string }).email)).toEqual(["ada@example.com", "grace@example.com"]);
  });

  test("simultaneous signups for the same address append it once", async () => {
    const file = join(dir, "concurrent.jsonl");
    const results = await Promise.all(Array.from({ length: 10 }, () => addToWaitlist(file, "same@example.com")));
    expect(results.filter((r) => r === "added")).toHaveLength(1);
    expect(readFileSync(file, "utf8").trim().split("\n")).toHaveLength(1);
  });

  test("an unreadable list fails the signup instead of skipping the duplicate check", async () => {
    const unreadable = join(dir, "is-a-directory");
    mkdirSync(unreadable);
    await expect(addToWaitlist(unreadable, "ada@example.com")).rejects.toThrow();
    const originalError = console.error;
    console.error = () => {};
    try {
      const res = await handleWaitlist(
        new Request("http://site.test/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ada@example.com" }) }),
        { file: unreadable, limiter: new RateLimiter(100, 60_000) },
      );
      expect(res.status).toBe(503);
      expect(await res.text()).not.toContain(dir);
    } finally {
      console.error = originalError;
    }
  });

  test("the limiter answers 429", async () => {
    const limiter = new RateLimiter(1, 60_000);
    const req = () => new Request("http://site.test/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    await handleWaitlist(req(), { file: join(dir, "limit.jsonl"), limiter });
    expect((await handleWaitlist(req(), { file: join(dir, "limit.jsonl"), limiter })).status).toBe(429);
  });
});

describe("clean consumer fixture", () => {
  test("the exported files render the same markup and need no CSS the specimen lacks", async () => {
    const c = await loadCatalogue();
    const specimenCss = readFileSync(join(ROOT, "dist/specimen.css"), "utf8");
    for (const component of c.components) {
      const pkg = themePackage(c, component, c.styles.find((s) => s.id === "paper")!);
      const dir = mkdtempSync(join(tmpdir(), "consumer-"));
      try {
        // A consumer app has React and Tailwind installed and nothing from this repo.
        symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"));
        for (const file of pkg.files) {
          mkdirSync(join(dir, file.path, ".."), { recursive: true });
          writeFileSync(join(dir, file.path), file.contents);
        }
        for (const example of component.examples) {
          const consumer = await renderComponent(component, example.props, join(dir, pkg.files[0]!.path));
          expect(consumer).toBe(await renderComponent(component, example.props));
        }
        writeFileSync(join(dir, "app.css"), `@import "tailwindcss";\n@source "./components";\n`);
        await $`${join(ROOT, "node_modules/.bin/tailwindcss")} -i app.css -o out.css --minify`.cwd(dir).quiet();
        const consumerCss = readFileSync(join(dir, "out.css"), "utf8");
        // Class names at the start of each selector, such as .md\:grid-cols-3 or .bg-\[color\:var\(--nl-accent\)\].
        const rules = (css: string) => new Set([...css.matchAll(/(?<=[{},]|^)\.((?:[a-zA-Z_-]|\\.)(?:[\w-]|\\.)*)/g)].map((m) => m[1]));
        const specimenRules = rules(specimenCss);
        expect(rules(consumerCss).size).toBeGreaterThan(20);
        const missing = [...rules(consumerCss)].filter((rule) => !specimenRules.has(rule));
        expect(`${component.id}: ${missing.join(" ")}`).toBe(`${component.id}: `);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  }, 60_000);
});
