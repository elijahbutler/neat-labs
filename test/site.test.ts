import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { loadCatalogue } from "../src/catalogue/load";
import { themePackage } from "../src/catalogue/theme";
import { renderComponent } from "../src/site/render";
import { createHandler } from "../src/site/server";

const ROOT = join(import.meta.dir, "..");
let server: ReturnType<typeof Bun.serve>;
const get = (path: string) => fetch(new URL(path, server.url));

beforeAll(() => {
  server = Bun.serve({ port: 0, fetch: createHandler() });
});
afterAll(() => server.stop(true));

describe("site", () => {
  test("pages answer", async () => {
    for (const path of ["/", "/?q=pricing", "/?type=faq", "/components/hero-split", "/components/hero-split?style=signal&example=1", "/styles", "/styles/signal", "/connect", "/health"]) {
      expect(`${path} ${(await get(path)).status}`).toBe(`${path} 200`);
    }
    for (const path of ["/components/nope", "/styles/nope", "/nope"]) expect((await get(path)).status).toBe(404);
  });

  test("search filters the grid", async () => {
    const html = await (await get("/?type=faq")).text();
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
    expect(html).toContain(themePackage(c, component, style).themeCss);
    expect(html).toContain(await renderComponent(component, component.examples[1]!.props));
  });

  test("a specimen that can't render says so", async () => {
    const missingExample = await get("/specimen/hero-split?example=9");
    expect(missingExample.status).toBe(404);
    expect(await missingExample.text()).toContain("Specimen failed to render");
    const noDark = await get("/specimen/hero-split?style=signal&mode=dark");
    expect(await noDark.text()).toContain("Signal has no dark mode");
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
