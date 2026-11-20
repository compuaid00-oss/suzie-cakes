/* ====================================================
   PUBLIC APP — fetches data from server, no admin here
   ==================================================== */

let data = null;
let ratings = JSON.parse(localStorage.getItem('suzie_ratings_v1') || '{}');

async function loadData() {
  try {
    const res = await fetch('/api/data');
    data = await res.json();
    applyThemeToDOM();
    renderName();
    renderMenu();
    renderGallery();
    renderRateList();
    renderCustomHtml();
  } catch (err) {
    console.error(err);
    toast('Could not load menu — check connection');
  }
}

/* THEME */
function applyThemeToDOM() {
  const t = data.theme || {};
  const r = document.documentElement.style;
  if (t.primary) r.setProperty('--primary', t.primary);
  if (t.bg) r.setProperty('--bg', t.bg);
  if (t.text) r.setProperty('--text', t.text);
  if (t.accent) r.setProperty('--accent', t.accent);
  r.setProperty('--pattern', t.pattern || 'none');
  document.body.style.backgroundImage = t.pattern && t.pattern !== 'none' ? t.pattern : 'none';
}

/* NAV */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.main-nav button, .bottom-nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.page === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.main-nav button, .bottom-nav button').forEach(b =>
  b.addEventListener('click', () => showPage(b.dataset.page)));

/* THEME TOGGLE */
function toggleTheme() {
  const cur = document.body.dataset.theme;
  document.body.dataset.theme = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem('suzie_theme', document.body.dataset.theme);
}
(function initTheme() {
  const saved = localStorage.getItem('suzie_theme');
  if (saved) document.body.dataset.theme = saved;
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.body.dataset.theme = 'dark';
})();

/* BRAND */
function renderName() {
  document.getElementById('brandName').textContent = data.restaurantName;
  document.title = data.restaurantName;
}

/* MENU */
function formatKwacha(n) {
  const rounded = Math.round(Number(n) / 100) * 100;
  return 'K' + rounded.toLocaleString('en-ZM');
}
function avgFor(id) {
  const arr = ratings[id] || [];
  if (!arr.length) return null;
  return (arr.reduce((s, r) => s + r.stars, 0) / arr.length).toFixed(1);
}
function renderMenu() {
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = data.menu.map(d => {
    const avg = avgFor(d.id);
    const thumb = d.image
      ? `<div class="thumb" style="background-image:url('${escapeHtml(d.image)}')"></div>`
      : `<div class="thumb">${d.emoji || '🍽️'}</div>`;
    return `<div class="dish">${thumb}<div class="info">
      <h3>${escapeHtml(d.name)} ${avg ? `<span class="avg-badge">★ ${avg}</span>` : ''}</h3>
      <p>${escapeHtml(d.desc || '')}</p>
      <span class="price">${formatKwacha(d.price)}</span>
    </div></div>`;
  }).join('');
}

/* GALLERY */
function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = data.gallery.map(g => `
    <div class="gallery-item" onclick="openLightbox('${escapeHtml(g.url)}', '${escapeHtml(g.caption || '')}')">
      <img src="${escapeHtml(g.url)}" alt="${escapeHtml(g.caption || '')}" loading="lazy">
      ${g.caption ? `<div class="caption">${escapeHtml(g.caption)}</div>` : ''}
    </div>`).join('');
}
function openLightbox(url, caption) {
  document.getElementById('lightboxImg').src = url;
  document.getElementById('lightboxCaption').textContent = caption || '';
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox(e, force) {
  if (!force && e && e.target.id !== 'lightbox') return;
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(null, true); });

/* RATINGS (local-only) */
function renderRateList() {
  const list = document.getElementById('rateList');
  list.innerHTML = data.menu.map(d => {
    const r = ratings[d.id] || [];
    const your = r.length ? r[r.length - 1].stars : 0;
    const avg = avgFor(d.id);
    return `<div class="rate-item"><h3>${d.emoji || ''} ${escapeHtml(d.name)}</h3>
      <div class="stars" data-id="${d.id}">
        ${[1,2,3,4,5].map(n => `<span class="star ${n <= your ? 'on':''}" data-v="${n}">★</span>`).join('')}
        <span class="avg">${avg ? avg + ' ★ avg' : 'No ratings yet'}</span>
      </div></div>`;
  }).join('');
  list.querySelectorAll('.stars').forEach(el => {
    const id = Number(el.dataset.id);
    const stars = [...el.querySelectorAll('.star')];
    stars.forEach((s, i) => {
      s.addEventListener('click', () => {
        if (!ratings[id]) ratings[id] = [];
        ratings[id].push({ stars: i + 1, at: Date.now() });
        localStorage.setItem('suzie_ratings_v1', JSON.stringify(ratings));
        renderRateList(); renderMenu();
        toast(`Rated ${i + 1} star${i ? 's' : ''}`);
      });
    });
  });
}

/* CUSTOM HTML */
function renderCustomHtml() {
  document.getElementById('customBlock').innerHTML = data.customHtml || '';
}

/* UTIL */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

loadData();
setInterval(loadData, 5 * 60 * 1000);