const jwt = require('jsonwebtoken');
const { getStore } = require('@netlify/blobs');

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