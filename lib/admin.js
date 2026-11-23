import crypto from 'node:crypto';

const COOKIE = 'portfolio_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('ADMIN_SESSION_SECRET must be a random string of at least 32 characters.');
  return crypto.createHash('sha256').update(value).digest();
}

export function cookie(name, value, options = {}) {
  let result = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Secure`;
  if (options.maxAge !== undefined) result += `; Max-Age=${options.maxAge}`;
  return result;
}

export function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secret(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

export function unseal(token) {
  try {
    const bytes = Buffer.from(token, 'base64url');
    if (bytes.length < 29) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', secret(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
  } catch { return null; }
}

export function session(req) {
  const raw = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return raw ? unseal(raw) : null;
}

export function setSession(res, data) {
  res.setHeader('Set-Cookie', cookie(COOKIE, seal(data), { maxAge: SESSION_TTL_SECONDS }));
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', [cookie(COOKIE, '', { maxAge: 0 }), cookie('portfolio_admin_oauth_state', '', { maxAge: 0 })]);
}

export function env() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!owner || !repo) throw new Error('Set GITHUB_OWNER and GITHUB_REPO in Vercel environment variables.');
  return { owner, repo, branch };
}

export async function gh(token, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `GitHub API request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export function draftBranchFor(current) {
  const login = String(current?.user?.login || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!login) throw new Error('Could not determine the authorized GitHub username.');
  return `admin/draft-${login}`;
}

export async function ensureDraftBranch(token, owner, repo, base, branch) {
  if (!/^admin\/draft-[a-z0-9-]+$/.test(branch)) throw new Error('Invalid draft branch.');
  try {
    await gh(token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    return branch;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const baseRef = await gh(token, `/repos/${owner}/${repo}/git/ref/heads/${base}`);
  try {
    await gh(token, `/repos/${owner}/${repo}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseRef.object.sha }) });
  } catch (error) {
    if (error.status !== 422) throw error;
  }
  await gh(token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  return branch;
}

export async function existingDraftBranch(token, owner, repo, current) {
  const branch = draftBranchFor(current);
  try {
    await gh(token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    return branch;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export function requireAuth(req, res) {
  const current = session(req);
  const allowed = (process.env.GITHUB_ADMIN_USERNAME || '').trim().toLowerCase();
  const login = current?.user?.login?.toLowerCase();
  const created = Number(current?.created || 0);
  const expired = !created || Date.now() - created > SESSION_TTL_SECONDS * 1000;
  if (!current?.access_token || !allowed || login !== allowed || expired) {
    clearSession(res);
    res.status(401).json({ error: 'Your admin session is invalid or expired. Sign in again with the authorized GitHub account.' });
    return null;
  }
  return current;
}

export function json(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(data));
}
