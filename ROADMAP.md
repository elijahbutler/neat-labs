# Roadmap

This repository is neatlabs.design: the marketing site, the library, and the hosted MCP server. The editor's roadmap lives in its own private repository.

Status as of 2026-09-26, catalogue 0.1.0. "Done" means the acceptance check was run and passed. The site has been live on neatlabs.design since 2026-09-26.

| ID | Work | Acceptance | Status |
| --- | --- | --- | --- |
| L01 | Provenance-cleared seed catalogue | Every published component and style has a permission record; unknown items are absent from Git, website pages, and MCP responses. | Done for 0.1.0: 7 original components and 3 original styles. The loader rejects items without a record. Imported collections were left out. |
| L02 | Shared catalogue model | Website and MCP return the same stable IDs, revisions, code, requirements, token roles, and provenance; schema checks reject incomplete entries. | Done. One loader feeds the site, `/catalogue.json`, and both MCP transports. Tests cover rejected entries. |
| L03 | Rendered component specimens | Each component detail page renders the actual exported source in an isolated specimen, with desktop and phone widths, light and dark modes when supported, and visible interaction states. A clean consumer fixture renders the same result. Show a clear failure state instead of an empty preview. | Done. Specimens render the same file that is published, in sandboxed frames at 1280px and 390px, light and dark. Prop-driven states (FAQ open, surface tone, no highlight) have their own examples. Hover and keyboard focus have static captures that switch on the component's own compiled `:hover` and `:focus-visible` rules. The consumer fixture test compares markup and CSS. |
| L04 | Component browsing | Cards show a real preview rather than code alone. A detail page shows the preview, source, required CSS, dependencies, accessible behavior, and a copy or install path. Search and filters work on the approved catalogue. | Done. Search, type filter, and preview style work without JavaScript. |
| L05 | Style-guideline pages | Each permitted style has labelled color swatches with exact values and semantic roles, type specimens, spacing and radius examples, and concise do-and-don't guidance when evidence supports it. Mark inferred or missing values; do not present fallbacks as authentic brand rules. | Done. Missing values are shown as missing, and inferred values are listed when a style declares them (none in 0.1.0). |
| L06 | Theme comparison | Select a permitted style and see one component rendered with that style's complete export package. Show unresolved mappings, missing fonts, and required CSS beside the specimen. The preview must match the downloadable or copyable code. | Done. Each component page also shows the component in every style. |
| L07 | Public MCP and connection guide | A read-only server returns the approved catalogue and preview links; tested setup instructions work in at least two agent clients. The old endpoint remains compatible during cutover. | Done. Live at https://neatlabs.design/api/mcp (and `/api/sse` for older configs). Checked on the live URL with the MCP SDK client, Claude Code 2.1.283, and Codex CLI 0.157.0. Older tool names work. |
| L08 | Visual and accessibility review | Capture desktop and phone views of catalogue, component, and style pages. Check keyboard interaction, contrast, reduced motion, loading, and broken font or asset states. Record what was inspected rather than treating typecheck as visual proof. | First pass done; see below. |

## L08 review, 2026-09-25

Inspected in headless Chrome against `bun run dev` on localhost.

- **Layouts.** Screenshots at 1440px and 390px of the catalogue, every component page, the three style pages, and the connect page. No page scrolls sideways at 390px. Two overflow bugs were found and fixed: grid cards took the 1280px frame's width, and a font URL didn't wrap.
- **Keyboard.** Tab order on a component page runs from the skip link through the header, the style and example controls, then into each preview frame. Every stop showed a 2px outline except the frame itself, which now has one. Inside specimens, Tab reaches the FAQ summary and Enter opens it; on the phone nav, Tab reaches Menu and Enter opens it.
- **Contrast.** Tests check text pairs at 4.5:1 in every mode. Style pages print the ratio for each swatch. Signal's yellow accent is 1.4:1 against white, so its guidelines say to put yellow buttons on black or give them a border.
- **Reduced motion.** The FAQ icon's rotation is the only motion, and it's off under `prefers-reduced-motion: reduce`.
- **Fonts.** Harbor names Inter without loading it; the component page lists that above the previews. Signal names system fonts that some devices won't have.
- **Failure states.** A specimen with a bad example or a missing dark mode shows a red "Specimen failed to render" message.

Later: frames now show "Loading preview" until the specimen paints, and component pages have static hover and focus captures. Both were checked in headless Chrome.

Not yet checked: a screen reader pass, and what happens when `specimen.css` fails to load (the component shows unstyled).

## Site

| ID | Work | Status |
| --- | --- | --- |
| S01 | Home page and waitlist moved from the earlier site, with an original theme | Done locally. Waitlist works with and without JavaScript and writes the same file format as before |
| S02 | Take over neatlabs.design | Done 2026-09-26. The existing Coolify app was repointed here, keeping the domain and the waitlist volume; pushes to `main` deploy |
| S03 | Link to the editor app once sign-in exists | Planned. The editor is private and has no sign-in yet |

## Next

- Screen reader pass with VoiceOver.
- More components, each with its own permission record.
- Link to the editor once sign-in exists (S03).
