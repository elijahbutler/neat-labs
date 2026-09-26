import { COLOR_ROLES, type Catalogue, type ColorRole, type ColorSet, type ComponentRecord, type StyleRecord, type TokenRole } from "./schema";

export type Mode = "light" | "dark";

export interface Unresolved {
  token: string;
  reason: string;
  /** What theme.css uses instead. Never presented as part of the style. */
  fallback: string;
}

export interface FontUse {
  role: "display" | "sans" | "mono";
  family: string;
  stack: string;
  license: string;
  status: "loaded" | "system" | "not loaded";
  /** <link> tag to put in the document head when status is "loaded". */
  link: string | null;
  note: string;
}

export interface ThemePackage {
  catalogueVersion: string;
  component: { id: string; revision: string; export: string };
  style: { id: string; revision: string; modes: Mode[] };
  files: Array<{ path: string; contents: string }>;
  themeCss: string;
  tokens: TokenRole[];
  requires: ComponentRecord["requires"];
  unresolved: Unresolved[];
  fonts: FontUse[];
  instructions: string[];
}

const COLOR_FALLBACK: Record<ColorRole, ColorRole | null> = {
  canvas: null,
  ink: null,
  surface: "canvas",
  muted: "ink",
  line: "muted",
  accent: "ink",
  "accent-ink": "canvas",
  focus: "ink",
};

const SYSTEM_FIRST = /^(ui-|system-ui|-apple-system|serif|sans-serif|monospace)/;

function fontUse(style: StyleRecord, role: FontUse["role"]): FontUse {
  const spec = style.typography[role];
  const first = spec.stack.split(",")[0]!.trim();
  if (spec.load) {
    return {
      role, family: spec.family, stack: spec.stack, license: spec.license, status: "loaded",
      link: `<link rel="stylesheet" href="${spec.load}">`,
      note: `Add the link tag to your document head to load ${spec.family}.`,
    };
  }
  if (SYSTEM_FIRST.test(first)) {
    return { role, family: spec.family, stack: spec.stack, license: spec.license, status: "system", link: null, note: "Uses the viewer's system font. Nothing to load." };
  }
  const fallback = spec.stack.split(",").slice(1).map((s) => s.trim()).join(", ");
  return {
    role, family: spec.family, stack: spec.stack, license: spec.license, status: "not loaded", link: null,
    note: `${spec.family} isn't loaded by this package. It shows only where the font is installed; elsewhere the stack falls back to ${fallback}.`,
  };
}

/** One color declaration. A missing role follows the fallback chain, is recorded, and is labelled in the CSS. */
function colorLine(set: ColorSet, role: ColorRole, mode: Mode, styleName: string, unresolved: Unresolved[]): string {
  const value = set[role];
  if (value) return `  --nl-${role}: ${value};`;
  let next = COLOR_FALLBACK[role];
  while (next && !set[next]) next = COLOR_FALLBACK[next];
  const fallback = next ? `var(--nl-${next})` : "currentColor";
  unresolved.push({ token: `--nl-${role}${mode === "dark" ? " (dark)" : ""}`, reason: `${styleName} has no ${role} color${mode === "dark" ? " in dark mode" : ""}.`, fallback });
  return `  --nl-${role}: ${fallback}; /* fallback: not part of the style */`;
}

/** Build the export package for one component in one style. The site's specimen renders exactly this CSS and source. */
export function themePackage(catalogue: Catalogue, component: ComponentRecord, style: StyleRecord): ThemePackage {
  const unresolved: Unresolved[] = [];
  const colorRoles = COLOR_ROLES.filter((role) => component.tokens.includes(role));
  const light: string[] = [];
  const other: string[] = [];

  for (const role of colorRoles) light.push(colorLine(style.colors.light, role, "light", style.name, unresolved));

  const fonts: FontUse[] = [];
  for (const role of ["display", "sans", "mono"] as const) {
    if (!component.tokens.includes(`font-${role}`)) continue;
    const use = fontUse(style, role);
    fonts.push(use);
    other.push(`  --nl-font-${role}: ${use.stack};`);
  }
  if (component.tokens.includes("radius")) {
    if (style.radius) other.push(`  --nl-radius: ${style.radius};`);
    else {
      unresolved.push({ token: "--nl-radius", reason: `${style.name} has no corner radius.`, fallback: "0px" });
      other.push("  --nl-radius: 0px; /* fallback: not part of the style */");
    }
  }
  if (component.tokens.includes("section-y")) {
    if (style.spacing.sectionY) other.push(`  --nl-section-y: ${style.spacing.sectionY};`);
    else {
      unresolved.push({ token: "--nl-section-y", reason: `${style.name} has no section spacing.`, fallback: "96px" });
      other.push("  --nl-section-y: 96px; /* fallback: not part of the style */");
    }
  }

  const modes: Mode[] = style.colors.dark ? ["light", "dark"] : ["light"];
  const dark: string[] = [];
  if (style.colors.dark) {
    for (const role of colorRoles) dark.push(colorLine(style.colors.dark, role, "dark", style.name, unresolved));
  } else {
    unresolved.push({ token: "dark mode", reason: `${style.name} has no dark mode.`, fallback: "Light values in every mode" });
  }

  const themeCss = [
    `/* Neat Labs theme "${style.id}" (revision ${style.revision}) for ${component.id} (revision ${component.revision}), catalogue ${catalogue.version}. */`,
    `:root {`,
    ...light,
    ...other,
    `}`,
    ...(dark.length ? [``, `[data-theme="dark"] {`, ...dark, `}`] : []),
    ``,
  ].join("\n");

  const cssPath = `styles/neat-${style.id}.css`;
  const instructions = [
    `Save ${component.export}.tsx with your components and ${cssPath} with your styles.`,
    `Import ${cssPath} once, after @import "tailwindcss" in your global stylesheet.`,
    "Make sure Tailwind scans the folder that holds the component.",
    ...(modes.includes("dark") ? ['For dark mode, set data-theme="dark" on the <html> element.'] : []),
    ...fonts.filter((f) => f.link).map((f) => `Add ${f.link} to the document head.`),
  ];

  return {
    catalogueVersion: catalogue.version,
    component: { id: component.id, revision: component.revision, export: component.export },
    style: { id: style.id, revision: style.revision, modes },
    files: [
      { path: `components/${component.export}.tsx`, contents: component.source },
      { path: cssPath, contents: themeCss },
    ],
    themeCss,
    tokens: component.tokens,
    requires: component.requires,
    unresolved,
    fonts,
    instructions,
  };
}
