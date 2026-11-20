const jwt = require('jsonwebtoken');
const store = getStore({
  name: 'suzie-cakes',
  consistency: 'strong',
  siteID: process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_TOKEN
});

const SEED = {
  restaurantName: "Suzie Cakes And Events",
  menu: [
    { id: 1, name: "Beef Shawarma", desc: "Juicy tender beef, fresh veggies, creamy sauce", price: 500, emoji: "🌯" },
    { id: 2, name: "Chicken Shawarma", desc: "Juicy chicken, fresh wrap, cold drink", price: 500, emoji: "🌯" },
    { id: 3, name: "Juicy T-Bone Steak", desc: "Served with golden chips, veggies, creamy sauce, dessert + cold drink", price: 2500, emoji: "🥩" },
    { id: 4, name: "Full English Breakfast", desc: "2 eggs, sausages, bacon, beans, tomato, mushrooms, toast + tea/coffee", price: 1500, emoji: "🍳" },
    { id: 5, name: "Prawn Dish", desc: "Hot & fresh prawns, Eat Good Feel Good", price: 2100, emoji: "🍤" },
    { id: 6, name: "Milkshake", desc: "Oreo, Vanilla or Chocolate — thick, creamy, ice cold", price: 850, emoji: "🥤" },
    { id: 7, name: "Beef Burger", desc: "Yummy burger with all the trimmings", price: 1200, emoji: "🍔" },
    { id: 8, name: "Chocolate Cake Slice", desc: "Rich, moist chocolate cake — fresh daily", price: 700, emoji: "🍰" },
    { id: 9, name: "Fresh Celebration Cake", desc: "Birthdays, weddings, anniversaries — baked to order", price: 8500, emoji: "🎂" }
  ],
  gallery: [
    { id: 1, url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80", caption: "Chocolate celebration cake" },
    { id: 2, url: "https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=800&q=80", caption: "Vanilla birthday cake" },
    { id: 3, url: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80", caption: "Strawberry shortcake" },
    { id: 4, url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80", caption: "Wedding cake" },
    { id: 5, url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80", caption: "Cupcakes & pastries" },
    { id: 6, url: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&q=80", caption: "Sizzling T-Bone" }
  ],
  theme: { primary: "#d81b60", bg: "#fff5f7", text: "#3a1f2b", accent: "#ffd1dc", pattern: "none" },
  customHtml: ""
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const store = getStore({ name: 'suzie-cakes', consistency: 'strong' });
    let data = await store.get('data.json', { type: 'json' });

    if (!data) {
      data = SEED;
      await store.setJSON('data.json', data);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load data', details: err.message })
    };
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = event.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Missing token' }) };
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  if (payload.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized' }) };
  }

  let incoming;
  try { incoming = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const allowed = ['restaurantName', 'menu', 'gallery', 'theme', 'customHtml'];
  const clean = {};
  for (const k of allowed) {
    if (incoming[k] !== undefined) clean[k] = incoming[k];
  }

  // Never trust client-provided updatedAt
  delete clean.updatedAt;

  // --- Validation ---
  if (clean.restaurantName !== undefined && typeof clean.restaurantName !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'restaurantName must be string' }) };
  }
  if (clean.restaurantName && clean.restaurantName.length > 120) {
    return { statusCode: 400, body: JSON.stringify({ error: 'restaurantName too long' }) };
  }

  if (clean.menu !== undefined) {
    if (!Array.isArray(clean.menu)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'menu must be array' }) };
    }
    if (clean.menu.length > 200) {
      return { statusCode: 400, body: JSON.stringify({ error: 'menu too large (max 200 dishes)' }) };
    }
  }

  if (clean.gallery !== undefined) {
    if (!Array.isArray(clean.gallery)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'gallery must be array' }) };
    }
    if (clean.gallery.length > 200) {
      return { statusCode: 400, body: JSON.stringify({ error: 'gallery too large (max 200 photos)' }) };
    }
  }

  if (clean.theme !== undefined && (typeof clean.theme !== 'object' || clean.theme === null || Array.isArray(clean.theme))) {
    return { statusCode: 400, body: JSON.stringify({ error: 'theme must be object' }) };
  }

  if (clean.customHtml !== undefined) {
    if (typeof clean.customHtml !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'customHtml must be string' }) };
    }
    if (clean.customHtml.length > 50000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'customHtml too large (max 50KB)' }) };
    }
  }

  // --- Merge & save ---
  const store = getStore({ name: 'suzie-cakes', consistency: 'strong' });
  const existing = await store.get('data.json', { type: 'json' }) || {};
  const merged = { ...existing, ...clean };
  merged.updatedAt = new Date().toISOString();

  await store.setJSON('data.json', merged);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, updatedAt: merged.updatedAt })
  };
};
