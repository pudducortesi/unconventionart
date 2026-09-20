import { imageElement } from "./catalogue.js";
export function initViewer(catalogue, motion) {
  const dialog = document.querySelector("#viewer");
  const image = document.querySelector("#viewer-image");
  const variants = document.querySelector("#viewer-variants");
  let selected = [],
    current = 0,
    variant = 0,
    previousFocus,
    previousHash = "",
    generation = 0;
  const byId = (id) => catalogue.works.find((work) => String(work.id) === id);
  function paint() {
    const work = selected[current];
    const sources = [work.image, ...(work.variants || [])];
    const version = ++generation;
    image.src = sources[variant];
    image.alt = `${work.alt || work.title}${variant ? ` — variazione ${variant}` : ""}`;
    document.querySelector("#viewer-title").textContent = work.title;
    document.querySelector("#viewer-credit").textContent = work.credit;
    document.querySelector("#viewer-series").textContent =
      catalogue.collections.find((c) => c.id === work.collection)?.title || "";
    document.querySelector("#viewer-count").textContent =
      `${String(current + 1).padStart(2, "0")} / ${String(selected.length).padStart(2, "0")}`;
    document.querySelector("#viewer-contact").href =
      `contact.html?work=${encodeURIComponent(work.title)}`;
    document.querySelector("#viewer-live").textContent =
      `${work.title}, fotografia ${current + 1} di ${selected.length}`;
    dialog.querySelectorAll(".arrow").forEach((button) => {
      button.disabled = selected.length < 2;
    });
    variants.replaceChildren();
    if (sources.length > 1)
      sources.forEach((source, index) => {
        const button = document.createElement("button");
        button.setAttribute(
          "aria-label",
          index ? `Mostra variazione ${index}` : "Mostra fotografia principale",
        );
        button.setAttribute("aria-pressed", String(variant === index));
        button.append(imageElement({ image: source, title: "" }));
        button.addEventListener("click", () => {
          variant = index;
          paint();
          variants.children[index]?.focus();
        });
        variants.append(button);
      });
    history.replaceState(null, "", `#work=${encodeURIComponent(work.id)}`);
    image
      .decode()
      .then(() => {
        if (version === generation && motion.enabled())
          image.animate(
            [
              { opacity: 0.25, transform: "translateY(9px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 400, easing: "ease-out" },
          );
      })
      .catch(() => {});
    const next = selected[(current + 1) % selected.length];
    if (next && selected.length > 1) {
      const preload = new Image();
      preload.src = next.image;
    }
  }
  function open(id) {
    const work = byId(id);
    if (!work) return;
    selected = catalogue.works.filter((w) => w.collection === work.collection);
    current = selected.indexOf(work);
    variant = 0;
    if (!dialog.open) {
      previousFocus = document.activeElement;
      previousHash = location.hash.startsWith("#work=") ? "" : location.hash;
      dialog.showModal();
    }
    paint();
  }
  function step(delta) {
    if (!selected.length) return;
    current = (current + delta + selected.length) % selected.length;
    variant = 0;
    paint();
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-work]");
    if (
      !link ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (!byId(link.dataset.work)) return;
    event.preventDefault();
    open(link.dataset.work);
  });
  dialog
    .querySelector("[data-close-viewer]")
    .addEventListener("click", () => dialog.close());
  dialog.querySelector(".previous").addEventListener("click", () => step(-1));
  dialog.querySelector(".next").addEventListener("click", () => step(1));
  dialog.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    }
  });
  dialog.addEventListener("close", () => {
    generation++;
    history.replaceState(
      null,
      "",
      location.pathname + location.search + previousHash,
    );
    previousFocus?.focus({ preventScroll: true });
  });
  let touch;
  const stage = dialog.querySelector(".viewer-stage");
  stage.addEventListener(
    "touchstart",
    (event) => {
      touch = event.touches.length === 1 ? event.touches[0] : null;
    },
    { passive: true },
  );
  stage.addEventListener(
    "touchend",
    (event) => {
      if (!touch || !event.changedTouches.length) return;
      const end = event.changedTouches[0],
        dx = end.clientX - touch.clientX,
        dy = end.clientY - touch.clientY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
        step(dx < 0 ? 1 : -1);
      touch = null;
    },
    { passive: true },
  );
  function fromHash() {
    if (location.hash.startsWith("#work=")) {
      try {
        open(decodeURIComponent(location.hash.slice(6)));
      } catch {
        /* Ignore invalid URL fragments. */
      }
    }
  }
  addEventListener("hashchange", fromHash);
  fromHash();
}
