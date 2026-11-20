import jwt from 'jsonwebtoken';
import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 401 });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401 });
  }
  if (payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
  }

  let incoming;
  try { incoming = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const allowed = ['restaurantName', 'menu', 'gallery', 'theme', 'customHtml'];
  const clean = {};
  for (const k of allowed) {
    if (incoming[k] !== undefined) clean[k] = incoming[k];
  }

  if (clean.menu && !Array.isArray(clean.menu)) {
    return new Response(JSON.stringify({ error: 'menu must be array' }), { status: 400 });
  }
  if (clean.gallery && !Array.isArray(clean.gallery)) {
    return new Response(JSON.stringify({ error: 'gallery must be array' }), { status: 400 });
  }

  try {
    const store = getStore('suzie-cakes');
    const existing = await store.get('data.json', { type: 'json' }) || {};
    const merged = { ...existing, ...clean };
    merged.updatedAt = new Date().toISOString();

    await store.setJSON('data.json', merged);

    return new Response(JSON.stringify({ ok: true, updatedAt: merged.updatedAt }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to save data', details: err.message }), { status: 500 });
  }
};

export const config = {
  path: "/api/save"
};
