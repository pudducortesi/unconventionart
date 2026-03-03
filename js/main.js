/* ============================================
   UnconventionArt — Main JS
   ============================================ */

// --- Mobile Nav ---
(function () {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      menu.classList.remove('open');
    });
  });
})();

// --- Scroll Reveal ---
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  els.forEach(el => observer.observe(el));
})();

// --- Data Fetch Helper ---
async function fetchJSON(path) {
  const res = await fetch(path);
  return res.json();
}

// --- Format Date ---
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

// --- Load Recent Exhibitions (Home) ---
async function loadRecentExhibitions() {
  const container = document.getElementById('recentExhibitions');
  if (!container) return;
  const data = await fetchJSON('data/exhibitions.json');
  const recent = data.slice(0, 4);

  container.innerHTML = recent.map(item => `
    <a href="exhibitions.html" class="exh-card reveal">
      <div class="exh-card__img">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
      </div>
      <h3 class="exh-card__title">${item.title}</h3>
      <p class="exh-card__meta">${item.series} &mdash; ${item.category}</p>
    </a>
  `).join('');

  // Re-observe reveals
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 }).observe(el);
  });
}

// --- Load Gallery (Exhibitions page) ---
let galleryData = [];
let filteredData = [];
let currentIndex = 0;

async function loadGallery() {
  const container = document.getElementById('galleryGrid');
  if (!container) return;
  galleryData = await fetchJSON('data/exhibitions.json');
  filteredData = [...galleryData];

  renderGallery(container);
  setupFilters();
  setupLightbox();
}

function renderGallery(container) {
  container.innerHTML = filteredData.map((item, i) => `
    <div class="gallery-grid__item" data-index="${i}">
      <img src="${item.image}" alt="${item.title}" loading="lazy">
    </div>
  `).join('');

  container.querySelectorAll('.gallery-grid__item').forEach(el => {
    el.addEventListener('click', () => {
      currentIndex = parseInt(el.dataset.index);
      openLightbox();
    });
  });
}

function setupFilters() {
  const buttons = document.querySelectorAll('.filters__btn');
  const container = document.getElementById('galleryGrid');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      filteredData = filter === 'all'
        ? [...galleryData]
        : galleryData.filter(item => item.category === filter);

      renderGallery(container);
    });
  });
}

function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => navigateLightbox(-1));
  document.getElementById('lightboxNext').addEventListener('click', () => navigateLightbox(1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

function openLightbox() {
  const lightbox = document.getElementById('lightbox');
  const item = filteredData[currentIndex];
  document.getElementById('lightboxImg').src = item.image;
  document.getElementById('lightboxImg').alt = item.title;
  document.getElementById('lightboxTitle').textContent = item.title;
  document.getElementById('lightboxMeta').textContent = item.series + ' — ' + item.category;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function navigateLightbox(dir) {
  currentIndex = (currentIndex + dir + filteredData.length) % filteredData.length;
  openLightbox();
}

// --- Load Journal (listing) ---
async function loadJournal() {
  const container = document.getElementById('journalGrid');
  if (!container) return;
  const data = await fetchJSON('data/journal.json');

  container.innerHTML = data.map(post => `
    <a href="post.html?slug=${post.slug}" class="journal-card">
      <div class="journal-card__img">
        <img src="${post.image}" alt="${post.title}" loading="lazy">
      </div>
      <p class="journal-card__meta">${formatDate(post.date)} &mdash; ${post.tag}</p>
      <h3 class="journal-card__title">${post.title}</h3>
      <p class="journal-card__excerpt">${post.excerpt}</p>
    </a>
  `).join('');
}

// --- Load Single Post ---
async function loadPost() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) return;

  const data = await fetchJSON('data/journal.json');
  const post = data.find(p => p.slug === slug);
  if (!post) return;

  document.title = post.title + ' — UnconventionArt';
  document.getElementById('postMeta').textContent = formatDate(post.date) + ' — ' + post.tag;
  document.getElementById('postTitle').textContent = post.title;
  document.getElementById('postSubtitle').textContent = post.subtitle;

  if (post.image) {
    document.getElementById('postHero').innerHTML = `<img src="${post.image}" alt="${post.title}">`;
  }

  document.getElementById('postBody').innerHTML = post.content;
}
