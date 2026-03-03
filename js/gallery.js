/* ============================================
   UnconventionArt — Gallery & Lightbox
   Portfolio rendering, filtering, lightbox
   ============================================ */

let portfolioData = [];
let currentFilter = 'all';
let lightboxIndex = 0;
let filteredItems = [];

// --- Load Portfolio Data ---
async function fetchPortfolio() {
  const res = await fetch('data/portfolio.json');
  portfolioData = await res.json();
  return portfolioData;
}

// --- Featured Works (Home page) ---
async function loadFeaturedWorks() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  const data = await fetchPortfolio();
  const featured = data.filter((item) => item.featured);

  featured.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'featured__item reveal' + (i === 0 ? ' featured__item--wide' : '');
    el.innerHTML = `
      <img src="${item.image}" alt="${item.title}" loading="lazy">
      <div class="featured__item-overlay">
        <p class="featured__item-title">${item.title}</p>
        <p class="featured__item-category">${item.series}</p>
      </div>
    `;
    el.addEventListener('click', () => {
      window.location.href = 'portfolio.html';
    });
    grid.appendChild(el);
  });

  // Re-init reveal for dynamically added items
  initReveal(grid.querySelectorAll('.reveal'));
}

// --- Portfolio Page ---
async function loadPortfolio() {
  const filtersContainer = document.getElementById('galleryFilters');
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  const data = await fetchPortfolio();

  // Build filter buttons
  const categories = ['all', ...new Set(data.map((item) => item.category))];
  if (filtersContainer) {
    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'gallery__filter' + (cat === 'all' ? ' active' : '');
      btn.textContent = cat === 'all' ? 'All Works' : cat;
      btn.dataset.filter = cat;
      btn.addEventListener('click', () => filterGallery(cat));
      filtersContainer.appendChild(btn);
    });
  }

  // Render gallery items
  renderGallery(data, grid);
}

function renderGallery(data, grid) {
  grid.innerHTML = '';
  data.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'gallery__item';
    el.dataset.category = item.category;
    el.innerHTML = `
      <img src="${item.image}" alt="${item.title}" loading="lazy">
      <div class="gallery__item-info">
        <p class="gallery__item-title">${item.title}</p>
        <p class="gallery__item-series">${item.series}</p>
      </div>
    `;
    el.addEventListener('click', () => openLightbox(i));
    grid.appendChild(el);
  });

  filteredItems = data;
}

function filterGallery(category) {
  currentFilter = category;
  const grid = document.getElementById('galleryGrid');
  const buttons = document.querySelectorAll('.gallery__filter');

  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === category);
  });

  const filtered =
    category === 'all'
      ? portfolioData
      : portfolioData.filter((item) => item.category === category);

  renderGallery(filtered, grid);
}

// --- Lightbox ---
function openLightbox(index) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  lightboxIndex = index;
  updateLightboxContent();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function updateLightboxContent() {
  const item = filteredItems[lightboxIndex];
  if (!item) return;

  const img = document.getElementById('lightboxImg');
  const title = document.getElementById('lightboxTitle');
  const series = document.getElementById('lightboxSeries');

  img.src = item.image;
  img.alt = item.title;
  title.textContent = item.title;
  series.textContent = item.series;
}

function lightboxPrev() {
  lightboxIndex = (lightboxIndex - 1 + filteredItems.length) % filteredItems.length;
  updateLightboxContent();
}

function lightboxNext() {
  lightboxIndex = (lightboxIndex + 1) % filteredItems.length;
  updateLightboxContent();
}

// Lightbox event listeners
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const lightbox = document.getElementById('lightbox');

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', lightboxPrev);
  if (nextBtn) nextBtn.addEventListener('click', lightboxNext);

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('open')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
  });
});

// --- Reveal helper for dynamic elements ---
function initReveal(elements) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}
