import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  catalogueInfoSchema,
  COLOR_ROLES,
  componentMetaSchema,
  SCHEMA_VERSION,
  styleSchema,
  TOKEN_ROLES,
  type Catalogue,
  type ComponentRecord,
  type StyleRecord,
  type StyleSpec,
  type TokenRole,
} from "./schema";

export const CATALOGUE_DIR = join(import.meta.dir, "..", "..", "catalogue");

const REQUIRES = { react: ">=18", tailwindcss: ">=4" };

export class CatalogueError extends Error {
  constructor(public readonly problems: string[]) {
    super(`The catalogue is invalid:\n${problems.map((p) => `- ${p}`).join("\n")}`);
  }
}

const hash = (...parts: string[]) => {
  const h = createHash("sha256");
  for (const part of parts) h.update(part).update("\0");
  return h.digest("hex").slice(0, 12);
};

const zodProblems = (where: string, error: { issues: Array<{ path: PropertyKey[]; message: string }> }) =>
  error.issues.map((issue) => `${where}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);

/** Token roles a component reads, found by scanning for var(--nl-*). */
export function tokensUsed(source: string): string[] {
  return [...new Set([...source.matchAll(/var\(--nl-([a-z-]+)\)/g)].map((m) => m[1]!))].sort();
}

export function missingFields(style: StyleSpec): string[] {
  const missing: string[] = [];
  for (const role of COLOR_ROLES) if (style.colors.light[role] === null) missing.push(`colors.light.${role}`);
  if (style.colors.dark === null) missing.push("colors.dark");
  else for (const role of COLOR_ROLES) if (style.colors.dark[role] === null) missing.push(`colors.dark.${role}`);
  if (style.radius === null) missing.push("radius");
  if (style.spacing.base === null) missing.push("spacing.base");
  if (style.spacing.sectionY === null) missing.push("spacing.sectionY");
  return missing;
}

async function readJson(path: string, problems: string[]): Promise<unknown> {
  try {
    return await Bun.file(path).json();
  } catch (error) {
    problems.push(`${path}: ${(error as Error).message}`);
    return undefined;
  }
}

/** Read, validate, and hash the catalogue. Throws CatalogueError listing every problem, not just the first. */
export async function loadCatalogue(dir = CATALOGUE_DIR): Promise<Catalogue> {
  const problems: string[] = [];
  const info = catalogueInfoSchema.safeParse(await readJson(join(dir, "catalogue.json"), problems));
  if (!info.success) problems.push(...zodProblems("catalogue.json", info.error));

  const components: ComponentRecord[] = [];
  for (const entry of readdirSync(join(dir, "components"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const where = `components/${entry.name}`;
    const metaText = await Bun.file(join(dir, where, "meta.json")).text().catch(() => null);
    const source = await Bun.file(join(dir, where, "component.tsx")).text().catch(() => null);
    if (metaText === null || source === null) {
      problems.push(`${where}: needs meta.json and component.tsx`);
      continue;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(metaText);
    } catch (error) {
      problems.push(`${where}/meta.json: ${(error as Error).message}`);
      continue;
    }
    const meta = componentMetaSchema.safeParse(raw);
    if (!meta.success) {
      problems.push(...zodProblems(`${where}/meta.json`, meta.error));
      continue;
    }
    if (meta.data.id !== entry.name) problems.push(`${where}: id "${meta.data.id}" must match the directory name`);
    if (!new RegExp(`export function ${meta.data.export}\\b`).test(source)) problems.push(`${where}: component.tsx has no "export function ${meta.data.export}"`);
    if (/^\s*import\s/m.test(source)) problems.push(`${where}: component.tsx must not import anything; list requirements in meta.json instead`);
    const tokens = tokensUsed(source);
    const unknown = tokens.filter((t) => !(TOKEN_ROLES as readonly string[]).includes(t));
    if (unknown.length) problems.push(`${where}: unknown token roles ${unknown.map((t) => `--nl-${t}`).join(", ")}`);
    components.push({ ...meta.data, revision: hash(metaText, source), source, tokens: tokens as TokenRole[], requires: REQUIRES });
  }

  const styles: StyleRecord[] = [];
  for (const file of readdirSync(join(dir, "styles")).filter((f) => f.endsWith(".json"))) {
    const where = `styles/${file}`;
    const text = await Bun.file(join(dir, where)).text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (error) {
      problems.push(`${where}: ${(error as Error).message}`);
      continue;
    }
    const style = styleSchema.safeParse(raw);
    if (!style.success) {
      problems.push(...zodProblems(where, style.error));
      continue;
    }
    if (`${style.data.id}.json` !== file) problems.push(`${where}: id "${style.data.id}" must match the file name`);
    for (const role of ["canvas", "ink"] as const) {
      if (style.data.colors.light[role] === null) problems.push(`${where}: colors.light.${role} is required`);
    }
    styles.push({ ...style.data, revision: hash(text), missing: missingFields(style.data) });
  }

  if (problems.length || !info.success) throw new CatalogueError(problems);
  components.sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
  styles.sort((a, b) => a.id.localeCompare(b.id));
  return { schemaVersion: SCHEMA_VERSION, version: info.data.version, released: info.data.released, components, styles };
}

let cached: Promise<Catalogue> | null = null;

/** The catalogue in this checkout, loaded once per process. */
export function catalogue(): Promise<Catalogue> {
  cached ??= loadCatalogue();
  return cached;
}
