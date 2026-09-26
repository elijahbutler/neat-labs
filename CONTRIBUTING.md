# Contributing

Thanks for looking. The catalogue is small on purpose, and every item has to be something we can prove we may publish.

## What we accept

- Components you wrote, or that you can show are under a license that allows redistribution. Include the license text or a link to it at a specific commit.
- Styles you designed. Styles copied or estimated from a real brand's site aren't accepted, even with credit.
- Fixes to existing components: accessibility, responsive behavior, clearer copy.

## Rules for components

- One file, `component.tsx`, with one named export and no imports.
- Style everything through `--nl-*` variables using Tailwind arbitrary values, such as `bg-[color:var(--nl-surface)]`. The token roles are listed in `src/catalogue/schema.ts`.
- Server-renderable: no hooks, no event handlers. Use native elements such as `<details>` for disclosure.
- Visible focus styles on everything interactive, and motion only under `motion-safe:`.
- Placeholder copy about a made-up product. No real brand names, logos, or photographs.
- A `meta.json` with at least one example, accessibility notes, states, and a `provenance` record.

## Rules for styles

- Set every color role you can. Leave a role `null` rather than guessing; the site and MCP report it as missing.
- If you estimated a value instead of choosing it, add its path to `inferred`.
- Name fonts with their license. Only add a `load` URL for fonts whose license allows that use.
- Text pairs must reach 4.5:1 contrast. The tests check this.

## Before you open a pull request

```sh
bun run check
```

Then open the component or style page locally and look at it at desktop and phone widths, in light and dark.
