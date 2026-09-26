import { z } from "zod";

/** Bump when a field is removed or changes meaning. Consumers check it before reading /catalogue.json. */
export const SCHEMA_VERSION = 1;

export const COLOR_ROLES = ["canvas", "surface", "ink", "muted", "line", "accent", "accent-ink", "focus"] as const;
export const TOKEN_ROLES = [...COLOR_ROLES, "font-display", "font-sans", "font-mono", "radius", "section-y"] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];
export type TokenRole = (typeof TOKEN_ROLES)[number];

export const ROLE_DESCRIPTIONS: Record<TokenRole, string> = {
  canvas: "Page background",
  surface: "Cards and raised panels",
  ink: "Primary text",
  muted: "Secondary text",
  line: "Borders and rules",
  accent: "Primary actions and highlights",
  "accent-ink": "Text and icons on the accent color",
  focus: "Keyboard focus outline",
  "font-display": "Headings and large figures",
  "font-sans": "Body text and controls",
  "font-mono": "Labels, numbers, and code",
  radius: "Corner radius for cards and buttons",
  "section-y": "Vertical padding for page sections",
};

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words joined by hyphens");
const hex = z.string().regex(/^#[0-9A-F]{6}$/, "Use a six-digit uppercase hex color");
const nonEmpty = z.string().trim().min(1);

export const provenanceSchema = z.strictObject({
  author: nonEmpty,
  origin: z.enum(["original", "third-party"]),
  /** SPDX identifier or the name of the written permission. */
  license: nonEmpty,
  /** What proves the right to publish: authorship note, license URL at a commit, or permission record. */
  evidence: z.string().trim().min(20),
  permittedUses: z.array(nonEmpty).min(1),
  /** Required for third-party items: the exact upstream location. */
  source: z.url().optional(),
}).refine((p) => p.origin === "original" || p.source, { message: "Third-party items need a source URL", path: ["source"] });

export const componentMetaSchema = z.strictObject({
  id: slug,
  type: z.enum(["nav", "hero", "features", "stat", "pricing", "faq", "cta", "testimonial", "footer", "logo-cloud"]),
  name: nonEmpty,
  summary: z.string().trim().min(20).max(200),
  /** Named export in component.tsx. */
  export: z.string().regex(/^[A-Z][A-Za-z0-9]*$/),
  tags: z.array(nonEmpty),
  accessibility: z.array(nonEmpty).min(1),
  states: z.array(z.strictObject({ name: nonEmpty, description: nonEmpty })),
  examples: z.array(z.strictObject({ name: nonEmpty, props: z.record(z.string(), z.unknown()) })).min(1),
  provenance: provenanceSchema,
});
export type ComponentMeta = z.infer<typeof componentMetaSchema>;

const colorSet = z.strictObject(Object.fromEntries(COLOR_ROLES.map((role) => [role, hex.nullable()])) as Record<ColorRole, z.ZodNullable<typeof hex>>);
export type ColorSet = z.infer<typeof colorSet>;

const font = z.strictObject({
  family: nonEmpty,
  stack: nonEmpty,
  weights: z.array(z.number().int().min(100).max(900)).min(1),
  license: nonEmpty,
  /** Stylesheet URL that loads the face, or null when the package doesn't load it. */
  load: z.url().nullable(),
});
export type FontSpec = z.infer<typeof font>;

const length = z.string().regex(/^\d+(\.\d+)?(px|rem)$/);

export const styleSchema = z.strictObject({
  id: slug,
  name: nonEmpty,
  summary: z.string().trim().min(20).max(200),
  colors: z.strictObject({ light: colorSet, dark: colorSet.nullable() }),
  typography: z.strictObject({ display: font, sans: font, mono: font }),
  radius: length.nullable(),
  spacing: z.strictObject({ base: length.nullable(), sectionY: length.nullable() }),
  guidelines: z.strictObject({ do: z.array(nonEmpty), dont: z.array(nonEmpty) }),
  /** JSON paths of values estimated rather than specified by the style's author. Shown as "inferred". */
  inferred: z.array(nonEmpty),
  provenance: provenanceSchema,
});
export type StyleSpec = z.infer<typeof styleSchema>;

export const catalogueInfoSchema = z.strictObject({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  released: z.iso.date(),
});

export interface ComponentRecord extends ComponentMeta {
  /** Content hash of meta.json and component.tsx. Changes whenever either changes. */
  revision: string;
  source: string;
  /** Token roles the source reads through var(--nl-*). */
  tokens: TokenRole[];
  requires: { react: string; tailwindcss: string };
}

export interface StyleRecord extends StyleSpec {
  revision: string;
  /** Fields the style leaves unset, as paths such as colors.dark or colors.light.focus. */
  missing: string[];
}

export interface Catalogue {
  schemaVersion: typeof SCHEMA_VERSION;
  version: string;
  released: string;
  components: ComponentRecord[];
  styles: StyleRecord[];
}
