import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('client-ip') || 'unknown';
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) { record.count = 0; record.resetAt = now + WINDOW_MS; }

  if (record.count >= MAX_ATTEMPTS) {
    const wait = Math.ceil((record.resetAt - now) / 1000);
    return new Response(JSON.stringify({ error: `Too many attempts. Try again in ${wait}s.` }), { status: 429 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const { user, pass } = body;
  const ADMIN_USER = process.env.ADMIN_USERNAME;
  const HASH = process.env.ADMIN_PASSWORD_HASH;
  const SECRET = process.env.JWT_SECRET;

  if (!ADMIN_USER || !HASH || !SECRET) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
  }

  record.count++;
  attempts.set(ip, record);

  const userOk = user === ADMIN_USER;
  const passOk = await bcrypt.compare(pass || '', HASH);

  if (!userOk || !passOk) {
    return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401 });
  }

  const token = jwt.sign({ role: 'admin', user }, SECRET, { expiresIn: '2h' });
  attempts.delete(ip);

  return new Response(JSON.stringify({ token, expiresIn: 7200 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = {
  path: "/api/login"
};
