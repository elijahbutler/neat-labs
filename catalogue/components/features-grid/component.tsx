export interface Feature {
  title: string;
  body: string;
}

export interface FeaturesGridProps {
  heading?: string;
  intro?: string;
  features?: Feature[];
}

/**
 * Heading and intro above a three-column grid of short feature notes, each
 * numbered in the mono face. Drops to two columns on tablets and one on phones.
 */
export function FeaturesGrid({
  heading = "Built for the week after launch",
  intro = "The parts of release work that usually slip, done the same way every time.",
  features = [
    { title: "Drafts from real changes", body: "Each note starts from the merged pull request, so nothing is invented." },
    { title: "Review before it ships", body: "Drafts wait for a person to approve them. Nothing publishes on its own." },
    { title: "Your words, kept", body: "Edits you make to one draft carry into the style of the next." },
    { title: "One changelog", body: "Web, email, and in-app notes come from the same approved text." },
    { title: "Quiet by default", body: "Minor fixes are grouped into a weekly digest instead of separate posts." },
    { title: "Plain exports", body: "Download everything as Markdown whenever you like." },
  ],
}: FeaturesGridProps) {
  return (
    <section className="bg-[color:var(--nl-canvas)] px-6 py-[var(--nl-section-y)] font-[family-name:var(--nl-font-sans)] text-[color:var(--nl-ink)]">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-balance font-[family-name:var(--nl-font-display)] text-3xl font-semibold sm:text-4xl">{heading}</h2>
          <p className="mt-4 text-lg text-[color:var(--nl-muted)]">{intro}</p>
        </div>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-[var(--nl-radius)] border border-[color:var(--nl-line)] bg-[color:var(--nl-line)] sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <li key={feature.title} className="bg-[color:var(--nl-surface)] p-6">
              <p className="font-[family-name:var(--nl-font-mono)] text-xs text-[color:var(--nl-muted)]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--nl-muted)]">{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
