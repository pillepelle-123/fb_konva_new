/**
 * Test script for security fixes (Phase 1-3).
 * Requires: Server running (npm run server), DATABASE_URL and JWT_SECRET in .env
 */
require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fetchApi(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return { status: res.status, headers: Object.fromEntries(res.headers), body: await res.json().catch(() => null) };
}

async function getTestUsersAndToken() {
  const users = await pool.query(
    "SELECT id, email FROM public.users WHERE registered = true LIMIT 2"
  );
  if (users.rows.length < 2) {
    throw new Error('Need at least 2 registered users in DB. Run: node server/migrations/create_dummy_users.js');
  }
  const [userA, userB] = users.rows;
  const token = jwt.sign({ id: userA.id, email: userA.email }, process.env.JWT_SECRET);
  return { token, userA, userB };
}

async function getBookOwnedByUser(userId) {
  const r = await pool.query('SELECT id FROM public.books WHERE owner_id = $1 LIMIT 1', [userId]);
  return r.rows[0]?.id;
}

async function getQuestionIdForBook(bookId) {
  const r = await pool.query('SELECT id FROM public.questions WHERE book_id = $1 LIMIT 1', [bookId]);
  return r.rows[0]?.id;
}

async function runTests() {
  const results = [];
  const ok = (name) => { results.push({ name, ok: true }); };
  const fail = (name, msg) => { results.push({ name, ok: false, msg }); };

  try {
    // --- 1. Helmet: Security headers ---
    const healthRes = await fetchApi('/api/health');
    const hasHelmet = healthRes.headers['x-content-type-options'] === 'nosniff' ||
      healthRes.headers['x-frame-options'] || healthRes.headers['x-dns-prefetch-control'];
    if (hasHelmet) ok('Helmet: Security headers present');
    else fail('Helmet', 'Expected X-Content-Type-Options or similar header');

    // --- 2. Questions: No access without book permission ---
    const { token, userA, userB } = await getTestUsersAndToken();
    const bookB = await getBookOwnedByUser(userB.id);
    const bookA = await getBookOwnedByUser(userA.id);
    const bookToTest = bookB || (await pool.query('SELECT id FROM public.books WHERE owner_id != $1 LIMIT 1', [userA.id])).rows[0]?.id;
    if (!bookToTest) {
      fail('Questions access check', 'No book in DB owned by another user - cannot test');
    } else {
      const qRes = await fetchApi(`/api/questions/book/${bookToTest}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (qRes.status === 403) ok('Questions: 403 when accessing another user\'s book');
      else fail('Questions access check', `Expected 403, got ${qRes.status}`);
    }

    // --- 3. Answers: userId from body rejected when target user not in book ---
    const questionId = bookA ? await getQuestionIdForBook(bookA) : (await pool.query('SELECT id FROM public.questions LIMIT 1')).rows[0]?.id;
    if (!questionId) {
      fail('Answers userId check', 'No question in DB - cannot test');
    } else {
      const ansRes = await fetchApi('/api/answers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          questionId: questionId.id || questionId,
          answerText: 'Test',
          userId: userB.id,
        }),
      });
      if (ansRes.status === 403) ok('Answers: 403 when spoofing userId (target user not in book)');
      else fail('Answers userId check', `Expected 403 when spoofing userId, got ${ansRes.status}`);
    }

    // --- 4. Rate limit: verify limiter is active via response headers ---
    const hasRateLimitHeader = healthRes.headers['ratelimit-limit'] || healthRes.headers['x-ratelimit-limit'];
    if (hasRateLimitHeader) ok('Rate limit: Limiter active (header present)');
    else fail('Rate limit', 'Expected RateLimit-Limit header');

  } catch (err) {
    if (err.message?.includes('fetch')) {
      fail('Server', 'Server not reachable. Start with: npm run server');
    } else {
      fail('Setup', err.message);
    }
  } finally {
    await pool.end();
  }

  return results;
}

runTests().then((results) => {
  console.log('\n--- Security Fix Tests ---\n');
  let passed = 0;
  results.forEach(({ name, ok: pass, msg }) => {
    const s = pass ? 'PASS' : 'FAIL';
    console.log(`  [${s}] ${name}${msg ? `: ${msg}` : ''}`);
    if (pass) passed++;
  });
  console.log(`\n${passed}/${results.length} passed\n`);
  process.exit(passed === results.length ? 0 : 1);
});
