import type { Catalogue, ComponentRecord, StyleRecord } from "../catalogue/schema";
import { themePackage, type Mode } from "../catalogue/theme";
import { join } from "node:path";
import { renderComponent } from "./render";
import { forcedStateCss, forceStateMarkup, type ForcedState } from "./states";

const SPECIMEN_CSS = join(import.meta.dir, "..", "..", "dist", "specimen.css");
const forcedCache = new Map<ForcedState, Promise<string>>();

/** The catalogue's compiled state rules, rewritten so a class can switch them on. Read once per process. */
function forcedCss(state: ForcedState): Promise<string> {
  let css = forcedCache.get(state);
  if (!css) {
    css = Bun.file(SPECIMEN_CSS).text().then((text) => forcedStateCss(text, state)).catch(() => "");
    forcedCache.set(state, css);
  }
  return css;
}

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface SpecimenRequest {
  component: ComponentRecord;
  style: StyleRecord;
  mode: Mode;
  example: number;
  /** Draw every link, button, and summary in this state. Preview only. */
  state?: ForcedState;
}

function documentHtml(title: string, head: string, htmlAttrs: string, body: string, background = "#FFFFFF") {
  return `<!doctype html>
<html lang="en"${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(title)}</title>
${head}
</head>
<body style="margin:0;background:${background}">
${body}
</body>
</html>`;
}

/**
 * A standalone page with only the component, Tailwind's output for the catalogue, and the style's theme.css.
 * Failures render a visible message rather than an empty frame.
 */
export async function specimenHtml(catalogue: Catalogue, req: SpecimenRequest): Promise<{ status: number; html: string }> {
  const { component, style, mode } = req;
  const pkg = themePackage(catalogue, component, style);
  const example = component.examples[req.example];
  const title = `${component.name} in ${style.name} (${mode})`;
  if (!example) {
    return { status: 404, html: failure(title, `This component has no example ${req.example}.`) };
  }
  if (mode === "dark" && !pkg.style.modes.includes("dark")) {
    return { status: 404, html: failure(title, `${style.name} has no dark mode.`) };
  }
  let markup: string;
  try {
    markup = await renderComponent(component, example.props);
  } catch (error) {
    // The error can include server paths, so it goes to the log, not the page.
    console.error(`specimen ${component.id}@${component.revision}:`, error);
    return { status: 500, html: failure(title, `${component.name} threw an error while rendering. The error is in the server log.`) };
  }
  const head = [
    `<link rel="stylesheet" href="/assets/specimen.css">`,
    ...pkg.fonts.flatMap((f) => (f.link ? [f.link] : [])),
    `<style>\n${pkg.themeCss}</style>`,
    ...(req.state ? [`<style data-forced-state="${req.state}">${await forcedCss(req.state)}</style>`] : []),
  ].join("\n");
  if (req.state) markup = forceStateMarkup(markup, req.state);
  // The page behind the component uses the style's canvas, even when the component doesn't read --nl-canvas.
  const canvas = (mode === "dark" ? style.colors.dark : style.colors.light)?.canvas ?? "#FFFFFF";
  return { status: 200, html: documentHtml(title, head, mode === "dark" ? ' data-theme="dark"' : "", `<div data-specimen="${component.id}">${markup}</div>`, canvas) };
}

function failure(title: string, message: string) {
  return documentHtml(
    title,
    "",
    "",
    `<div role="alert" style="font:14px/1.5 ui-sans-serif,system-ui,sans-serif;padding:24px;margin:16px;border:2px dashed #B42318;color:#7A271A;background:#FEF3F2">
<strong>Specimen failed to render.</strong><br>${escape(message)}
</div>`,
  );
}
