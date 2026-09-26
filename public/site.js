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
