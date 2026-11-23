import { clearSession, json } from '../../lib/admin.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  clearSession(res);
  return json(res, 200, { ok: true, message: 'Signed out of Portfolio Admin.' });
}
