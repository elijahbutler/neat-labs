import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { forcedStateCss, forceStateMarkup, hasInteractiveElements } from "../src/site/states";

describe("forced states", () => {
  test("rewrites hover and focus-visible rules, unwraps layers and hover media, keeps breakpoints", () => {
    const css = '@layer utilities{.a:hover{color:red}.b{color:blue}@media (hover:hover){.c:hover{opacity:.9}}@media (width>=48rem){.md\\:d:hover{color:green}}.e:focus-visible{outline-width:2px}}';
    expect(forcedStateCss(css, "hover")).toBe(".a.nl-force-hover{color:red}.c.nl-force-hover{opacity:.9}@media (width>=48rem){.md\\:d.nl-force-hover{color:green}}");
    expect(forcedStateCss(css, "focus")).toBe(".e.nl-force-focus{outline-width:2px}");
  });

  test("the real catalogue CSS yields hover and focus rules", () => {
    const css = readFileSync(join(import.meta.dir, "..", "dist", "specimen.css"), "utf8");
    const hover = forcedStateCss(css, "hover");
    const focus = forcedStateCss(css, "focus");
    expect(hover).toContain(".hover\\:opacity-90.nl-force-hover{opacity:.9}");
    expect(focus).toContain(".nl-force-focus");
    expect(hover).not.toContain(":hover");
    expect(focus).not.toContain(":focus-visible");
  });

  test("adds the class to links, buttons, and summaries only", () => {
    const html = '<section class="x"><a href="#" class="btn">A</a><button type="button">B</button><summary>C</summary><abbr>D</abbr></section>';
    expect(forceStateMarkup(html, "hover")).toBe('<section class="x"><a href="#" class="nl-force-hover btn">A</a><button class="nl-force-hover" type="button">B</button><summary class="nl-force-hover">C</summary><abbr>D</abbr></section>');
  });

  test("knows which components have interactive elements", () => {
    expect(hasInteractiveElements("<a href={x}>")).toBe(true);
    expect(hasInteractiveElements("<summary className=\"x\">")).toBe(true);
    expect(hasInteractiveElements("<article><abbr>x</abbr></article>")).toBe(false);
  });
});
