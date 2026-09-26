export interface HeroSplitProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  checklist?: string[];
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nl-focus)]";

/**
 * Two-column hero: the promise and actions on the left, a checklist panel on
 * the right that shows what the product does. Stacks on phones.
 */
export function HeroSplit({
  eyebrow = "Release notes, handled",
  title = "Ship the update. We'll write it up.",
  body = "Example Studio turns merged pull requests into release notes your customers will read. Review the draft, edit anything, and publish.",
  primary = { label: "Start a trial", href: "#start" },
  secondary = { label: "See a sample", href: "#sample" },
  checklist = ["Drafts from merged pull requests", "Edits stay in your voice", "Publishes to your changelog"],
}: HeroSplitProps) {
  return (
    <section className="bg-[color:var(--nl-canvas)] px-6 py-[var(--nl-section-y)] font-[family-name:var(--nl-font-sans)] text-[color:var(--nl-ink)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="font-[family-name:var(--nl-font-mono)] text-xs uppercase tracking-wider text-[color:var(--nl-muted)]">{eyebrow}</p>
          <h1 className="mt-4 text-balance font-[family-name:var(--nl-font-display)] text-4xl leading-tight font-semibold sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 max-w-prose text-lg leading-relaxed text-[color:var(--nl-muted)]">{body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={primary.href}
              className={`rounded-[var(--nl-radius)] bg-[color:var(--nl-accent)] px-5 py-3 font-medium text-[color:var(--nl-accent-ink)] hover:opacity-90 ${focusRing}`}
            >
              {primary.label}
            </a>
            <a
              href={secondary.href}
              className={`rounded-[var(--nl-radius)] border border-[color:var(--nl-line)] px-5 py-3 font-medium hover:bg-[color:var(--nl-surface)] ${focusRing}`}
            >
              {secondary.label}
            </a>
          </div>
        </div>
        <div className="rounded-[var(--nl-radius)] border border-[color:var(--nl-line)] bg-[color:var(--nl-surface)] p-6 sm:p-8">
          <p className="text-sm font-medium text-[color:var(--nl-muted)]">What happens after you merge</p>
          <ol className="mt-6 space-y-4">
            {checklist.map((item, index) => (
              <li key={item} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--nl-accent)] font-[family-name:var(--nl-font-mono)] text-xs text-[color:var(--nl-accent-ink)]"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
