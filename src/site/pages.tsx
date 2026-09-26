import type { ReactNode } from "react";
import { ROLE_DESCRIPTIONS, type Catalogue, type ColorRole, type ComponentRecord, type StyleRecord } from "../catalogue/schema";
import { themePackage, type Mode, type ThemePackage } from "../catalogue/theme";
import { contrastRatio } from "../catalogue/contrast";
import { Layout } from "./layout";


const link = "link";
const label = "font-mono text-[11px] uppercase tracking-wider text-quiet";

function specimenSrc(component: ComponentRecord, style: StyleRecord, mode: Mode, example: number) {
  const params = new URLSearchParams({ style: style.id, mode, example: String(example) });
  return `/specimen/${component.id}?${params}`;
}

/** A scaled, sandboxed preview. site.js fits the frame to its container and to the specimen's height. */
function Frame({ src, width, caption, maxHeight, decorative, background }: { src: string; width: number; caption?: string; maxHeight?: number; decorative?: boolean; background?: string }) {
  const frame = (
    <div
      className={`frame relative overflow-hidden bg-page ${decorative ? "" : "rounded-[6px] border border-ink"}`}
      data-width={width}
      data-max-height={maxHeight}
      data-fixed={decorative ? "" : undefined}
      style={{ height: maxHeight ?? 480, background }}
    >
      <iframe
        src={src}
        title={caption ?? "Component preview"}
        loading="lazy"
        sandbox="allow-same-origin"
        tabIndex={decorative ? -1 : undefined}
        className="block origin-top-left border-0 focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-cobalt"
        style={{ width, height: maxHeight ?? 480 }}
      />
    </div>
  );
  if (decorative) return <div inert aria-hidden="true">{frame}</div>;
  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-4">
        <span className={label}>{caption}</span>
        <a className={`text-xs ${link}`} href={src} target="_blank" rel="noreferrer">Open alone</a>
      </figcaption>
      {frame}
    </figure>
  );
}

function Swatches({ style }: { style: StyleRecord }) {
  return (
    <span className="flex">
      {(["canvas", "surface", "ink", "accent", "line"] as const).map((role) => (
        <span key={role} title={`${role} ${style.colors.light[role] ?? "missing"}`} className="-ml-1 size-5 rounded-full border border-ink first:ml-0" style={{ background: style.colors.light[role] ?? "transparent" }} />
      ))}
    </span>
  );
}

function ComponentCard({ component, style }: { component: ComponentRecord; style: StyleRecord }) {
  return (
    <li className="group relative flex min-w-0 flex-col overflow-hidden rounded-[6px] border border-ink bg-page hover:border-cobalt">
      <Frame src={specimenSrc(component, style, "light", 0)} width={1280} maxHeight={220} decorative background={style.colors.light.canvas ?? undefined} />
      <div className="border-t border-ink p-4">
        <p className={label}>{component.type}</p>
        <h3 className="mt-1 font-semibold">
          <a href={`/components/${component.id}`} className="after:absolute after:inset-0">
            {component.name}
          </a>
        </h3>
        <p className="mt-1 text-sm text-quiet">{component.summary}</p>
      </div>
    </li>
  );
}

export function CataloguePage({ catalogue, results, query, type, style }: { catalogue: Catalogue; results: ComponentRecord[]; query: string; type: string; style: StyleRecord }) {
  const types = [...new Set(catalogue.components.map((c) => c.type))];
  return (
    <Layout title="Components" catalogue={catalogue}>
      <div className="max-w-3xl">
        <h1 className="display text-[clamp(40px,5.5vw,64px)]">Components you can see before you copy</h1>
        <p className="mt-4 text-lg text-quiet">
          Every card is the component's real source, rendered. Open one to see it at desktop and phone widths, in light and dark, and themed by any style.
          Coding agents get the same components and styles from the <a className={link} href="/connect">read-only MCP server</a>.
        </p>
      </div>
      <form action="/components" method="get" role="search" className="mt-8 flex flex-wrap items-end gap-3" data-autosubmit>
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm">
          <span className={label}>Search</span>
          <input type="search" name="q" defaultValue={query} placeholder="pricing, faq, no javascript" className="field" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className={label}>Type</span>
          <select name="type" defaultValue={type} className="field">
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className={label}>Preview style</span>
          <select name="style" defaultValue={style.id} className="field">
            {catalogue.styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary">Apply</button>
      </form>
      <p className="mt-6 text-sm text-quiet" aria-live="polite">
        {results.length === catalogue.components.length ? `${results.length} components` : `${results.length} of ${catalogue.components.length} components`}
      </p>
      {results.length ? (
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c) => <ComponentCard key={c.id} component={c} style={style} />)}
        </ul>
      ) : (
        <p className="mt-4 rounded-[6px] border border-dashed border-ink p-8 text-quiet">
          Nothing matches. <a className={link} href="/components">Clear the search</a>.
        </p>
      )}
    </Layout>
  );
}

function CopyBlock({ id, title, code }: { id: string; title: string; code: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[6px] border border-ink bg-page">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2">
        <span className="font-mono text-xs text-quiet">{title}</span>
        <button type="button" data-copy={id} className="rounded border border-ink px-2 py-1 text-xs hover:bg-wash">Copy</button>
      </div>
      <pre className="max-h-[32rem] overflow-auto p-4 text-xs leading-relaxed"><code id={id}>{code}</code></pre>
    </div>
  );
}

function Gaps({ pkg }: { pkg: ThemePackage }) {
  const fonts = pkg.fonts.filter((f, i, all) => f.status === "not loaded" && all.findIndex((g) => g.family === f.family) === i);
  if (!pkg.unresolved.length && !fonts.length) {
    return <p className="rounded-[6px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Every token this component reads is set by the style, and every font is loaded or a system font.</p>;
  }
  return (
    <div className="rounded-[6px] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-medium">What this style doesn't cover</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {pkg.unresolved.map((u) => <li key={u.token}><code className="font-mono">{u.token}</code>: {u.reason} The package uses <code className="font-mono">{u.fallback}</code>.</li>)}
        {fonts.map((f) => <li key={f.family}>{f.note}</li>)}
      </ul>
    </div>
  );
}

export function ComponentPage({ catalogue, component, style, example }: { catalogue: Catalogue; component: ComponentRecord; style: StyleRecord; example: number }) {
  const pkg = themePackage(catalogue, component, style);
  const modes = pkg.style.modes;
  const mcpCall = JSON.stringify({ name: "get_component", arguments: { id: component.id, style: style.id } }, null, 2);
  return (
    <Layout title={component.name} catalogue={catalogue}>
      <nav aria-label="Breadcrumb" className="text-sm text-quiet"><a className={link} href="/components">Components</a> / {component.type}</nav>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="display text-[clamp(40px,5vw,56px)]">{component.name}</h1>
          <p className="mt-3 text-lg text-quiet">{component.summary}</p>
          <p className="mt-3 font-mono text-xs text-quiet">id {component.id} · revision {component.revision} · catalogue {catalogue.version}</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-3" data-autosubmit>
          <label className="flex flex-col gap-1 text-sm">
            <span className={label}>Style</span>
            <select name="style" defaultValue={style.id} className="field">
              {catalogue.styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={label}>Example</span>
            <select name="example" defaultValue={String(example)} className="field">
              {component.examples.map((e, i) => <option key={e.name} value={i}>{e.name}</option>)}
            </select>
          </label>
          <button type="submit" className="btn-primary">Show</button>
        </form>
      </div>

      <section aria-labelledby="preview" className="mt-8">
        <h2 id="preview" className="sr-only">Preview</h2>
        <Gaps pkg={pkg} />
        {modes.map((mode) => (
          <div key={mode} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Frame src={specimenSrc(component, style, mode, example)} width={1280} caption={`Desktop, 1280px, ${mode}`} />
            <Frame src={specimenSrc(component, style, mode, example)} width={390} caption={`Phone, 390px, ${mode}`} />
          </div>
        ))}
        {!modes.includes("dark") ? <p className="mt-4 text-sm text-quiet">{style.name} has no dark mode, so only light is shown.</p> : null}
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section aria-labelledby="install" className="min-w-0 space-y-4">
          <h2 id="install" className="display text-[32px]">Copy it</h2>
          <p className="text-sm text-quiet">These two files are exactly what the previews above render. The MCP tool <code className="font-mono">get_component</code> returns the same files.</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm [overflow-wrap:anywhere]">{pkg.instructions.map((step) => <li key={step}>{step}</li>)}</ol>
          <CopyBlock id="source" title={pkg.files[0]!.path} code={pkg.files[0]!.contents} />
          <CopyBlock id="theme" title={pkg.files[1]!.path} code={pkg.files[1]!.contents} />
          <CopyBlock id="mcp" title="MCP tool call" code={mcpCall} />
        </section>
        <aside className="space-y-8 text-sm">
          <section aria-labelledby="requires">
            <h2 id="requires" className="text-base font-semibold">Requirements</h2>
            <ul className="mt-2 space-y-1">
              <li>React {component.requires.react}</li>
              <li>Tailwind CSS {component.requires.tailwindcss}</li>
              <li>No client JavaScript and no imports</li>
            </ul>
          </section>
          <section aria-labelledby="tokens">
            <h2 id="tokens" className="text-base font-semibold">Tokens it reads</h2>
            <ul className="mt-2 space-y-1">
              {component.tokens.map((t) => <li key={t}><code className="font-mono text-xs">--nl-{t}</code> <span className="text-quiet">{ROLE_DESCRIPTIONS[t]}</span></li>)}
            </ul>
          </section>
          <section aria-labelledby="fonts">
            <h2 id="fonts" className="text-base font-semibold">Fonts in {style.name}</h2>
            <ul className="mt-2 space-y-2">
              {pkg.fonts.map((f) => <li key={f.role}><span className="font-medium">{f.family}</span> <span className="text-quiet">({f.role}, {f.status})</span><br /><span className="text-quiet">{f.license}</span></li>)}
            </ul>
          </section>
          <section aria-labelledby="a11y">
            <h2 id="a11y" className="text-base font-semibold">Accessibility</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">{component.accessibility.map((a) => <li key={a}>{a}</li>)}</ul>
          </section>
          {component.states.length ? (
            <section aria-labelledby="states">
              <h2 id="states" className="text-base font-semibold">States</h2>
              <p className="mt-1 text-quiet">Hover or Tab into a preview to see them.</p>
              <dl className="mt-2 space-y-2">{component.states.map((s) => <div key={s.name}><dt className="font-medium">{s.name}</dt><dd className="text-quiet">{s.description}</dd></div>)}</dl>
            </section>
          ) : null}
          <section aria-labelledby="provenance">
            <h2 id="provenance" className="text-base font-semibold">Provenance</h2>
            <p className="mt-2 text-quiet">{component.provenance.author}, {component.provenance.origin}, {component.provenance.license}. {component.provenance.evidence}</p>
          </section>
        </aside>
      </div>

      <section aria-labelledby="compare" className="mt-12">
        <h2 id="compare" className="display text-[32px]">In every style</h2>
        <ul className="mt-4 grid gap-6 md:grid-cols-3">
          {catalogue.styles.map((s) => (
            <li key={s.id} className="relative min-w-0 overflow-hidden rounded-[6px] border border-ink bg-page">
              <Frame src={specimenSrc(component, s, "light", example)} width={1280} maxHeight={200} decorative background={s.colors.light.canvas ?? undefined} />
              <div className="flex items-center justify-between gap-3 border-t border-ink p-3">
                <a className="font-medium after:absolute after:inset-0" href={`/components/${component.id}?style=${s.id}&example=${example}`}>{s.name}</a>
                <Swatches style={s} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}

export function StylesPage({ catalogue }: { catalogue: Catalogue }) {
  return (
    <Layout title="Styles" catalogue={catalogue}>
      <h1 className="display text-[clamp(40px,5vw,56px)]">Styles</h1>
      <p className="mt-3 max-w-2xl text-lg text-quiet">Color roles, type, spacing, and written rules. Every value here is set by the style's author; anything a style leaves out is marked missing, not filled in.</p>
      <ul className="mt-8 grid gap-6 md:grid-cols-3">
        {catalogue.styles.map((s) => (
          <li key={s.id} className="relative rounded-[6px] border border-ink bg-page p-5 hover:border-cobalt">
            <div className="flex h-24 overflow-hidden rounded-[6px] border border-ink">
              {(Object.entries(s.colors.light) as Array<[ColorRole, string | null]>).map(([role, value]) => (
                <span key={role} className="flex-1" style={{ background: value ?? "repeating-linear-gradient(45deg,#e7e5e4 0 4px,#fff 4px 8px)" }} title={`${role}: ${value ?? "missing"}`} />
              ))}
            </div>
            <h2 className="mt-4 text-lg font-semibold"><a href={`/styles/${s.id}`} className="after:absolute after:inset-0">{s.name}</a></h2>
            <p className="mt-1 text-sm text-quiet">{s.summary}</p>
            <p className="mt-3 font-mono text-xs text-quiet">{s.colors.dark ? "light and dark" : "light only"}{s.missing.length ? ` · ${s.missing.length} missing` : ""}</p>
          </li>
        ))}
      </ul>
    </Layout>
  );
}

function ColorGrid({ style, mode }: { style: StyleRecord; mode: Mode }) {
  const set = mode === "dark" ? style.colors.dark : style.colors.light;
  if (!set) {
    return <p className="rounded-[6px] border border-dashed border-ink p-6 text-sm text-quiet">Missing. {style.name} doesn't define a dark mode, and this page doesn't invent one.</p>;
  }
  const canvas = set.canvas;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {(Object.entries(set) as Array<[ColorRole, string | null]>).map(([role, value]) => {
        const against = role === "accent-ink" ? set.accent : role === "canvas" ? set.ink : canvas;
        const ratio = value && against ? contrastRatio(value, against) : null;
        return (
          <li key={role} className="overflow-hidden rounded-[6px] border border-ink bg-page">
            <div className="h-20 border-b border-ink" style={{ background: value ?? "repeating-linear-gradient(45deg,#e7e5e4 0 6px,#fff 6px 12px)" }} />
            <div className="p-3 text-sm">
              <p className="font-medium">{role}</p>
              <p className="text-xs text-quiet">{ROLE_DESCRIPTIONS[role]}</p>
              <p className="mt-2 font-mono text-xs">{value ?? "missing"}</p>
              {ratio ? <p className="font-mono text-xs text-quiet">{ratio.toFixed(1)}:1 on {role === "accent-ink" ? "accent" : role === "canvas" ? "ink" : "canvas"}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function StylePage({ catalogue, style }: { catalogue: Catalogue; style: StyleRecord }) {
  const fonts = (["display", "sans", "mono"] as const).map((role) => ({ role, spec: style.typography[role] }));
  const samples = { display: "Ship the update. We'll write it up.", sans: "Drafts wait for a person to approve them. Nothing publishes on its own.", mono: "v0.1.0 · 42 drafts · 3 min" };
  return (
    <Layout title={style.name} catalogue={catalogue} head={fonts.filter((f) => f.spec.load).map((f) => <link key={f.role} rel="stylesheet" href={f.spec.load!} />)}>
      <nav aria-label="Breadcrumb" className="text-sm text-quiet"><a className={link} href="/styles">Styles</a> / {style.name}</nav>
      <h1 className="mt-4 display text-[clamp(40px,5vw,56px)]">{style.name}</h1>
      <p className="mt-3 max-w-3xl text-lg text-quiet">{style.summary}</p>
      <p className="mt-3 font-mono text-xs text-quiet">id {style.id} · revision {style.revision} · catalogue {catalogue.version}</p>

      {style.missing.length || style.inferred.length ? (
        <div className="mt-6 rounded-[6px] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          {style.missing.length ? <p><span className="font-medium">Not set by this style:</span> {style.missing.join(", ")}. Exports mark these as fallbacks.</p> : null}
          {style.inferred.length ? <p className="mt-1"><span className="font-medium">Inferred, not specified:</span> {style.inferred.join(", ")}.</p> : null}
        </div>
      ) : null}

      <section aria-labelledby="colors" className="mt-10">
        <h2 id="colors" className="display text-[32px]">Colors</h2>
        <h3 className="mt-4 font-medium">Light</h3>
        <div className="mt-3"><ColorGrid style={style} mode="light" /></div>
        <h3 className="mt-6 font-medium">Dark</h3>
        <div className="mt-3"><ColorGrid style={style} mode="dark" /></div>
      </section>

      <section aria-labelledby="type" className="mt-10">
        <h2 id="type" className="display text-[32px]">Type</h2>
        <ul className="mt-4 space-y-4">
          {fonts.map(({ role, spec }) => (
            <li key={role} className="grid gap-4 rounded-[6px] border border-ink bg-page p-5 md:grid-cols-[14rem_minmax(0,1fr)]">
              <div className="text-sm">
                <p className={label}>{role}</p>
                <p className="mt-1 font-medium">{spec.family}</p>
                <p className="text-quiet">Weights {spec.weights.join(", ")}</p>
                <p className="mt-2 text-xs text-quiet">{spec.license}</p>
              </div>
              <p className={role === "display" ? "text-3xl" : role === "mono" ? "text-base" : "text-lg"} style={{ fontFamily: spec.stack, fontWeight: spec.weights[0] }}>{samples[role]}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="shape" className="mt-10">
        <h2 id="shape" className="display text-[32px]">Radius and spacing</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { name: "Radius", value: style.radius, demo: style.radius ? <div className="size-20 border-2 border-ink bg-wash" style={{ borderRadius: style.radius }} /> : null },
            { name: "Base unit", value: style.spacing.base, demo: style.spacing.base ? <div className="flex gap-1">{[1, 2, 4, 8].map((n) => <div key={n} className="bg-ink" style={{ width: `calc(${style.spacing.base} * ${n})`, height: 20 }} />)}</div> : null },
            { name: "Section padding", value: style.spacing.sectionY, demo: style.spacing.sectionY ? <div className="w-10 bg-ink" style={{ height: `calc(${style.spacing.sectionY} / 2)` }} /> : null },
          ].map((item) => (
            <div key={item.name} className="rounded-[6px] border border-ink bg-page p-5">
              <p className={label}>{item.name}</p>
              <p className="mt-1 font-mono text-sm">{item.value ?? "missing"}</p>
              <div className="mt-4 flex min-h-20 items-end">{item.demo ?? <p className="text-sm text-quiet">Not set by this style.</p>}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-quiet">Section padding is drawn at half size.</p>
      </section>

      <section aria-labelledby="rules" className="mt-10 grid gap-4 md:grid-cols-2">
        <h2 id="rules" className="sr-only">Guidelines</h2>
        <div className="rounded-[6px] border border-ink bg-page p-5">
          <h3 className="font-semibold">Do</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{style.guidelines.do.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
        <div className="rounded-[6px] border border-ink bg-page p-5">
          <h3 className="font-semibold">Don't</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{style.guidelines.dont.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
      </section>

      <section aria-labelledby="in-use" className="mt-10">
        <h2 id="in-use" className="display text-[32px]">Components in {style.name}</h2>
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catalogue.components.map((c) => (
            <li key={c.id} className="relative min-w-0 overflow-hidden rounded-[6px] border border-ink bg-page">
              <Frame src={specimenSrc(c, style, "light", 0)} width={1280} maxHeight={200} decorative background={style.colors.light.canvas ?? undefined} />
              <a className="block border-t border-ink p-3 font-medium after:absolute after:inset-0" href={`/components/${c.id}?style=${style.id}`}>{c.name}</a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="style-provenance" className="mt-10 max-w-3xl text-sm">
        <h2 id="style-provenance" className="text-base font-semibold">Provenance</h2>
        <p className="mt-2 text-quiet">{style.provenance.author}, {style.provenance.origin}, {style.provenance.license}. {style.provenance.evidence}</p>
      </section>
    </Layout>
  );
}

export function ConnectPage({ catalogue, origin }: { catalogue: Catalogue; origin: string }) {
  const endpoint = `${origin}/api/mcp`;
  return (
    <Layout title="Connect an agent" catalogue={catalogue}>
      <div className="max-w-3xl space-y-6">
        <h1 className="display text-[clamp(40px,5vw,56px)]">Connect a coding agent</h1>
        <p className="text-lg text-quiet">
          The MCP server is read-only. It returns the components and styles on this site and nothing else: no repositories, files, accounts, or write tools.
        </p>
        <section aria-labelledby="hosted" className="space-y-3">
          <h2 id="hosted" className="display text-[32px]">Hosted endpoint</h2>
          <p className="text-sm text-quiet">Streamable HTTP, stateless, JSON replies.</p>
          <CopyBlock id="endpoint" title="Endpoint" code={endpoint} />
          <CopyBlock id="claude" title="Claude Code" code={`claude mcp add --transport http neat-labs-library ${endpoint}`} />
          <CopyBlock id="codex" title="Codex CLI (~/.codex/config.toml)" code={`[mcp_servers.neat-labs-library]\nurl = "${endpoint}"`} />
          <CopyBlock id="json" title="Clients that read an mcpServers JSON file" code={JSON.stringify({ mcpServers: { "neat-labs-library": { url: endpoint } } }, null, 2)} />
        </section>
        <section aria-labelledby="local" className="space-y-3">
          <h2 id="local" className="display text-[32px]">Run it locally</h2>
          <p className="text-sm text-quiet">Clone the repository, run <code className="font-mono">bun install</code>, then point your client at the stdio server.</p>
          <CopyBlock id="stdio" title="Claude Code, stdio" code={`claude mcp add neat-labs-library -- bun run /path/to/neat-labs-library/src/mcp/stdio.ts`} />
        </section>
        <section aria-labelledby="tools" className="space-y-3">
          <h2 id="tools" className="display text-[32px]">Tools</h2>
          <dl className="space-y-3 text-sm">
            <div><dt className="font-mono">search_components</dt><dd className="text-quiet">Keyword and type search. Returns IDs, revisions, token roles, and preview links.</dd></div>
            <div><dt className="font-mono">get_component</dt><dd className="text-quiet">Source, requirements, token roles, accessibility notes, and provenance. With <code className="font-mono">style</code>, also the theme.css and any unresolved tokens or fonts.</dd></div>
            <div><dt className="font-mono">list_styles</dt><dd className="text-quiet">Styles with light swatches, modes, and missing fields.</dd></div>
            <div><dt className="font-mono">get_style</dt><dd className="text-quiet">Color roles per mode, type with font licenses, radius, spacing, and guidelines.</dd></div>
            <div><dt className="font-mono">find_components, theme_component</dt><dd className="text-quiet">Older names kept for configurations made before the catalogue moved here. <code className="font-mono">brand</code> takes a style ID.</dd></div>
          </dl>
        </section>
      </div>
    </Layout>
  );
}

export function NotFoundPage({ catalogue, what }: { catalogue: Catalogue; what: string }) {
  return (
    <Layout title="Not found" catalogue={catalogue}>
      <h1 className="display text-[56px]">Not found</h1>
      <p className="mt-3 text-quiet">{what} <a className={link} href="/">Back to the home page</a>.</p>
    </Layout>
  );
}
