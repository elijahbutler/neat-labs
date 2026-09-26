export interface Question {
  question: string;
  answer: string;
}

export interface FaqDisclosureProps {
  heading?: string;
  questions?: Question[];
  /** Index of the question that starts open. Omit to start with all closed. */
  openIndex?: number;
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nl-focus)]";

/**
 * Questions as native disclosure widgets. Keyboard and screen reader support
 * come from <details> and <summary>, and it needs no client JavaScript.
 */
export function FaqDisclosure({
  heading = "Questions",
  questions = [
    { question: "Does anything publish without approval?", answer: "No. Every draft waits for someone on your team to approve it." },
    { question: "Which repositories can I connect?", answer: "Any GitHub repository you can install an app on, public or private." },
    { question: "Can I export my notes?", answer: "Yes. Download every note as Markdown from the settings page." },
    { question: "What happens when my trial ends?", answer: "Your drafts stay. Publishing pauses until you choose a plan." },
  ],
  openIndex,
}: FaqDisclosureProps) {
  return (
    <section className="bg-[color:var(--nl-canvas)] px-6 py-[var(--nl-section-y)] font-[family-name:var(--nl-font-sans)] text-[color:var(--nl-ink)]">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-[family-name:var(--nl-font-display)] text-3xl font-semibold sm:text-4xl">{heading}</h2>
        <div className="mt-10 divide-y divide-[color:var(--nl-line)] border-y border-[color:var(--nl-line)]">
          {questions.map((item, index) => (
            <details key={item.question} open={index === openIndex} className="group">
              <summary
                className={`flex cursor-pointer list-none items-center justify-between gap-6 rounded-[var(--nl-radius)] py-5 font-medium [&::-webkit-details-marker]:hidden ${focusRing}`}
              >
                {item.question}
                <span aria-hidden="true" className="font-[family-name:var(--nl-font-mono)] text-[color:var(--nl-muted)] group-open:rotate-45 motion-safe:transition-transform">
                  +
                </span>
              </summary>
              <p className="pb-6 leading-relaxed text-[color:var(--nl-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
