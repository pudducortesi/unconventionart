/** Motion is decorative: navigation and content do not depend on animation. */
export function initMotion() {
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let enabled = !preference.matches;
  try {
    if (localStorage.getItem("ua-motion") === "off") enabled = false;
  } catch {}
  const button = document.querySelector("[data-motion]");
  const hero = document.querySelector(".threshold");
  const frame = document.querySelector(".hero-frame");
  const worlds = document.querySelector(".worlds");
  const track = document.querySelector(".worlds-track");
  let pending = false;
  function draw() {
    pending = false;
    if (hero)
      hero.style.setProperty(
        "--scroll",
        enabled ? Math.min(1, scrollY / hero.offsetHeight) : 0,
      );
    if (track && worlds) {
      const rect = worlds.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)),
      );
      const overflow = Math.max(0, track.scrollWidth - innerWidth);
      track.style.transform =
        enabled && innerWidth > 600
          ? `translateX(${-progress * overflow}px)`
          : "";
    }
  }
  function schedule() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(draw);
    }
  }
  function apply() {
    document.body.classList.toggle("motion-enabled", enabled);
    document.body.classList.toggle("motion-off", !enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = `Movimento: ${enabled ? "attivo" : "fermo"}`;
    schedule();
  }
  button.addEventListener("click", () => {
    enabled = !enabled;
    try {
      localStorage.setItem("ua-motion", enabled ? "on" : "off");
    } catch {}
    apply();
  });
  preference.addEventListener("change", (event) => {
    enabled = !event.matches;
    apply();
  });
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  document.addEventListener("catalogue-ready", schedule);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.15 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((element) => observer.observe(element));
  } else
    document
      .querySelectorAll("[data-reveal]")
      .forEach((element) => element.classList.add("visible"));
  const cursor = document.querySelector(".cursor");
  if (matchMedia("(pointer:fine)").matches) {
    addEventListener(
      "pointermove",
      (event) => {
        if (!enabled) return;
        if (frame && scrollY < innerHeight) {
          const x = event.clientX / innerWidth - 0.5;
          const y = event.clientY / innerHeight - 0.5;
          frame.style.setProperty("--hx", `${x * 16}px`);
          frame.style.setProperty("--hy", `${y * 12}px`);
          frame.style.setProperty("--ry", `${x * 4}deg`);
        }
        const target = event.target.closest("[data-cursor]");
        cursor.classList.toggle("visible", !!target);
        cursor.style.transform = `translate(${event.clientX - 35}px,${event.clientY - 35}px)`;
        if (target)
          cursor.firstElementChild.textContent = target.dataset.cursor;
      },
      { passive: true },
    );
    document.addEventListener("pointerleave", () =>
      cursor.classList.remove("visible"),
    );
  }
  apply();
  return { enabled: () => enabled };
}
