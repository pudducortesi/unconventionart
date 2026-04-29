/* ============================================================
   UnconventionArt — Main JS (v2)
   ============================================================ */

(function () {
  'use strict';

  // Header scroll state
  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 30) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu
  var toggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('is-open');
      toggle.classList.toggle('is-active', open);
      document.body.classList.toggle('no-scroll', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('is-open');
        toggle.classList.remove('is-active');
        document.body.classList.remove('no-scroll');
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        mobileMenu.classList.remove('is-open');
        toggle.classList.remove('is-active');
        document.body.classList.remove('no-scroll');
      }
    });
  }

  // Reveal
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible', 'visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible', 'visible'); });
  }

  function reobserveReveals() {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach(function (el) {
      if (!('IntersectionObserver' in window)) {
        el.classList.add('is-visible', 'visible');
        return;
      }
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible', 'visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 }).observe(el);
    });
  }

  // Helpers
  function fetchJSON(path) { return fetch(path).then(function (r) { return r.json(); }); }

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // Markup builders
  function workGridItem(item, index) {
    return '<div class="works-grid__item reveal" data-index="' + index + '">' +
      '<div class="works-grid__item-media">' +
        '<img src="' + escapeHTML(item.image) + '" alt="' + escapeHTML(item.title) + '" loading="lazy">' +
        '<span class="works-grid__item-logo" aria-hidden="true">' +
          '<img src="images/site/logo-small.png" alt="">' +
        '</span>' +
        '<span class="works-grid__item-num">N° ' + pad2(index + 1) + '</span>' +
      '</div>' +
      '<div class="works-grid__item-plaque">' +
        '<div class="works-grid__item-plaque__text">' +
          '<p class="works-grid__item-plaque__title">' + escapeHTML(item.title) + '</p>' +
          '<p class="works-grid__item-plaque__meta">' + escapeHTML(item.series || '') + (item.category ? ' · ' + escapeHTML(item.category) : '') + '</p>' +
        '</div>' +
        '<span class="works-grid__item-plaque__arrow" aria-hidden="true">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>' +
        '</span>' +
      '</div>' +
    '</div>';
  }

  function vrCard(series, items) {
    var first = items[0];
    return '<a href="exhibitions.html#' + encodeURIComponent(series) + '" class="vr-card reveal">' +
      '<div class="vr-card-media">' +
        '<img src="' + escapeHTML(first.image) + '" alt="' + escapeHTML(series) + '" loading="lazy">' +
        '<span class="vr-card-logo" aria-hidden="true">' +
          '<img src="images/site/logo-small.png" alt="">' +
        '</span>' +
        '<span class="vr-card-tag">' + items.length + ' Works</span>' +
      '</div>' +
      '<div class="vr-card-plaque">' +
        '<div class="vr-card-plaque__text">' +
          '<p class="vr-card-plaque__title">' + escapeHTML(series) + '</p>' +
          '<p class="vr-card-plaque__meta">' + escapeHTML(first.date || '') + ' — Series</p>' +
        '</div>' +
        '<span class="vr-card-plaque__arrow">' +
          'View →' +
        '</span>' +
      '</div>' +
    '</a>';
  }

  function newsItem(post) {
    return '<a href="post.html?slug=' + encodeURIComponent(post.slug) + '" class="news-item reveal">' +
      '<div class="news-item__img">' +
        '<img src="' + escapeHTML(post.image) + '" alt="' + escapeHTML(post.title) + '" loading="lazy">' +
      '</div>' +
      '<div class="news-item__info">' +
        '<p class="eyebrow">' + escapeHTML(formatDate(post.date)) + ' — ' + escapeHTML(post.tag) + '</p>' +
        '<h3>' + escapeHTML(post.title) + '</h3>' +
        '<p>' + escapeHTML(post.excerpt) + '</p>' +
      '</div>' +
      '<span class="news-item__arrow" aria-hidden="true">→</span>' +
    '</a>';
  }

  // Lightbox
  var lbData = [];
  var lbIndex = 0;
  var touchStartX = 0;

  function openLightbox(idx) {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    var item = lbData[idx];
    if (!item) return;
    lbIndex = idx;
    var imgEl = document.getElementById('lightboxImg');
    var titleEl = document.getElementById('lightboxTitle');
    var metaEl = document.getElementById('lightboxMeta');
    var counterEl = document.getElementById('lightboxCounter');

    if (imgEl) { imgEl.src = item.image; imgEl.alt = item.title; }
    if (titleEl) titleEl.textContent = item.title;
    if (metaEl) metaEl.textContent = (item.series || '') + (item.category ? ' — ' + item.category : '');
    if (counterEl) counterEl.textContent = pad2(idx + 1) + ' / ' + pad2(lbData.length);

    lightbox.classList.add('is-open');
    document.body.classList.add('no-scroll');
    if (item.id) history.replaceState(null, '', '#work-' + item.id);
  }

  function closeLightbox() {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    if (location.hash.indexOf('#work-') === 0) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  function navLightbox(dir) {
    if (!lbData.length) return;
    openLightbox((lbIndex + dir + lbData.length) % lbData.length);
  }

  function setupLightbox(data) {
    lbData = data;
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    document.querySelectorAll('.works-grid__item').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = parseInt(el.dataset.index, 10);
        if (!isNaN(idx)) openLightbox(idx);
      });
    });

    var closeBtn = document.getElementById('lightboxClose');
    var prevBtn  = document.getElementById('lightboxPrev');
    var nextBtn  = document.getElementById('lightboxNext');
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn)  prevBtn.addEventListener('click', function () { navLightbox(-1); });
    if (nextBtn)  nextBtn.addEventListener('click', function () { navLightbox(1); });

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape')      closeLightbox();
      else if (e.key === 'ArrowLeft')  navLightbox(-1);
      else if (e.key === 'ArrowRight') navLightbox(1);
    });

    lightbox.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      var delta = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(delta) > 50) navLightbox(delta > 0 ? -1 : 1);
    }, { passive: true });

    var match = location.hash.match(/#work-(\d+)/);
    if (match) {
      var targetId = parseInt(match[1], 10);
      var idx = lbData.findIndex(function (d) { return d.id === targetId; });
      if (idx >= 0) openLightbox(idx);
    }
  }

  // Exhibition tabs
  var tabsContainer = document.getElementById('exhTabs');
  if (tabsContainer) {
    var tabs = tabsContainer.querySelectorAll('a');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        var target = tab.dataset.tab;
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('[id^="panel-"]').forEach(function (p) { p.style.display = 'none'; });
        var panel = document.getElementById('panel-' + target);
        if (panel) panel.style.display = '';
        reobserveReveals();
      });
    });
  }

  function loadWorks() {
    var allContainer     = document.getElementById('allWorks');
    var currentContainer = document.getElementById('currentWorks');
    var pastContainer    = document.getElementById('pastWorks');
    var vrContainer      = document.getElementById('viewingRooms');
    if (!allContainer) return Promise.resolve(null);

    return fetchJSON('data/exhibitions.json').then(function (data) {
      allContainer.innerHTML = data.map(function (item, i) { return workGridItem(item, i); }).join('');

      if (currentContainer) {
        var current = data.filter(function (d) { return d.status === 'current'; });
        currentContainer.innerHTML = current.map(function (item) { return workGridItem(item, data.indexOf(item)); }).join('');
      }
      if (pastContainer) {
        var past = data.filter(function (d) { return d.status === 'past'; });
        pastContainer.innerHTML = past.map(function (item) { return workGridItem(item, data.indexOf(item)); }).join('');
      }
      if (vrContainer) {
        var series = {};
        data.forEach(function (item) {
          if (!series[item.series]) series[item.series] = [];
          series[item.series].push(item);
        });
        vrContainer.innerHTML = Object.keys(series).map(function (s) { return vrCard(s, series[s]); }).join('');
      }

      setupLightbox(data);
      reobserveReveals();
      return data;
    });
  }

  function loadRecentWorks() {
    var container = document.getElementById('recentWorks');
    if (!container) return Promise.resolve(null);
    return fetchJSON('data/exhibitions.json').then(function (data) {
      var recent = data.slice(0, 6);
      container.innerHTML = recent.map(function (item, i) { return workGridItem(item, i); }).join('');
      setupLightbox(recent);
      reobserveReveals();
      return data;
    });
  }

  function loadRecentNews() {
    var container = document.getElementById('recentNews');
    if (!container) return Promise.resolve(null);
    return fetchJSON('data/journal.json').then(function (data) {
      container.innerHTML = data.slice(0, 2).map(newsItem).join('');
      reobserveReveals();
      return data;
    });
  }

  function loadNewsList() {
    var container = document.getElementById('newsList');
    if (!container) return Promise.resolve(null);
    return fetchJSON('data/journal.json').then(function (data) {
      container.innerHTML = data.map(newsItem).join('');
      reobserveReveals();
      return data;
    });
  }

  function loadPost() {
    var bodyEl = document.getElementById('postBody');
    if (!bodyEl) return Promise.resolve(null);
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');
    if (!slug) return Promise.resolve(null);

    return fetchJSON('data/journal.json').then(function (data) {
      var post = data.find(function (p) { return p.slug === slug; });
      if (!post) return null;

      document.title = post.title + ' — UnconventionArt';
      var metaEl     = document.getElementById('postMeta');
      var titleEl    = document.getElementById('postTitle');
      var subtitleEl = document.getElementById('postSubtitle');
      var heroEl     = document.getElementById('postHero');

      if (metaEl)     metaEl.textContent = formatDate(post.date) + ' — ' + post.tag;
      if (titleEl)    titleEl.textContent = post.title;
      if (subtitleEl) subtitleEl.textContent = post.subtitle || '';
      if (heroEl && post.image) {
        heroEl.innerHTML = '<img src="' + escapeHTML(post.image) + '" alt="' + escapeHTML(post.title) + '">';
      }
      bodyEl.innerHTML = post.content || '';
      return post;
    });
  }

  // Newsletter visual feedback
  document.querySelectorAll('.newsletter').forEach(function (form) {
    var btn = form.querySelector('.newsletter__btn');
    var input = form.querySelector('.newsletter__input');
    if (!btn || !input) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (!input.value || input.value.indexOf('@') < 0) {
        input.focus();
        return;
      }
      var orig = btn.textContent;
      btn.textContent = 'Thanks';
      input.value = '';
      setTimeout(function () { btn.textContent = orig; }, 2200);
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('recentWorks'))  loadRecentWorks();
    if (document.getElementById('recentNews'))   loadRecentNews();
    if (document.getElementById('allWorks'))     loadWorks();
    if (document.getElementById('newsList'))     loadNewsList();
    if (document.getElementById('postBody'))     loadPost();
  });

})();
