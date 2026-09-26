// Static previews of interaction states. The component's own compiled :hover and :focus-visible rules are rewritten to
// classes, and those classes are added to every link, button, and summary in the specimen. Nothing here is part of the
// exported package; it only changes how the preview is drawn.

export type ForcedState = "hover" | "focus";

const PSEUDO: Record<ForcedState, RegExp> = { hover: /:hover\b/g, focus: /:focus-visible\b/g };
export const FORCE_CLASS: Record<ForcedState, string> = { hover: "nl-force-hover", focus: "nl-force-focus" };

interface Block {
  prelude: string;
  body: string;
}

/** Split minified CSS into its top-level blocks: `prelude{body}`. */
function blocks(css: string): Block[] {
  const out: Block[] = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    // A statement such as @charset or @import ends in ";" before any "{".
    const semi = css.indexOf(";", i);
    if (semi !== -1 && semi < open && css.slice(i, semi).trim().startsWith("@")) {
      i = semi + 1;
      continue;
    }
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    out.push({ prelude: css.slice(i, open).trim(), body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

/**
 * The rules that apply in `state`, with the pseudo-class replaced by a class. `@layer` and `@media (hover:hover)` are
 * unwrapped, so the forced rules win over the base utilities and also show on touch screens; other at-rules, such as
 * breakpoints, are kept.
 */
export function forcedStateCss(css: string, state: ForcedState): string {
  const pseudo = PSEUDO[state];
  const cls = `.${FORCE_CLASS[state]}`;
  const walk = (source: string): string =>
    blocks(source)
      .map(({ prelude, body }) => {
        if (prelude.startsWith("@")) {
          const inner = walk(body);
          if (!inner) return "";
          if (prelude.startsWith("@layer") || /^@media\s*\(hover:\s*hover\)$/.test(prelude)) return inner;
          if (prelude.startsWith("@media") || prelude.startsWith("@supports") || prelude.startsWith("@container")) return `${prelude}{${inner}}`;
          return "";
        }
        pseudo.lastIndex = 0;
        if (!pseudo.test(prelude)) return "";
        return `${prelude.replace(pseudo, cls)}{${body}}`;
      })
      .join("");
  return walk(css);
}

/** Add the state class to every link, button, and summary in server-rendered markup. */
export function forceStateMarkup(html: string, state: ForcedState): string {
  const cls = FORCE_CLASS[state];
  return html.replace(/<(a|button|summary)(\s[^>]*)?>/g, (tag, name: string, attrs = "") => {
    if (/\sclass="/.test(attrs)) return `<${name}${attrs.replace(/\sclass="/, ` class="${cls} `)}>`;
    return `<${name} class="${cls}"${attrs}>`;
  });
}

/** Whether a component has anything these states apply to. */
export function hasInteractiveElements(source: string): boolean {
  return /<(a|button|summary)[\s>]/.test(source);
}
