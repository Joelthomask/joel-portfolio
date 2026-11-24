import { requireAuth, env, gh, json, existingDraftBranch } from '../../lib/admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const current = requireAuth(req, res);
  if (!current) return;
  try {
    const { owner, repo, branch: mainBranch } = env();
    const draftBranch = await existingDraftBranch(current.access_token, owner, repo, current);
    const branch = draftBranch || mainBranch;
    async function file(path) {
      const result = await gh(current.access_token, `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
      return JSON.parse(Buffer.from(result.content, 'base64').toString('utf8'));
    }
    const [site, about, contact, toolkit, dir] = await Promise.all([
      file('src/content/site.json'), file('src/content/about.json'), file('src/content/contact.json'), file('src/content/toolkit.json'),
      gh(current.access_token, `/repos/${owner}/${repo}/contents/src/content/projects?ref=${branch}`),
    ]);
    const projects = await Promise.all(dir.filter(item => item.name.endsWith('.json')).map(async item => {
      const project = JSON.parse(Buffer.from((await gh(current.access_token, `/repos/${owner}/${repo}/contents/${item.path}?ref=${branch}`)).content, 'base64').toString('utf8'));
      delete project.slug;
      return { ...project, _fileId: item.name.replace(/\.json$/, '') };
    }));
    const refData = await gh(current.access_token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    const tree = await gh(current.access_token, `/repos/${owner}/${repo}/git/trees/${refData.object.sha}?recursive=1`);
    const mediaPaths = (tree.tree || []).filter(item => item.type === 'blob' && /^public\/(assets|uploads)\/.+\.(png|jpe?g|webp|gif|svg|avif)$/i.test(item.path)).map(item => item.path);
    const contentObjects = [site, about, contact, toolkit, ...projects];
    const media = mediaPaths.map(path => {
      const url = '/' + path.replace(/^public\//, '');
      const usedBy = contentObjects.flatMap((obj, index) => {
        const text = JSON.stringify(obj);
        return text.includes(url) ? [index === 0 ? 'Home' : index === 1 ? 'About' : index === 2 ? 'Contact' : index === 3 ? 'Toolkit' : (projects[index - 4]?.title || 'Project')] : [];
      });
      return { name: path.split('/').pop(), path, url, usedBy };
    });
    return json(res, 200, { site, about, contact, toolkit, projects, media, draftBranch, hasDraft: Boolean(draftBranch), repository: { fullName: `${owner}/${repo}` } });
  } catch (error) {
    console.error('[portfolio-admin:content]', error?.status || 500, error?.message || 'Unknown content error');
    return json(res, 500, { error: error.message || 'Could not load portfolio content.' });
  }
}
