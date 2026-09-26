// Fit each preview frame to its container: scale the specimen down to the column width and match its height.
function fit(frame) {
  const iframe = frame.querySelector("iframe");
  const width = Number(frame.dataset.width);
  const max = Number(frame.dataset.maxHeight) || Infinity;
  const scale = Math.min(1, frame.clientWidth / width);
  let height = null;
  try {
    const body = iframe.contentDocument && iframe.contentDocument.body;
    if (body && body.childElementCount) height = body.scrollHeight;
  } catch {}
  iframe.style.transform = `scale(${scale})`;
  if (height !== null) {
    iframe.style.height = `${height}px`;
    if (!("fixed" in frame.dataset)) frame.style.height = `${Math.ceil(Math.min(height * scale, max))}px`;
  }
}

for (const frame of document.querySelectorAll(".frame")) {
  const iframe = frame.querySelector("iframe");
  const run = () => fit(frame);
  iframe.addEventListener("load", () => {
    run();
    try {
      const doc = iframe.contentDocument;
      doc.fonts && doc.fonts.ready.then(run);
      new ResizeObserver(run).observe(doc.body);
    } catch {}
  });
  new ResizeObserver(run).observe(frame);
  run();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  const text = document.getElementById(button.dataset.copy).textContent;
  navigator.clipboard.writeText(text).then(
    () => { button.textContent = "Copied"; setTimeout(() => { button.textContent = "Copy"; }, 1500); },
    () => { button.textContent = "Select and copy"; },
  );
});

for (const select of document.querySelectorAll("form[data-autosubmit] select")) {
  select.addEventListener("change", () => select.form.submit());
}

// Waitlist: send the form in place and show the outcome, instead of reloading the page.
for (const form of document.querySelectorAll("form[data-waitlist]")) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    const alert = form.querySelector('[role="alert"]');
    const input = form.querySelector('input[name="email"]');
    const data = new FormData(form);
    button.disabled = true;
    button.textContent = "Joining…";
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), website: data.get("website") }),
      });
      if (res.ok) {
        const done = document.createElement("p");
        done.setAttribute("role", "status");
        done.className = "max-w-xl border-l-[3px] border-cobalt pl-4 text-[17px]";
        done.textContent = "You're on the list. We'll email you when there's something to try.";
        form.replaceWith(done);
        return;
      }
      const json = await res.json().catch(() => ({}));
      alert.textContent = json.error || `Something went wrong (${res.status}). Try again.`;
    } catch {
      alert.textContent = "No connection. Check your network and try again.";
    }
    input.setAttribute("aria-invalid", "true");
    button.disabled = false;
    button.textContent = "Join the waitlist";
  });
}
