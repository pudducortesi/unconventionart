/* ============================================
   UnconventionArt — Main JS
   Phil Penman / Monochrome Dark style
   ============================================ */

// --- Mobile Nav ---
(function () {
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', function () {
    toggle.classList.toggle('active');
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      toggle.classList.remove('active');
      menu.classList.remove('open');
    });
  });
})();

// --- Scroll Reveal ---
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(function (el) { observer.observe(el); });
})();

// --- Helpers ---
async function fetchJSON(path) {
  var res = await fetch(path);
  return res.json();
}

function formatDate(dateStr) {
  var d = new Date(dateStr);
  var months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function reobserveReveals() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) {
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 }).observe(el);
  });
}

// --- Works Grid Item HTML ---
function workGridItem(item, index) {
  return '<div class="works-grid__item" data-index="' + index + '">' +
    '<img src="' + item.image + '" alt="' + item.title + '" loading="lazy">' +
    '<div class="works-grid__item-info">' +
      '<h4>' + item.title + '</h4>' +
      '<span>' + item.series + '</span>' +
    '</div>' +
  '</div>';
}

// --- Viewing Room Card HTML ---
function vrCard(series, items) {
  var first = items[0];
  return '<div class="vr-card">' +
    '<img src="' + first.image + '" alt="' + series + '" loading="lazy">' +
    '<div class="vr-card__info">' +
      '<h3>' + series + '</h3>' +
      '<span>' + first.date + ' &mdash; ' + items.length + ' works</span>' +
    '</div>' +
  '</div>';
}

// --- Exhibition Tabs ---
(function () {
  var tabsContainer = document.getElementById('exhTabs');
  if (!tabsContainer) return;

  var tabs = tabsContainer.querySelectorAll('a');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      e.preventDefault();
      var target = tab.dataset.tab;

      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');

      document.querySelectorAll('[id^="panel-"]').forEach(function (p) {
        p.style.display = 'none';
      });
      var panel = document.getElementById('panel-' + target);
      if (panel) panel.style.display = '';
    });
  });

  loadWorks();
})();

// --- Load Works (exhibitions page) ---
async function loadWorks() {
  var allContainer = document.getElementById('allWorks');
  var currentContainer = document.getElementById('currentWorks');
  var pastContainer = document.getElementById('pastWorks');
  var vrContainer = document.getElementById('viewingRooms');
  if (!allContainer) return;

  var data = await fetchJSON('data/exhibitions.json');

  // All works grid
  allContainer.innerHTML = data.map(function (item, i) {
    return workGridItem(item, i);
  }).join('');

  // Current
  if (currentContainer) {
    var current = data.filter(function (d) { return d.status === 'current'; });
    currentContainer.innerHTML = current.map(function (item) {
      return workGridItem(item, data.indexOf(item));
    }).join('');
  }

  // Past
  if (pastContainer) {
    var past = data.filter(function (d) { return d.status === 'past'; });
    pastContainer.innerHTML = past.map(function (item) {
      return workGridItem(item, data.indexOf(item));
    }).join('');
  }

  // Viewing Rooms — group by series
  if (vrContainer) {
    var series = {};
    data.forEach(function (item) {
      if (!series[item.series]) series[item.series] = [];
      series[item.series].push(item);
    });

    vrContainer.innerHTML = Object.keys(series).map(function (s) {
      return vrCard(s, series[s]);
    }).join('');
  }

  setupLightbox(data);
}

// --- Load Recent Works (Home) ---
async function loadRecentWorks() {
  var container = document.getElementById('recentWorks');
  if (!container) return;

  var data = await fetchJSON('data/exhibitions.json');
  var recent = data.slice(0, 6);

  container.innerHTML = recent.map(function (item, i) {
    return workGridItem(item, i);
  }).join('');

  setupLightbox(data);
  reobserveReveals();
}

// --- Lightbox ---
var lbData = [];
var lbIndex = 0;

function setupLightbox(data) {
  lbData = data;
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  document.querySelectorAll('.works-grid__item').forEach(function (el) {
    el.addEventListener('click', function () {
      var idx = parseInt(el.dataset.index);
      if (!isNaN(idx)) {
        lbIndex = idx;
        openLightbox();
      }
    });
  });

  var closeBtn = document.getElementById('lightboxClose');
  var prevBtn = document.getElementById('lightboxPrev');
  var nextBtn = document.getElementById('lightboxNext');

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', function () { navLightbox(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { navLightbox(1); });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
  });
}

function openLightbox() {
  var lightbox = document.getElementById('lightbox');
  var item = lbData[lbIndex];
  if (!item || !lightbox) return;
  document.getElementById('lightboxImg').src = item.image;
  document.getElementById('lightboxImg').alt = item.title;
  document.getElementById('lightboxTitle').textContent = item.title;
  document.getElementById('lightboxMeta').textContent = item.series + ' \u2014 ' + item.category;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  var lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('open');
  document.body.style.overflow = '';
}

function navLightbox(dir) {
  lbIndex = (lbIndex + dir + lbData.length) % lbData.length;
  openLightbox();
}

// --- Load Recent News (Home) ---
async function loadRecentNews() {
  var container = document.getElementById('recentNews');
  if (!container) return;

  var data = await fetchJSON('data/journal.json');
  var recent = data.slice(0, 2);

  container.innerHTML = recent.map(function (post) {
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

// --- Load News List (Journal page) ---
async function loadNewsList() {
  var container = document.getElementById('newsList');
  if (!container) return;

  var data = await fetchJSON('data/journal.json');

  container.innerHTML = data.map(function (post) {
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
  var post = data.find(function (p) { return p.slug === slug; });
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

// --- Auto-init ---
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('recentWorks')) loadRecentWorks();
  if (document.getElementById('recentNews')) loadRecentNews();
  if (document.getElementById('newsList')) loadNewsList();
  if (document.getElementById('postBody')) loadPost();
});
