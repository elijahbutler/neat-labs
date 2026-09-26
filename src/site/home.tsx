import { LayoutTemplate, MessageSquare, MousePointer2, Pencil } from "lucide-react";
import type { Catalogue } from "../catalogue/schema";
import { Layout } from "./layout";

const STEPS = [
  {
    title: "Connect a repo",
    body: "Install the GitHub app on a Next.js repo. Neat Labs reads your components, their props and variants, your tokens, and where each one is used, and shows you what it found with the file and line for every item.",
  },
  {
    title: "Open your running app",
    body: "Your site runs from your own code in an isolated sandbox. Click anything on the page to see which component and file it came from.",
  },
  {
    title: "Draw, drag, or ask",
    body: "Sketch a section, drop in a component from your library, or describe a change in a sentence. The change is made in your code, with your components and tokens, and shows up on the page before you accept it.",
  },
  {
    title: "Review the pull request",
    body: "Accepted changes become a pull request with before and after screenshots. You review and merge it the way you merge everything else.",
  },
];

const PROMISES = [
  ["Your code stays the source of truth.", "There is no second copy of your design to keep in sync. Every edit starts from your latest commit."],
  ["Your components come first.", "If you already have a component that fits, that is what gets used. Anything new is called out in the pull request."],
  ["Nothing ships without you.", "Neat Labs never pushes to your main branch and never deploys. Every change is a pull request."],
  ["Your code runs apart from everything else.", "Each editing session gets its own sandbox, with no access to our servers or anyone else's code."],
] as const;

const PLANS = [
  { name: "Starter", price: "$0", note: "For side projects" },
  { name: "Team", price: "$49", note: "For growing products", selected: true },
  { name: "Scale", price: "$199", note: "For larger teams" },
];

const TOOLS = [
  { label: "Select", Icon: MousePointer2, active: true },
  { label: "Draw", Icon: Pencil },
  { label: "Drop", Icon: LayoutTemplate },
  { label: "Ask", Icon: MessageSquare },
];

export type WaitlistOutcome = "joined" | "invalid" | "busy" | "error" | null;

const OUTCOME_MESSAGE: Record<Exclude<WaitlistOutcome, "joined" | null>, string> = {
  invalid: "Enter an email address like you@company.com.",
  busy: "Too many attempts. Try again in a minute.",
  error: "Couldn't save your address right now. Try again later.",
};

/** Works as a plain form post; site.js upgrades it to an in-place request when JavaScript runs. */
function WaitlistForm({ id, outcome }: { id: string; outcome: WaitlistOutcome }) {
  if (outcome === "joined") {
    return (
      <p role="status" className="max-w-xl border-l-[3px] border-cobalt pl-4 text-[17px]">
        You're on the list. We'll email you when there's something to try.
      </p>
    );
  }
  const error = outcome ? OUTCOME_MESSAGE[outcome] : null;
  return (
    <form className="max-w-xl" method="post" action="/api/waitlist" data-waitlist>
      <label htmlFor={`${id}-email`} className="sr-only">Work email</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-error`}
          className="field min-w-0 flex-1"
        />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button type="submit" className="btn-primary">Join the waitlist</button>
      </div>
      <p id={`${id}-error`} role="alert" className="mt-2 min-h-5 text-[14px]">{error}</p>
    </form>
  );
}

/** A drawn illustration of the editor, not a screenshot: a pricing page, one component selected, and the request that changed it. */
function HeroCanvas() {
  return (
    <figure className="panel overflow-hidden" aria-label="Illustration of the Neat Labs editor">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2.5">
        <span className="caption">acme-analytics / pricing</span>
        <span className="caption text-quiet">Preview of your running app</span>
      </div>
      <div className="grid lg:grid-cols-[1fr_340px]">
        <div className="grid-canvas relative min-h-[420px] border-ink p-5 sm:p-10 lg:border-r">
          <div className="panel p-6 sm:p-8">
            <p className="text-[13px] text-quiet">Acme Analytics</p>
            <p className="mt-1 text-[28px] font-semibold tracking-tight">Pricing</p>
            <div className="mt-12 grid gap-12 sm:mt-10 sm:grid-cols-3 sm:gap-4">
              {PLANS.map((plan) =>
                plan.selected ? (
                  <div key={plan.name} className="relative">
                    <div className="anim-select pointer-events-none absolute -inset-2 rounded-[10px] border-2 border-cobalt" />
                    <span className="anim-select caption absolute -top-9 left-0 whitespace-nowrap rounded-[4px] bg-cobalt px-2 py-0.5 text-white">
                      PricingCard <span className="text-tint">components/pricing-card.tsx:13</span>
                    </span>
                    <PlanCard {...plan} highlighted />
                  </div>
                ) : (
                  <PlanCard key={plan.name} {...plan} />
                ),
              )}
            </div>
          </div>
          <div className="mx-auto mt-8 flex w-fit items-center gap-1 rounded-[8px] bg-ink p-1.5" role="presentation">
            {TOOLS.map(({ label, Icon, active }) => (
              <span key={label} className={`caption flex items-center gap-1.5 rounded-[5px] px-2.5 py-1.5 ${active ? "bg-cobalt text-white" : "text-page/70"}`}>
                <Icon aria-hidden size={14} strokeWidth={1.5} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="anim-card border-t border-ink bg-wash p-5 lg:border-t-0">
          <p className="caption text-quiet">Request</p>
          <p className="mt-2 text-[17px] leading-snug">Make the Team plan stand out.</p>
          <p className="caption mt-6 text-quiet">Change in app/pricing/page.tsx</p>
          <pre className="code mt-2 bg-page text-[11.5px]">
            <span className="text-quiet">{"  <PricingCard {...starter} />\n"}</span>
            <span className="text-quiet line-through decoration-ink/60">{"- <PricingCard {...team} />"}</span>
            {"\n"}
            <span className="bg-mint">{"+ <PricingCard {...team} highlighted />"}</span>
            {"\n"}
            <span className="text-quiet">{"  <PricingCard {...scale} />"}</span>
          </pre>
          <p className="mt-4 text-[14px] leading-relaxed text-quiet">
            Used the existing <code className="font-mono text-[12.5px] text-ink">highlighted</code> prop on your PricingCard. No new markup.
          </p>
          <div className="mt-6 flex gap-2">
            <span className="btn-secondary bg-ink text-page hover:bg-ink">Accept</span>
            <span className="btn-secondary">Try again</span>
          </div>
        </div>
      </div>
    </figure>
  );
}

function PlanCard({ name, price, note, highlighted = false }: { name: string; price: string; note: string; highlighted?: boolean }) {
  return (
    <div className={`rounded-[6px] bg-page p-4 ${highlighted ? "border-2 border-ink" : "border border-rule"}`}>
      <p className="text-[15px] font-semibold">{name}</p>
      <p className="mt-0.5 text-[13px] text-quiet">{note}</p>
      <p className="mt-4 text-[26px] font-semibold tracking-tight">
        {price}
        <span className="text-[13px] font-normal text-quiet">/mo</span>
      </p>
      <p className={`mt-4 rounded-full py-1.5 text-center text-[13px] ${highlighted ? "bg-ink text-page" : "border border-rule"}`}>Choose {name}</p>
    </div>
  );
}

export function HomePage({ catalogue, toolCount, outcome }: { catalogue: Catalogue; toolCount: number; outcome: WaitlistOutcome }) {
  const today = [
    { count: String(catalogue.components.length), unit: "components", name: "Components", href: "/components", body: "React and Tailwind page sections, rendered at desktop and phone widths before you copy them." },
    { count: String(catalogue.styles.length), unit: "styles", name: "Styles", href: "/styles", body: "Color roles, type, and spacing that theme any component, with anything missing marked as missing." },
    { count: String(toolCount), unit: "tools", name: "MCP server", href: "/connect", body: "The same components and styles inside Claude Code, Codex, and other MCP clients." },
  ];
  return (
    <Layout title="Edit your Next.js site, get the pull request" catalogue={catalogue} fullWidth>
      <section className="mx-auto max-w-[1200px] px-5 pt-16 sm:px-8 sm:pt-24">
        <span className="caption inline-block rounded-full bg-ink px-3 py-1 text-page">In development</span>
        <h1 className="display mt-8 text-[clamp(56px,10vw,132px)]">
          Edit the site.
          <br />
          Get the pull request.
        </h1>
        <p className="mt-8 max-w-[560px] text-[19px] leading-[1.55] text-quiet">
          Neat Labs is a design editor for Next.js teams. It learns your components and tokens, opens your running app on a canvas, and turns what you draw, drag, or ask for into a pull request written in your own code.
        </p>
        <div id="waitlist" className="mt-10 scroll-mt-24">
          <WaitlistForm id="waitlist-top" outcome={outcome} />
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 pt-20 sm:px-8 sm:pt-28">
        <HeroCanvas />
      </section>

      <section aria-labelledby="how" className="mx-auto max-w-[1200px] px-5 pt-28 sm:px-8 sm:pt-36">
        <h2 id="how" className="display text-[clamp(40px,5.5vw,64px)]">How it works</h2>
        <ol className="mt-12 border-t border-ink">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid gap-3 border-b border-ink py-8 md:grid-cols-[120px_340px_1fr] md:gap-8">
              <span className="font-mono text-[15px]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display text-[32px]">{step.title}</h3>
              <p className="max-w-[560px] text-[17px] leading-[1.6] text-quiet">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="promises" className="mx-auto max-w-[1200px] px-5 pt-28 sm:px-8 sm:pt-36">
        <h2 id="promises" className="display max-w-[900px] text-[clamp(40px,5.5vw,64px)]">It works on your code, not a copy of it</h2>
        <dl className="mt-12 grid gap-x-12 md:grid-cols-2">
          {PROMISES.map(([title, body]) => (
            <div key={title} className="border-t border-ink py-6">
              <dt className="text-[19px] font-medium">{title}</dt>
              <dd className="mt-2 max-w-[480px] text-[16px] leading-[1.6] text-quiet">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="today" className="mx-auto max-w-[1200px] px-5 pt-28 sm:px-8 sm:pt-36">
        <h2 id="today" className="display text-[clamp(40px,5.5vw,64px)]">Available today</h2>
        <p className="mt-4 max-w-[560px] text-[17px] leading-[1.6] text-quiet">
          While the editor is in development, the library it draws from is open to use. The source is on <a className="link" href="https://github.com/elijahbutler/neat-labs-library">GitHub</a>.
        </p>
        <ul className="mt-12 border-t border-ink">
          {today.map((item) => (
            <li key={item.href} className="border-b border-ink">
              <a href={item.href} className="group grid gap-2 py-6 hover:bg-wash md:grid-cols-[220px_260px_1fr] md:items-baseline md:gap-8 md:px-3">
                <span className="display text-[44px] leading-none">
                  {item.count} <span className="font-sans text-[15px] tracking-normal text-quiet">{item.unit}</span>
                </span>
                <span className="text-[19px] font-medium underline-offset-4 group-hover:underline">{item.name}</span>
                <span className="text-[16px] leading-[1.6] text-quiet">{item.body}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-28 sm:px-8 sm:py-36">
        <div className="panel-wash grid-canvas px-6 py-14 sm:px-12">
          <h2 className="display max-w-[800px] text-[clamp(40px,5.5vw,64px)]">Try it on your repo first</h2>
          <p className="mt-4 max-w-[520px] text-[17px] leading-[1.6] text-quiet">
            We're starting with a small group of Next.js teams. Leave your email and we'll invite you when it's ready.
          </p>
          <div className="mt-8">
            <WaitlistForm id="waitlist-bottom" outcome={null} />
          </div>
        </div>
      </section>
    </Layout>
  );
}
