export interface Plan {
  name: string;
  price: string;
  period?: string;
  summary: string;
  features: string[];
  action: { label: string; href: string };
  highlighted?: boolean;
}

export interface PricingTiersProps {
  heading?: string;
  plans?: Plan[];
}

const columns: Record<number, string> = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nl-focus)]";

/**
 * Two to four plan cards side by side. One plan can be highlighted with the
 * accent border and a "Most teams pick this" label.
 */
export function PricingTiers({
  heading = "Pricing",
  plans = [
    {
      name: "Solo",
      price: "$0",
      period: "per month",
      summary: "For one person trying it on a side project.",
      features: ["One repository", "Drafts for every merge", "Markdown export"],
      action: { label: "Start free", href: "#solo" },
    },
    {
      name: "Team",
      price: "$24",
      period: "per seat, per month",
      summary: "For teams that publish on a schedule.",
      features: ["Unlimited repositories", "Approval workflow", "Email and in-app notes", "Weekly digest"],
      action: { label: "Start a trial", href: "#team" },
      highlighted: true,
    },
    {
      name: "Company",
      price: "Talk to us",
      summary: "For several products and custom review rules.",
      features: ["Everything in Team", "SSO", "Audit log"],
      action: { label: "Contact sales", href: "#company" },
    },
  ],
}: PricingTiersProps) {
  return (
    <section className="bg-[color:var(--nl-canvas)] px-6 py-[var(--nl-section-y)] font-[family-name:var(--nl-font-sans)] text-[color:var(--nl-ink)]">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-[family-name:var(--nl-font-display)] text-3xl font-semibold sm:text-4xl">{heading}</h2>
        <ul className={`mt-12 grid gap-6 ${columns[plans.length] ?? "md:grid-cols-3"}`}>
          {plans.map((plan) => (
            <li
              key={plan.name}
              className={`flex flex-col rounded-[var(--nl-radius)] border bg-[color:var(--nl-surface)] p-6 ${
                plan.highlighted ? "border-2 border-[color:var(--nl-accent)]" : "border-[color:var(--nl-line)]"
              }`}
            >
              {plan.highlighted ? (
                <p className="mb-3 font-[family-name:var(--nl-font-mono)] text-xs uppercase tracking-wider text-[color:var(--nl-muted)]">
                  Most teams pick this
                </p>
              ) : null}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-4">
                <span className="font-[family-name:var(--nl-font-display)] text-4xl font-semibold">{plan.price}</span>
                {plan.period ? <span className="ml-2 text-sm text-[color:var(--nl-muted)]">{plan.period}</span> : null}
              </p>
              <p className="mt-3 text-sm text-[color:var(--nl-muted)]">{plan.summary}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden="true" className="text-[color:var(--nl-accent)]">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href={plan.action.href}
                className={`mt-8 rounded-[var(--nl-radius)] px-4 py-2.5 text-center font-medium ${
                  plan.highlighted
                    ? "bg-[color:var(--nl-accent)] text-[color:var(--nl-accent-ink)] hover:opacity-90"
                    : "border border-[color:var(--nl-line)] hover:bg-[color:var(--nl-canvas)]"
                } ${focusRing}`}
              >
                {plan.action.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
