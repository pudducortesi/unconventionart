/* ============================================
   UnconventionArt — Main JS
   Artlogic / Atlas Gallery style
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
  }, { threshold: 0.1 });

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
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

// --- Hero Slideshow ---
(function () {
  const slides = document.getElementById('heroSlides');
  const dotsContainer = document.getElementById('heroDots');
  if (!slides || !dotsContainer) return;

  const slideEls = slides.querySelectorAll('.hero__slide');
  if (slideEls.length < 2) return;

  // Create dots
  slideEls.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.classList.add('hero__dot');
    if (i === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', 'Slide ' + (i + 1));
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  let current = 0;
  let interval = setInterval(nextSlide, 5000);

  function goToSlide(index) {
    slideEls[current].classList.remove('active');
    dotsContainer.children[current].classList.remove('active');
    current = index;
    slideEls[current].classList.add('active');
    dotsContainer.children[current].classList.add('active');
    clearInterval(interval);
    interval = setInterval(nextSlide, 5000);
  }

  function nextSlide() {
    goToSlide((current + 1) % slideEls.length);
  }
})();

// --- Exhibition Tabs ---
(function () {
  const tabsContainer = document.getElementById('exhTabs');
  if (!tabsContainer) return;

  const tabs = tabsContainer.querySelectorAll('a');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('[id^="panel-"]').forEach(p => {
        p.style.display = 'none';
      });
      const panel = document.getElementById('panel-' + target);
      if (panel) panel.style.display = '';
    });
  });

  loadExhibitions();
})();

// --- Load Exhibitions ---
async function loadExhibitions() {
  const currentContainer = document.getElementById('currentExhibitions');
  const pastContainer = document.getElementById('pastExhibitions');
  if (!currentContainer && !pastContainer) return;

  const data = await fetchJSON('data/exhibitions.json');
  const current = data.filter(item => item.status === 'current');
  const past = data.filter(item => item.status === 'past');

  if (currentContainer) {
    // Group by series for current
    const series = {};
    current.forEach(item => {
      if (!series[item.series]) series[item.series] = [];
      series[item.series].push(item);
    });

    let html = '';
    Object.keys(series).forEach(seriesName => {
      const items = series[seriesName];
      const first = items[0];
      html += '<div class="exh-item">' +
        '<div class="exh-item__img">' +
          '<img src="' + first.image + '" alt="' + seriesName + '" loading="lazy">' +
        '</div>' +
        '<div class="exh-item__info">' +
          '<p class="text-upper">' + first.date + '</p>' +
          '<h3>' + seriesName + '</h3>' +
          '<p>' + items.map(function(i) { return i.title; }).join(', ') + '. ' + first.description + '</p>' +
          '<div class="gallery-grid" style="grid-template-columns:repeat(' + Math.min(items.length, 4) + ',1fr);gap:8px;margin-top:16px;">' +
            items.map(function(item) {
              return '<div class="gallery-grid__item" data-index="' + data.indexOf(item) + '">' +
                '<div class="gallery-grid__item-img">' +
                  '<img src="' + item.image + '" alt="' + item.title + '" loading="lazy">' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
    });
    currentContainer.innerHTML = html;
  }

  if (pastContainer) {
    pastContainer.innerHTML = past.map(function(item) {
      return '<div class="exh-grid__item" data-index="' + data.indexOf(item) + '">' +
        '<div class="exh-grid__item-img">' +
          '<img src="' + item.image + '" alt="' + item.title + '" loading="lazy">' +
        '</div>' +
        '<h4>' + item.title + '</h4>' +
        '<p class="text-upper">' + item.series + ' &mdash; ' + item.date + '</p>' +
      '</div>';
    }).join('');
  }

  // Setup lightbox for all clickable items
  setupExhibitionLightbox(data);
}

// --- Exhibition Lightbox ---
var allExhData = [];
var currentLightboxIndex = 0;

function setupExhibitionLightbox(data) {
  allExhData = data;
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  document.querySelectorAll('.gallery-grid__item, .exh-grid__item').forEach(function(el) {
    el.addEventListener('click', function() {
      var idx = parseInt(el.dataset.index);
      if (!isNaN(idx)) {
        currentLightboxIndex = idx;
        openLightbox();
      }
    });
  });

  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', function() { navigateLightbox(-1); });
  document.getElementById('lightboxNext').addEventListener('click', function() { navigateLightbox(1); });

  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function(e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

function openLightbox() {
  var lightbox = document.getElementById('lightbox');
  var item = allExhData[currentLightboxIndex];
  if (!item) return;
  document.getElementById('lightboxImg').src = item.image;
  document.getElementById('lightboxImg').alt = item.title;
  document.getElementById('lightboxTitle').textContent = item.title;
  document.getElementById('lightboxMeta').textContent = item.series + ' \u2014 ' + item.category;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function navigateLightbox(dir) {
  currentLightboxIndex = (currentLightboxIndex + dir + allExhData.length) % allExhData.length;
  openLightbox();
}

// --- Load Recent Works (Home) ---
async function loadRecentWorks() {
  var container = document.getElementById('recentWorks');
  if (!container) return;

  var data = await fetchJSON('data/exhibitions.json');
  var recent = data.slice(0, 6);

  container.innerHTML = recent.map(function(item) {
    return '<div class="exh-grid__item">' +
      '<div class="exh-grid__item-img">' +
        '<img src="' + item.image + '" alt="' + item.title + '" loading="lazy">' +
      '</div>' +
      '<h4>' + item.title + '</h4>' +
      '<p class="text-upper">' + item.series + '</p>' +
    '</div>';
  }).join('');

  reobserveReveals();
}

// --- Load Recent News (Home) ---
async function loadRecentNews() {
  var container = document.getElementById('recentNews');
  if (!container) return;

  var data = await fetchJSON('data/journal.json');
  var recent = data.slice(0, 2);

  container.innerHTML = recent.map(function(post) {
    return '<a href="post.html?slug=' + post.slug + '" class="news-item">' +
      '<div class="news-item__img">' +
        '<img src="' + post.image + '" alt="' + post.title + '" loading="lazy">' +
      '</div>' +
      '<div class="news-item__info">' +
        '<p class="text-upper">' + formatDate(post.date) + ' &mdash; ' + post.tag + '</p>' +
        '<h3>' + post.title + '</h3>' +
        '<p>' + post.excerpt + '</p>' +
      '</div>' +
    '</a>';
  }).join('');

  reobserveReveals();
}

// --- Load News List (News page) ---
async function loadNewsList() {
  var container = document.getElementById('newsList');
  if (!container) return;

  var data = await fetchJSON('data/journal.json');

  container.innerHTML = data.map(function(post) {
    return '<a href="post.html?slug=' + post.slug + '" class="news-item">' +
      '<div class="news-item__img">' +
        '<img src="' + post.image + '" alt="' + post.title + '" loading="lazy">' +
      '</div>' +
      '<div class="news-item__info">' +
        '<p class="text-upper">' + formatDate(post.date) + ' &mdash; ' + post.tag + '</p>' +
        '<h3>' + post.title + '</h3>' +
        '<p>' + post.excerpt + '</p>' +
      '</div>' +
    '</a>';
  }).join('');
}

// --- Load Single Post ---
async function loadPost() {
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug');
  if (!slug) return;

  var data = await fetchJSON('data/journal.json');
  var post = data.find(function(p) { return p.slug === slug; });
  if (!post) return;

  document.title = post.title + ' \u2014 UnconventionArt';

  var metaEl = document.getElementById('postMeta');
  var titleEl = document.getElementById('postTitle');
  var subtitleEl = document.getElementById('postSubtitle');
  var heroEl = document.getElementById('postHero');
  var bodyEl = document.getElementById('postBody');

  if (metaEl) metaEl.textContent = formatDate(post.date) + ' \u2014 ' + post.tag;
  if (titleEl) titleEl.textContent = post.title;
  if (subtitleEl) subtitleEl.textContent = post.subtitle;
  if (heroEl && post.image) heroEl.innerHTML = '<img src="' + post.image + '" alt="' + post.title + '">';
  if (bodyEl) bodyEl.innerHTML = post.content;
}

// --- Re-observe reveals after dynamic content ---
function reobserveReveals() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(function(el) {
    new IntersectionObserver(function(entries, obs) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 }).observe(el);
  });
}

// --- Auto-init based on page ---
document.addEventListener('DOMContentLoaded', function() {
  // Home page
  if (document.getElementById('recentWorks')) loadRecentWorks();
  if (document.getElementById('recentNews')) loadRecentNews();

  // News page
  if (document.getElementById('newsList')) loadNewsList();

  // Post page
  if (document.getElementById('postBody')) loadPost();
});
