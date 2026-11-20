/* ====================================================
   ADMIN APP — server-verified
   ==================================================== */

let token = sessionStorage.getItem('suzie_token') || null;
let tokenExpires = Number(sessionStorage.getItem('suzie_token_exp') || 0);
let data = null;
let timerInterval = null;

/* ---------- Boot ---------- */
(async function init() {
  if (token && Date.now() < tokenExpires) {
    showPanel();
    await refreshData();
  } else {
    clearSession();
    showLogin();
  }
})();

/* ---------- Auth ---------- */
function clearSession() {
  token = null;
  sessionStorage.removeItem('suzie_token');
  sessionStorage.removeItem('suzie_token_exp');
  if (timerInterval) clearInterval(timerInterval);
}

async function adminLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Checking…';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass })
    });
    const body = await res.json();

    if (!res.ok) {
      if (body.error === 'Server not configured') {
        err.textContent = '⚠️ Server not configured — check environment variables.';
      } else {
        err.textContent = body.error || 'Login failed';
      }
      document.getElementById('loginLock').textContent = '🔓';
      document.getElementById('loginLock').style.animation = 'shake .4s';
      setTimeout(() => { document.getElementById('loginLock').style.animation = ''; }, 500);
      return;
    }

    token = body.token;
    tokenExpires = Date.now() + (body.expiresIn || 7200) * 1000;
    sessionStorage.setItem('suzie_token', token);
    sessionStorage.setItem('suzie_token_exp', tokenExpires);
    document.getElementById('loginPass').value = '';
    showPanel();
    await refreshData();
    toast('Welcome back');
  } catch (e) {
    err.textContent = 'Network error — try again';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Unlock';
  }
}

function adminLogout() {
  clearSession();
  showLogin();
  toast('Logged out');
}

function showLogin() {
  document.getElementById('loginView').style.display = 'block';
  document.getElementById('panelView').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
}

function showPanel() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('panelView').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'inline-flex';
  startSessionTimer();
}

function startSessionTimer() {
  if (timerInterval) clearInterval(timerInterval);
  function tick() {
    const remaining = tokenExpires - Date.now();
    if (remaining <= 0) {
      clearSession();
      showLogin();
      toast('Session expired — please log in again');
      return;
    }
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    document.getElementById('sessionTimer').textContent =
      `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  tick();
  timerInterval = setInterval(tick, 1000);
}

/* ---------- Data ---------- */
async function refreshData() {
  try {
    const res = await fetch('/api/data?t=' + Date.now());
    data = await res.json();
    renderAll();
    toast('Data loaded');
  } catch {
    toast('Failed to load data');
  }
}

async function saveToServer(patch) {
  if (!token) { showLogin(); return false; }
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(patch)
    });
    if (res.status === 401) {
      clearSession();
      showLogin();
      toast('Session expired — log in again');
      return false;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body.error === 'Server not configured') {
        toast('⚠️ Server is not configured. Check env vars on Netlify.');
        return false;
      }
      toast(body.error || 'Save failed');
      return false;
    }
    const body = await res.json();
    document.getElementById('lastSaved').textContent = 'Saved ' + new Date(body.updatedAt).toLocaleTimeString();
    Object.assign(data, patch);
    return true;
  } catch {
    toast('Network error on save');
    return false;
  }
}

/* ---------- Render ---------- */
function renderAll() {
  if (!data) return;
  document.getElementById('nameInput').value = data.restaurantName || '';
  document.getElementById('cPrimary').value = data.theme?.primary || '#d81b60';
  document.getElementById('cBg').value = data.theme?.bg || '#fff5f7';
  document.getElementById('cText').value = data.theme?.text || '#3a1f2b';
  document.getElementById('cAccent').value = data.theme?.accent || '#ffd1dc';
  document.getElementById('patternInput').value = data.theme?.pattern === 'none' ? '' : (data.theme?.pattern || '');
  document.getElementById('customHtml').value = data.customHtml || '';
  renderMenuTable();
  renderGalleryTable();
}

function renderMenuTable() {
  const t = document.getElementById('menuTable');
  t.innerHTML = `<tr><th></th><th>Name</th><th>Price</th><th></th></tr>` +
    data.menu.map(d => `<tr>
      <td>${d.emoji || ''}</td>
      <td>${escapeHtml(d.name)}</td>
      <td>K${Math.round(d.price/100)*100}</td>
      <td><button class="btn danger small" onclick="deleteDish(${d.id})">Delete</button></td>
    </tr>`).join('');
}

function renderGalleryTable() {
  const t = document.getElementById('galleryTable');
  t.innerHTML = `<tr><th>Preview</th><th>Caption</th><th></th></tr>` +
    data.gallery.map(g => `<tr>
      <td><img src="${escapeHtml(g.url)}" style="width:52px;height:52px;object-fit:cover;border-radius:8px"></td>
      <td>${escapeHtml(g.caption || '—')}</td>
      <td><button class="btn danger small" onclick="deletePhoto(${g.id})">Remove</button></td>
    </tr>`).join('');
}

/* ---------- Actions ---------- */
async function saveTheme() {
  const theme = {
    primary: document.getElementById('cPrimary').value,
    bg: document.getElementById('cBg').value,
    text: document.getElementById('cText').value,
    accent: document.getElementById('cAccent').value,
    pattern: document.getElementById('patternInput').value.trim() || 'none'
  };
  if (await saveToServer({ theme })) toast('Theme saved');
}
async function resetTheme() {
  const theme = { primary: '#d81b60', bg: '#fff5f7', text: '#3a1f2b', accent: '#ffd1dc', pattern: 'none' };
  if (await saveToServer({ theme })) { renderAll(); toast('Theme reset'); }
}
async function saveName() {
  const name = document.getElementById('nameInput').value.trim();
  if (!name) { toast('Enter a name'); return; }
  if (await saveToServer({ restaurantName: name })) toast('Name saved');
}
async function addDish() {
  const name = document.getElementById('newName').value.trim();
  const price = parseFloat(document.getElementById('newPrice').value);
  if (!name || isNaN(price)) { toast('Name + price required'); return; }
  const dish = {
    id: Date.now(),
    name,
    price: Math.round(price / 100) * 100,
    desc: document.getElementById('newDesc').value.trim(),
    emoji: document.getElementById('newEmoji').value.trim() || '🍽️',
    image: document.getElementById('newImage').value.trim()
  };
  const menu = [...data.menu, dish];
  if (await saveToServer({ menu })) {
    data.menu = menu;
    renderMenuTable();
    ['newName','newPrice','newDesc','newEmoji','newImage'].forEach(id => document.getElementById(id).value = '');
    toast('Dish added');
  }
}
async function deleteDish(id) {
  const menu = data.menu.filter(d => d.id !== id);
  if (await saveToServer({ menu })) {
    data.menu = menu;
    renderMenuTable();
    toast('Dish deleted');
  }
}
async function addPhoto() {
  const url = document.getElementById('newImgUrl').value.trim();
  const caption = document.getElementById('newImgCaption').value.trim();
  if (!url) { toast('Image URL required'); return; }
  const gallery = [...data.gallery, { id: Date.now(), url, caption }];
  if (await saveToServer({ gallery })) {
    data.gallery = gallery;
    renderGalleryTable();
    document.getElementById('newImgUrl').value = '';
    document.getElementById('newImgCaption').value = '';
    toast('Photo added');
  }
}
async function deletePhoto(id) {
  const gallery = data.gallery.filter(g => g.id !== id);
  if (await saveToServer({ gallery })) {
    data.gallery = gallery;
    renderGalleryTable();
    toast('Photo removed');
  }
}
async function saveHtml() {
  const customHtml = document.getElementById('customHtml').value;
  if (await saveToServer({ customHtml })) toast('HTML saved');
}

/* ---------- Confirm modal ---------- */
function confirmDialog(title, msg, cb) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmOk').onclick = () => { closeConfirm(null, true); cb(); };
  document.getElementById('confirmModal').classList.add('open');
}
function closeConfirm(e, force) {
  if (!force && e && e.target.id !== 'confirmModal') return;
  document.getElementById('confirmModal').classList.remove('open');
}
function confirmReset() {
  confirmDialog('Reset everything?', 'Menu, gallery, theme and custom HTML will reset to defaults.', async () => {
    const reset = {
      menu: [
        { id: 1, name: "Beef Shawarma", desc: "Juicy tender beef", price: 500, emoji: "🌯" },
        { id: 2, name: "Chicken Shawarma", desc: "Juicy chicken", price: 500, emoji: "🌯" },
        { id: 3, name: "Juicy T-Bone Steak", desc: "With chips & sauce", price: 2500, emoji: "🥩" }
      ],
      gallery: [],
      theme: { primary: '#d81b60', bg: '#fff5f7', text: '#3a1f2b', accent: '#ffd1dc', pattern: 'none' },
      customHtml: '',
      restaurantName: "Suzie Cakes And Events"
    };
    if (await saveToServer(reset)) { data = { ...data, ...reset }; renderAll(); toast('Reset complete'); }
  });
}

/* ---------- Util ---------- */
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