import { loadCatalogue, artCard, imageElement } from "./catalogue.js";
import { initMotion } from "./motion.js";
import { initViewer } from "./viewer.js";
const $ = (selector) => document.querySelector(selector);
const motion = initMotion();
const menu = $("#menu");
$(".menu-button").addEventListener("click", () => menu.showModal());
$("[data-close-menu]").addEventListener("click", () => menu.close());
document.querySelectorAll(".header nav a").forEach((link) => {
  if (new URL(link.href).pathname === location.pathname)
    link.setAttribute("aria-current", "page");
});
const form = $("#contact-form");
if (form) {
  const work = new URLSearchParams(location.search).get("work");
  if (work) {
    form.elements.subject.value = "Informazioni su un’opera";
    form.elements.message.value = `Vorrei informazioni sull’opera “${work}”.`;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const body = `Nome: ${values.get("name")}\nEmail: ${values.get("email")}\n\n${values.get("message")}`;
    location.href = `mailto:studio@unconventionart.com?subject=${encodeURIComponent(values.get("subject"))}&body=${encodeURIComponent(body)}`;
    $("#contact-status").textContent =
      "Email preparata nella tua app di posta. Se non si apre, scrivi direttamente a studio@unconventionart.com. Il sito non invia messaggi automaticamente.";
  });
}
function collectionCard(collection, catalogue, index) {
  const work = catalogue.works.find((w) => w.collection === collection.id);
  if (!work) return null;
  const link = document.createElement("a");
  link.className = "world-card";
  link.href = `collection.html?series=${encodeURIComponent(collection.id)}`;
  link.dataset.cursor = "ENTRA";
  const frame = document.createElement("div");
  frame.className = "world-card-image";
  frame.append(imageElement(work));
  const info = document.createElement("div");
  info.className = "world-card-info";
  const group = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = collection.title;
  const subtitle = document.createElement("p");
  subtitle.textContent = collection.subtitle;
  const number = document.createElement("span");
  number.className = "eyebrow";
  number.textContent = `MONDO / ${String(index + 1).padStart(2, "0")}`;
  group.append(title, subtitle);
  info.append(group, number);
  link.append(frame, info);
  return link;
}
function renderArchive(catalogue) {
  const grid = $("#archive-grid");
  if (!grid) return;
  const params = new URLSearchParams(location.search);
  let selected = catalogue.collections.some(
    (c) => c.id === params.get("series"),
  )
    ? params.get("series")
    : "all";
  let layout = params.get("view") === "index" ? "index" : "gallery";
  const filters = [{ id: "all", title: "Tutte" }, ...catalogue.collections];
  function render() {
    const works = catalogue.works.filter(
      (work) => selected === "all" || work.collection === selected,
    );
    grid.replaceChildren(...works.map(artCard));
    grid.classList.toggle("index", layout === "index");
    $("#result-count").textContent = `${works.length} OPERE`;
    document
      .querySelectorAll("[data-filter]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.filter === selected),
        ),
      );
    document
      .querySelectorAll("[data-layout]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.layout === layout),
        ),
      );
  }
  function updateURL() {
    const query = new URLSearchParams();
    if (selected !== "all") query.set("series", selected);
    if (layout === "index") query.set("view", layout);
    history.replaceState(
      null,
      "",
      location.pathname + (query.size ? `?${query}` : "") + location.hash,
    );
  }
  filters.forEach((filter) => {
    const button = document.createElement("button");
    button.dataset.filter = filter.id;
    button.textContent = filter.title;
    button.addEventListener("click", () => {
      selected = filter.id;
      updateURL();
      if (document.startViewTransition && motion.enabled())
        document.startViewTransition(render);
      else render();
    });
    $("#filters").append(button);
  });
  document.querySelectorAll("[data-layout]").forEach((button) =>
    button.addEventListener("click", () => {
      layout = button.dataset.layout;
      updateURL();
      render();
    }),
  );
  render();
}
function renderCollection(catalogue) {
  if (!$("#collection-grid")) return;
  const id = new URLSearchParams(location.search).get("series");
  const collection = catalogue.collections.find((c) => c.id === id);
  if (!collection) {
    $("#collection-title").textContent = "Serie non trovata.";
    $("#collection-description").textContent =
      "Scegli una serie dall’archivio delle opere.";
    $("#collection-cover").hidden = true;
    return;
  }
  const works = catalogue.works.filter((work) => work.collection === id);
  document.title = `${collection.title} — UnconventionArt`;
  $("#collection-title").textContent = collection.title;
  $("#collection-description").textContent = collection.description;
  $("#collection-count").textContent =
    `${works.length} OPERE / UNCONVENTIONART`;
  if (works.length) {
    $("#collection-cover").src = works[0].image;
    $("#collection-cover").alt = works[0].alt;
  } else $("#collection-cover").hidden = true;
  $("#collection-grid").replaceChildren(...works.map(artCard));
  if (catalogue.collections.length > 1) {
    const next =
      catalogue.collections[
        (catalogue.collections.indexOf(collection) + 1) %
          catalogue.collections.length
      ];
    $("#next-collection").textContent = `${next.title} ↗`;
    $("#next-collection").href =
      `collection.html?series=${encodeURIComponent(next.id)}`;
  }
}
try {
  const catalogue = await loadCatalogue();
  document.querySelectorAll("[data-hero]").forEach((image) => {
    image.src = catalogue.hero;
  });
  if ($("#worlds-track"))
    catalogue.collections.forEach((collection, index) => {
      const card = collectionCard(collection, catalogue, index);
      if (card) $("#worlds-track").append(card);
    });
  if ($("#teaser-grid")) {
    const selected = catalogue.works.filter((w) => w.image !== catalogue.hero);
    $("#teaser-grid").append(
      ...[selected[0], selected[Math.min(5, selected.length - 1)]]
        .filter(Boolean)
        .map(artCard),
    );
  }
  renderArchive(catalogue);
  renderCollection(catalogue);
  initViewer(catalogue, motion);
  if (catalogue.placeholder && $("#catalogue-status"))
    $("#catalogue-status").textContent =
      "Catalogo dimostrativo: le immagini sono segnaposto del repository originale.";
  document.dispatchEvent(new Event("catalogue-ready"));
} catch (error) {
  const status = $("#catalogue-status") || document.createElement("p");
  status.textContent = error.message;
  status.setAttribute("role", "status");
  if (!status.isConnected) {
    status.className = "section";
    $("#main").append(status);
  }
}
