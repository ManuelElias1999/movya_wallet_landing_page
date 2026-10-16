export function initMotion(root = document, view = window) {
  const header = root.querySelector(".site-header");
  const reduced = view.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let queued = false;
  let compact = header.classList.contains("is-scrolled");
  const raf =
    view.requestAnimationFrame?.bind(view) || ((callback) => callback());
  function updateHeader() {
    const y = view.scrollY || 0;
    // Separate thresholds prevent tiny scroll/anchoring adjustments from
    // repeatedly switching the navigation between expanded and compact.
    if (!compact && y > 24) compact = true;
    else if (compact && y <= 8) compact = false;
    header.classList.toggle("is-scrolled", compact);
    const height = Math.max(
      1,
      (root.documentElement.scrollHeight || 0) - (view.innerHeight || 0),
    );
    header.style.setProperty(
      "--reading-progress",
      String(Math.min(1, Math.max(0, y / height))),
    );
    queued = false;
  }
  view.addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        raf(updateHeader);
      }
    },
    { passive: true },
  );
  updateHeader();
  if (!view.IntersectionObserver) return;
  const links = [...root.querySelectorAll('#main-nav a[href^="#"]')];
  const sectionObserver = new view.IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          for (const link of links) {
            const active = link.getAttribute("href") === `#${entry.target.id}`;
            link.classList.toggle("is-active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          }
        }
    },
    { rootMargin: "-15% 0px -55% 0px", threshold: 0 },
  );
  for (const link of links) {
    const section = root.querySelector(link.getAttribute("href"));
    if (section) sectionObserver.observe(section);
  }
  if (reduced) return;
  const observer = new view.IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
    },
    { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
  );
  const elements = root.querySelectorAll(
    ".section-heading,.feature,.human-panel,.demo-intro,.chat-demo,.control-copy,.approval-art,.faq-section>div,.whitelist-copy,.whitelist-card",
  );
  elements.forEach((element, i) => {
    element.style.setProperty(
      "--reveal-delay",
      `${element.classList.contains("feature") ? (i % 3) * 80 : 0}ms`,
    );
    element.classList.add("reveal-ready");
    observer.observe(element);
  });
}
