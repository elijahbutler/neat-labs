import type { ReactNode } from "react";
import type { Catalogue } from "../catalogue/schema";

export const REPO_URL = "https://github.com/elijahbutler/neat-labs";

const NAV = [
  { href: "/", label: "Editor" },
  { href: "/components", label: "Components" },
  { href: "/styles", label: "Styles" },
  { href: "/connect", label: "MCP" },
];

const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif&family=JetBrains+Mono:wght@400&display=swap";

/** The page shell for every page of neatlabs.design. `fullWidth` leaves section widths to the page. */
export function Layout({ title, catalogue, head, fullWidth, children }: { title: string; catalogue: Catalogue; head?: ReactNode; fullWidth?: boolean; children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · Neat Labs`}</title>
        <meta name="description" content="A design editor for Next.js teams, in development. Connect a repo, change your running app by drawing, dragging, or asking, and get a pull request that uses your own components." />
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
        <link rel="stylesheet" href="/assets/site.css" />
        {head}
        <script src="/assets/site.js" defer />
      </head>
      <body className="flex min-h-screen flex-col bg-page text-ink">
        <a href="#main" className="btn-secondary sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">
          Skip to content
        </a>
        <header className="border-b border-ink bg-page">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-10 px-5 sm:px-8">
            <a href="/" className="display text-[28px] leading-none">Neat Labs</a>
            <nav aria-label="Primary" className="hidden items-center gap-7 text-[15px] md:flex">
              {NAV.map((item) => <a key={item.href} href={item.href} className="underline-offset-4 hover:underline">{item.label}</a>)}
            </nav>
            <a href="/#waitlist" className="btn-secondary ml-auto">Join the waitlist</a>
          </div>
          <nav aria-label="Primary, small screens" className="flex gap-4 overflow-x-auto border-t border-rule px-5 py-3 text-[14px] md:hidden">
            {NAV.map((item) => <a key={item.href} href={item.href} className="shrink-0">{item.label}</a>)}
          </nav>
        </header>
        <main id="main" className={fullWidth ? "flex-1" : "mx-auto w-full max-w-[1200px] flex-1 px-5 py-12 sm:px-8"}>{children}</main>
        <footer className="border-t border-ink">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:justify-between">
            <div className="max-w-sm">
              <p className="display text-[28px] leading-none">Neat Labs</p>
              <p className="mt-3 text-[15px] text-quiet">A design editor for Next.js teams, in development. The component library and MCP server are open today.</p>
            </div>
            <div className="flex gap-16 text-[15px]">
              <ul className="space-y-2">
                {NAV.map((item) => <li key={item.href}><a href={item.href} className="underline-offset-4 hover:underline">{item.label}</a></li>)}
              </ul>
              <ul className="space-y-2">
                <li><a href={REPO_URL} className="underline-offset-4 hover:underline">GitHub</a></li>
                <li><a href="/catalogue.json" className="underline-offset-4 hover:underline">catalogue.json</a></li>
                <li><a href={`${REPO_URL}/blob/main/PROVENANCE.md`} className="underline-offset-4 hover:underline">Provenance</a></li>
              </ul>
            </div>
          </div>
          <div className="mx-auto max-w-[1200px] px-5 pb-8 sm:px-8">
            <p className="caption text-quiet">© 2026 Neat Labs · Catalogue {catalogue.version} · MIT License</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
