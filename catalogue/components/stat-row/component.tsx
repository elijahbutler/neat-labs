export interface Stat {
  value: string;
  label: string;
}

export interface StatRowProps {
  label?: string;
  stats?: Stat[];
}

/**
 * A row of three or four figures with labels, separated by rules. Values are
 * strings so you control the formatting. Use real numbers only.
 */
export function StatRow({
  label = "Example figures. Replace them with your own measured numbers.",
  stats = [
    { value: "42", label: "Release notes drafted last month" },
    { value: "3 min", label: "Median time to approve a draft" },
    { value: "12", label: "Teams publishing weekly" },
  ],
}: StatRowProps) {
  return (
    <section className="bg-[color:var(--nl-canvas)] px-6 py-[var(--nl-section-y)] font-[family-name:var(--nl-font-sans)] text-[color:var(--nl-ink)]">
      <div className="mx-auto max-w-6xl">
        <dl className="grid gap-8 border-y border-[color:var(--nl-line)] py-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[color:var(--nl-line)]">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-2 sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <dt className="text-sm text-[color:var(--nl-muted)]">{stat.label}</dt>
              <dd className="font-[family-name:var(--nl-font-display)] text-4xl font-semibold tabular-nums sm:text-5xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-[color:var(--nl-muted)]">{label}</p>
      </div>
    </section>
  );
}
