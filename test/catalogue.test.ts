import { describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contrastRatio } from "../src/catalogue/contrast";
import { CATALOGUE_DIR, CatalogueError, loadCatalogue } from "../src/catalogue/load";
import { themePackage } from "../src/catalogue/theme";

/** Copy the catalogue, let the test break it, and return every problem the loader reports. */
async function problemsAfter(edit: (dir: string) => void): Promise<string[]> {
  const dir = mkdtempSync(join(tmpdir(), "catalogue-"));
  try {
    cpSync(CATALOGUE_DIR, dir, { recursive: true });
    edit(dir);
    await loadCatalogue(dir);
    return [];
  } catch (error) {
    if (error instanceof CatalogueError) return error.problems;
    throw error;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const editJson = (path: string, change: (value: Record<string, unknown>) => void) => {
  const value = JSON.parse(readFileSync(path, "utf8"));
  change(value);
  writeFileSync(path, JSON.stringify(value));
};

describe("catalogue", () => {
  test("loads with stable IDs and content revisions", async () => {
    const c = await loadCatalogue();
    expect(c.schemaVersion).toBe(1);
    expect(c.components.length).toBeGreaterThan(0);
    expect(new Set(c.components.map((x) => x.id)).size).toBe(c.components.length);
    for (const component of c.components) {
      expect(component.revision).toMatch(/^[0-9a-f]{12}$/);
      expect(component.tokens.length).toBeGreaterThan(0);
    }
    expect((await loadCatalogue()).components.map((x) => x.revision)).toEqual(c.components.map((x) => x.revision));
  });

  test("every published item carries a permission record", async () => {
    const c = await loadCatalogue();
    for (const item of [...c.components, ...c.styles]) {
      expect(item.provenance.evidence.length).toBeGreaterThan(20);
      if (item.provenance.origin === "third-party") expect(item.provenance.source).toBeString();
    }
  });

  test("a revision changes when the source changes", async () => {
    const before = (await loadCatalogue()).components.find((c) => c.id === "cta-band")!.revision;
    const dir = mkdtempSync(join(tmpdir(), "catalogue-"));
    cpSync(CATALOGUE_DIR, dir, { recursive: true });
    const file = join(dir, "components/cta-band/component.tsx");
    writeFileSync(file, readFileSync(file, "utf8").replace("Start a trial", "Try it"));
    const after = (await loadCatalogue(dir)).components.find((c) => c.id === "cta-band")!.revision;
    rmSync(dir, { recursive: true, force: true });
    expect(after).not.toBe(before);
  });

  test("rejects a component without a permission record", async () => {
    const problems = await problemsAfter((dir) => editJson(join(dir, "components/hero-split/meta.json"), (m) => delete m.provenance));
    expect(problems.join("\n")).toContain("components/hero-split/meta.json: provenance");
  });

  test("rejects a third-party item without a source URL", async () => {
    const problems = await problemsAfter((dir) =>
      editJson(join(dir, "styles/paper.json"), (s) => ((s.provenance as Record<string, unknown>).origin = "third-party")),
    );
    expect(problems.join("\n")).toContain("Third-party items need a source URL");
  });

  test("rejects unknown token roles, a missing export, imports, and unknown fields", async () => {
    const problems = await problemsAfter((dir) => {
      const file = join(dir, "components/cta-band/component.tsx");
      writeFileSync(file, `import x from "y";\n${readFileSync(file, "utf8").replace("--nl-surface", "--nl-sparkle").replace("export function CtaBand", "export function Other")}`);
      editJson(join(dir, "components/faq-disclosure/meta.json"), (m) => (m.extra = true));
    });
    const text = problems.join("\n");
    expect(text).toContain("--nl-sparkle");
    expect(text).toContain('no "export function CtaBand"');
    expect(text).toContain("must not import");
    expect(text).toContain("faq-disclosure/meta.json");
  });

  test("text color pairs meet WCAG AA in every published mode", async () => {
    const c = await loadCatalogue();
    const failures: string[] = [];
    for (const style of c.styles) {
      for (const [mode, set] of Object.entries(style.colors)) {
        if (!set) continue;
        const pairs: Array<[string, string]> = [["ink", "canvas"], ["ink", "surface"], ["muted", "canvas"], ["muted", "surface"], ["accent-ink", "accent"]];
        for (const [fg, bg] of pairs) {
          const a = set[fg as keyof typeof set];
          const b = set[bg as keyof typeof set];
          if (a && b && contrastRatio(a, b) < 4.5) failures.push(`${style.id} ${mode} ${fg} on ${bg}: ${contrastRatio(a, b).toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("theme package", () => {
  test("a complete style leaves nothing unresolved", async () => {
    const c = await loadCatalogue();
    const pkg = themePackage(c, c.components.find((x) => x.id === "hero-split")!, c.styles.find((s) => s.id === "paper")!);
    expect(pkg.unresolved).toEqual([]);
    expect(pkg.style.modes).toEqual(["light", "dark"]);
    expect(pkg.themeCss).toContain('[data-theme="dark"]');
    expect(pkg.fonts.find((f) => f.role === "display")!.status).toBe("loaded");
    for (const role of pkg.tokens) expect(pkg.themeCss).toContain(`--nl-${role}:`);
  });

  test("missing values are reported and labelled, not presented as the style", async () => {
    const c = await loadCatalogue();
    const pkg = themePackage(c, c.components.find((x) => x.id === "hero-split")!, c.styles.find((s) => s.id === "signal")!);
    expect(pkg.unresolved.map((u) => u.token)).toEqual(["--nl-focus", "--nl-section-y", "dark mode"]);
    expect(pkg.themeCss).toContain("--nl-focus: var(--nl-ink); /* fallback: not part of the style */");
    expect(pkg.themeCss).not.toContain("data-theme");
    expect(pkg.fonts.find((f) => f.role === "display")!.status).toBe("not loaded");
  });

  test("only tokens the component reads are exported", async () => {
    const c = await loadCatalogue();
    const pkg = themePackage(c, c.components.find((x) => x.id === "cta-band")!, c.styles.find((s) => s.id === "paper")!);
    expect(pkg.tokens).not.toContain("canvas");
    expect(pkg.themeCss).not.toContain("--nl-canvas");
  });
});
