export interface CtaBandProps {
  title?: string;
  body?: string;
  action?: { label: string; href: string };
  /** accent fills the band with the accent color; surface keeps it quiet. */
  tone?: "accent" | "surface";
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nl-focus)]";

/**
 * A full-width band with one sentence and one action. Use the accent tone once
 * per page at most.
 */
export function CtaBand({
  title = "Your next release note is already half written.",
  body = "Connect a repository and see the first draft in a few minutes.",
  action = { label: "Start a trial", href: "#start" },
  tone = "accent",
}: CtaBandProps) {
  const accent = tone === "accent";
  return (
    <section
      className={`px-6 py-[var(--nl-section-y)] font-[family-name:var(--nl-font-sans)] ${
        accent
          ? "bg-[color:var(--nl-accent)] text-[color:var(--nl-accent-ink)]"
          : "border-y border-[color:var(--nl-line)] bg-[color:var(--nl-surface)] text-[color:var(--nl-ink)]"
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <h2 className="text-balance font-[family-name:var(--nl-font-display)] text-3xl font-semibold sm:text-4xl">{title}</h2>
          <p className={`mt-4 text-lg ${accent ? "opacity-90" : "text-[color:var(--nl-muted)]"}`}>{body}</p>
        </div>
        <a
          href={action.href}
          className={`shrink-0 rounded-[var(--nl-radius)] px-6 py-3 font-medium ${
            accent
              ? "bg-[color:var(--nl-accent-ink)] text-[color:var(--nl-accent)] hover:opacity-90"
              : "bg-[color:var(--nl-accent)] text-[color:var(--nl-accent-ink)] hover:opacity-90"
          } ${focusRing}`}
        >
          {action.label}
        </a>
      </div>
    </section>
  );
}
