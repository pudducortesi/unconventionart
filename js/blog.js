/* ============================================
   UnconventionArt — Blog / Journal
   Blog listing and post rendering
   ============================================ */

let blogData = [];

async function fetchBlog() {
  const res = await fetch('data/blog.json');
  blogData = await res.json();
  return blogData;
}

// --- Blog Listing Page ---
async function loadBlogList() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  const posts = await fetchBlog();

  posts.forEach((post) => {
    const card = document.createElement('article');
    card.className = 'blog-card reveal';
    card.innerHTML = `
      <a href="post.html?slug=${post.slug}" class="blog-card__image">
        <img src="${post.image}" alt="${post.title}" loading="lazy">
      </a>
      <div class="blog-card__body">
        <div class="blog-card__meta">
          <span class="blog-card__date">${formatDate(post.date)}</span>
          <span class="blog-card__tag">${post.tag}</span>
        </div>
        <h3 class="blog-card__title">
          <a href="post.html?slug=${post.slug}">${post.title}</a>
        </h3>
        <p class="blog-card__excerpt">${post.excerpt}</p>
        <a href="post.html?slug=${post.slug}" class="blog-card__read-more">Read More &rarr;</a>
      </div>
    `;
    grid.appendChild(card);
  });

  // Init reveal on dynamic elements
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
  grid.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

// --- Single Blog Post Page ---
async function loadBlogPost() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) {
    window.location.href = 'blog.html';
    return;
  }

  const posts = await fetchBlog();
  const postIndex = posts.findIndex((p) => p.slug === slug);
  const post = posts[postIndex];

  if (!post) {
    window.location.href = 'blog.html';
    return;
  }

  // Update page title
  document.title = `${post.title} — UnconventionArt Journal`;

  // Fill in header
  document.getElementById('postDate').textContent = formatDate(post.date);
  document.getElementById('postTag').textContent = post.tag;
  document.getElementById('postTitle').textContent = post.title;
  document.getElementById('postSubtitle').textContent = post.subtitle || '';

  // Hero image
  const heroContainer = document.getElementById('postHero');
  if (post.image) {
    heroContainer.innerHTML = `<img src="${post.image}" alt="${post.title}">`;
  }

  // Content
  const contentContainer = document.getElementById('postContent');
  contentContainer.innerHTML = post.content;

  // Prev/Next navigation
  const navContainer = document.getElementById('blogNav');
  let navHtml = '';

  if (postIndex > 0) {
    const prev = posts[postIndex - 1];
    navHtml += `
      <div class="blog-nav__item">
        <p class="blog-nav__label">&larr; Previous</p>
        <a href="post.html?slug=${prev.slug}" class="blog-nav__title">${prev.title}</a>
      </div>
    `;
  } else {
    navHtml += '<div class="blog-nav__item"></div>';
  }

  if (postIndex < posts.length - 1) {
    const next = posts[postIndex + 1];
    navHtml += `
      <div class="blog-nav__item blog-nav__item--next">
        <p class="blog-nav__label">Next &rarr;</p>
        <a href="post.html?slug=${next.slug}" class="blog-nav__title">${next.title}</a>
      </div>
    `;
  }

  navContainer.innerHTML = navHtml;
}

// --- Utility ---
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
