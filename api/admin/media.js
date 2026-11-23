import { requireAuth, json } from '../../lib/admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;
  return json(res, 410, { error: 'Media is staged in Portfolio Admin and saved together with your content. Use Save draft.' });
}
