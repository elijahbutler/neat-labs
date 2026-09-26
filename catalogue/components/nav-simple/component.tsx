export interface NavLink {
  label: string;
  href: string;
}

export interface NavSimpleProps {
  brand?: string;
  links?: NavLink[];
  action?: NavLink;
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nl-focus)]";

/**
 * Top navigation with a brand, a short link list, and one action. Below the
 * md breakpoint the links move into a native <details> menu, so it works
 * without client JavaScript.
 */
export function NavSimple({
  brand = "Example Studio",
  links = [
    { label: "Product", href: "#product" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#changelog" },
  ],
  action = { label: "Start a trial", href: "#start" },
}: NavSimpleProps) {
  return (
    <header className="border-b border-[color:var(--nl-line)] bg-[color:var(--nl-canvas)] font-[family-name:var(--nl-font-sans)] text-[color:var(--nl-ink)]">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <a href="/" className={`rounded-[var(--nl-radius)] font-[family-name:var(--nl-font-display)] text-lg font-semibold ${focusRing}`}>
          {brand}
        </a>
        <ul className="hidden items-center gap-8 text-sm md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={`rounded-[var(--nl-radius)] text-[color:var(--nl-muted)] hover:text-[color:var(--nl-ink)] ${focusRing}`}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={action.href}
          className={`hidden rounded-[var(--nl-radius)] bg-[color:var(--nl-accent)] px-4 py-2 text-sm font-medium text-[color:var(--nl-accent-ink)] hover:opacity-90 md:inline-flex ${focusRing}`}
        >
          {action.label}
        </a>
        <details className="relative md:hidden">
          <summary className={`cursor-pointer list-none rounded-[var(--nl-radius)] border border-[color:var(--nl-line)] px-3 py-1.5 text-sm [&::-webkit-details-marker]:hidden ${focusRing}`}>
            Menu
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-56 rounded-[var(--nl-radius)] border border-[color:var(--nl-line)] bg-[color:var(--nl-surface)] p-2 shadow-lg">
            <ul className="text-sm">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={`block rounded-[var(--nl-radius)] px-3 py-2 hover:bg-[color:var(--nl-canvas)] ${focusRing}`}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={action.href}
              className={`mt-2 block rounded-[var(--nl-radius)] bg-[color:var(--nl-accent)] px-3 py-2 text-center text-sm font-medium text-[color:var(--nl-accent-ink)] ${focusRing}`}
            >
              {action.label}
            </a>
          </div>
        </details>
      </nav>
    </header>
  );
}
