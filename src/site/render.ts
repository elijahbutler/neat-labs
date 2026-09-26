import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CATALOGUE_DIR } from "../catalogue/load";
import type { ComponentRecord } from "../catalogue/schema";

/**
 * Render a catalogue component from the same file its published source is read from, so the preview and the copyable
 * code can't drift. `modulePath` lets a test render a copy of the exported source from somewhere else.
 */
export async function renderComponent(component: ComponentRecord, props: Record<string, unknown>, modulePath?: string): Promise<string> {
  const mod = (await import(modulePath ?? join(CATALOGUE_DIR, "components", component.id, "component.tsx"))) as Record<string, unknown>;
  const fn = mod[component.export];
  if (typeof fn !== "function") throw new Error(`component.tsx has no export named ${component.export}`);
  return renderToStaticMarkup(createElement(fn as ComponentType<Record<string, unknown>>, props));
}
