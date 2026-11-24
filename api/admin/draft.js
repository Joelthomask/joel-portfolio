import crypto from 'node:crypto';
import { requireAuth, env, gh, json, draftBranchFor, ensureDraftBranch } from '../../lib/admin.js';

const allowedPath = path => /^(src\/content\/(site|about|contact|toolkit)\.json|src\/content\/projects\/[a-zA-Z0-9-]+\.json|public\/(assets|uploads)\/[a-zA-Z0-9._-]+)$/.test(path);
const imageTypes = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const current = requireAuth(req, res);
  if (!current) return;
  try {
    const { owner, repo, branch: base } = env();
    const { files = {}, deletePaths = [], uploads = [] } = req.body || {};
    if (!files || typeof files !== 'object' || Array.isArray(files) || !Array.isArray(deletePaths) || !Array.isArray(uploads)) throw new Error('Invalid draft payload.');
    const paths = Object.keys(files);
    for (const path of [...paths, ...deletePaths]) if (!allowedPath(path)) throw new Error(`File path not allowed: ${path}`);
    if (!paths.length && !deletePaths.length && !uploads.length) return json(res, 400, { error: 'There are no changes to save.' });

    let uploadBytes = 0;
    const stagedUploads = uploads.map(item => {
      if (!item || typeof item !== 'object' || !imageTypes[item.type] || typeof item.base64 !== 'string') throw new Error('Choose PNG, JPEG, WebP or GIF images.');
      const bytes = Buffer.from(item.base64, 'base64');
      uploadBytes += bytes.length;
      if (!bytes.length || bytes.length > 2.8 * 1024 * 1024) throw new Error('Each image must be 2.8 MB or smaller.');
      const safe = String(item.name || 'image').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-90) || `image.${imageTypes[item.type]}`;
      const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}`;
      const replacePath = typeof item.replacePath === 'string' && /^public\/(assets|uploads)\/[a-zA-Z0-9._-]+$/.test(item.replacePath) ? item.replacePath : null;
      return { path: replacePath || `public/uploads/${filename}`, filename: replacePath ? replacePath.split('/').pop() : filename, bytes, isPortrait: item.isPortrait === true, projectFileId: item.projectImage === true ? String(item.projectFileId || '') : '', imageOrder: Number.isInteger(item.imageOrder) ? item.imageOrder : -1 };
    });
    if (uploadBytes > 2.8 * 1024 * 1024) throw new Error('Combined image uploads must be 2.8 MB or smaller per Save draft.');

    for (const upload of stagedUploads) if (upload.isPortrait && files['src/content/about.json']) files['src/content/about.json'].portrait = '/' + upload.path.replace(/^public\//, '');
    for (const upload of stagedUploads) {
      if (!upload.projectFileId || !/^[a-zA-Z0-9-]+$/.test(upload.projectFileId) || upload.imageOrder < 0) continue;
      const projectPath = `src/content/projects/${upload.projectFileId}.json`;
      const project = files[projectPath];
      if (!project || typeof project !== 'object') continue;
      if (!Array.isArray(project.images)) project.images = project.image ? [project.image] : [];
      project.images[upload.imageOrder] = '/' + upload.path.replace(/^public\//, '');
      project.images = project.images.filter(Boolean);
      project.image = project.images[0] || '';
    }

    const branch = await ensureDraftBranch(current.access_token, owner, repo, base, draftBranchFor(current));
    const ref = await gh(current.access_token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    const parent = await gh(current.access_token, `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`);
    const tree = [];

    const projectPaths = paths.filter(path => path.startsWith('src/content/projects/'));
    const projectIds = projectPaths.map(path => path.slice('src/content/projects/'.length).replace(/\.json$/, ''));
    if (new Set(projectIds).size !== projectIds.length) throw new Error('Duplicate internal project file IDs detected.');
    for (const [path, value] of Object.entries(files)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid JSON content for ${path}.`);
      if (path.startsWith('src/content/projects/')) delete value.slug;
      if (path.startsWith('src/content/projects/')) {
        for (const key of ['liveDemoUrl', 'sourceCodeUrl']) {
          const url = value[key];
          if (url) {
            let parsed;
            try { parsed = new URL(url); } catch { throw new Error(`${key} must be a valid http(s) URL.`); }
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${key} must use http or https.`);
          }
        }
      }
      const blob = await gh(current.access_token, `/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST', body: JSON.stringify({ content: JSON.stringify(value, null, 2) + '\n', encoding: 'utf-8' }),
      });
      tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    for (const upload of stagedUploads) {
      const blob = await gh(current.access_token, `/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST', body: JSON.stringify({ content: upload.bytes.toString('base64'), encoding: 'base64' }),
      });
      tree.push({ path: upload.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (const path of deletePaths) tree.push({ path, mode: '100644', type: 'blob', sha: null });

    const nextTree = await gh(current.access_token, `/repos/${owner}/${repo}/git/trees`, {
      method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree }),
    });
    const commit = await gh(current.access_token, `/repos/${owner}/${repo}/git/commits`, {
      method: 'POST', body: JSON.stringify({ message: 'Save Portfolio Admin draft', tree: nextTree.sha, parents: [ref.object.sha] }),
    });
    await gh(current.access_token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: true }),
    });

    return json(res, 200, {
      saved: true, branch, commit: commit.sha,
      media: stagedUploads.map(item => ({ name: item.filename, url: `/uploads/${item.filename}` })),
      message: 'Draft saved in one commit. You can continue editing before publishing.',
    });
  } catch (error) {
    console.error('[portfolio-admin:draft]', error?.status || 500, error?.message || 'Unknown draft error');
    return json(res, error.status && error.status < 500 ? error.status : 500, { error: error.message || 'Could not save the draft.' });
  }
}
