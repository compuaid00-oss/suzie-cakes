const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) { record.count = 0; record.resetAt = now + WINDOW_MS; }

  if (record.count >= MAX_ATTEMPTS) {
    const wait = Math.ceil((record.resetAt - now) / 1000);
    return {
      statusCode: 429,
      body: JSON.stringify({ error: `Too many attempts. Try again in ${wait}s.` })
    };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { user, pass } = body;
  const ADMIN_USER = process.env.ADMIN_USERNAME;
  const HASH = process.env.ADMIN_PASSWORD_HASH;
  const SECRET = process.env.JWT_SECRET;

  if (!ADMIN_USER || !HASH || !SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  record.count++;
  attempts.set(ip, record);

  const userOk = user === ADMIN_USER;
  const passOk = await bcrypt.compare(pass || '', HASH);

  if (!userOk || !passOk) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid username or password' })
    };
  }

  const token = jwt.sign({ role: 'admin', user }, SECRET, { expiresIn: '2h' });
  attempts.delete(ip);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, expiresIn: 7200 })
  };
};