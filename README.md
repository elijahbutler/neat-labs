# Neat Labs Library

React and Tailwind page sections and style guidelines, each rendered on the site before you copy it. A read-only MCP server gives coding agents the same catalogue.

- **Components** are copyable source files: no imports, no client JavaScript, styled through `--nl-*` CSS variables.
- **Styles** set those variables: color roles for light and dark, type with font licenses, radius, section spacing, and written do and don't rules. When a style leaves a value out, the site and the MCP server say so. They don't fill it in.
- **Every item has a permission record.** See [PROVENANCE.md](PROVENANCE.md). The first release, catalogue 0.1.0, has 7 components and 3 styles, all written for this repository.

The catalogue is a set of references. The [Neat Labs editor](https://neatlabs.design) and your own agents should adapt a component to the components and tokens a project already has, not paste it in unchanged.

## Run it

```sh
bun install
bun run dev        # builds the CSS, then serves the site on http://localhost:3100
bun run check      # validate the catalogue, typecheck, build CSS, run tests
```

| Path | What it is |
| --- | --- |
| `/` | Components, with search, type filter, and a preview style |
| `/components/:id` | Desktop and phone previews in light and dark, the copyable files, requirements, token roles, accessibility notes, and the same component in every style |
| `/styles/:id` | Swatches with roles, hex values, and contrast; type specimens; radius and spacing; guidelines; missing fields |
| `/specimen/:id?style=&mode=&example=` | The isolated page each preview frame loads |
| `/catalogue.json` | The whole validated catalogue, for programs such as the Neat Labs editor |
| `/api/mcp` | The MCP server over Streamable HTTP |
| `/connect` | Client setup |

## MCP

The server is read-only and stateless. It returns catalogue data and preview links, and has no access to repositories, files, or accounts.

| Tool | Returns |
| --- | --- |
| `search_components` | IDs, revisions, token roles, and preview links, filtered by keyword and type |
| `get_component` | Source, requirements, token roles, accessibility notes, provenance. With `style`, also `theme.css`, unresolved tokens, and font status |
| `list_styles` | Styles with light swatches, modes, and missing fields |
| `get_style` | Color roles per mode, typography and font licenses, radius, spacing, guidelines, provenance |
| `find_components`, `theme_component` | Older names from `neatlabs.design/api/mcp`, kept so existing configurations still work. `brand` takes a style ID |

Hosted, with Claude Code:

```sh
claude mcp add --transport http neat-labs-library https://<site>/api/mcp
```

Local, over stdio:

```sh
claude mcp add neat-labs-library -- bun run /path/to/neat-labs-library/src/mcp/stdio.ts
```

Set `NEAT_LIBRARY_URL` for the stdio server if you want it to return preview links; without it, `previewUrl` is `null`.

Tested on 2026-09-25 against a local server with MCP SDK 1.30.1 (in `test/mcp.test.ts`), Claude Code 2.1.283 over HTTP and stdio, and Codex CLI 0.157.0 over HTTP. The public host isn't deployed yet.

## Layout

```
catalogue/
  catalogue.json               version and release date
  components/<id>/component.tsx
  components/<id>/meta.json    type, summary, examples, states, accessibility notes, provenance
  styles/<id>.json             colors, typography, radius, spacing, guidelines, provenance
src/catalogue/                 schema, loader, theme export
src/mcp/                       tool definitions, HTTP and stdio transports
src/site/                      server-rendered pages and specimens
```

Revisions are content hashes of each item's files, so a changed component gets a new revision. The loader rejects entries with missing fields, unknown token roles, imports in component source, or no permission record.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Items without a clear right to redistribute aren't accepted, however useful they are.

## License

MIT, in [LICENSE](LICENSE). Fonts named by styles are not bundled and keep their own licenses, listed on each style page.
