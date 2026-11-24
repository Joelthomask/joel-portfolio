import { requireAuth, env, gh, json, draftBranchFor } from '../../lib/admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const current = requireAuth(req, res);
  if (!current) return;
  try {
    const { owner, repo, branch: base } = env();
    const head = draftBranchFor(current);
    try {
      await gh(current.access_token, `/repos/${owner}/${repo}/git/ref/heads/${head}`);
    } catch (error) {
      if (error.status === 404) return json(res, 400, { error: 'There is no saved draft to publish. Save your changes first.' });
      throw error;
    }

    const merged = await gh(current.access_token, `/repos/${owner}/${repo}/merges`, {
      method: 'POST',
      body: JSON.stringify({ base, head, commit_message: 'Publish portfolio content from Portfolio Admin' }),
    });
    // Keep one persistent draft branch, reset to the newly published main commit.
    // The next Save Draft starts from the latest published state instead of creating another branch.
    await gh(current.access_token, `/repos/${owner}/${repo}/git/refs/heads/${head}`, {
      method: 'PATCH', body: JSON.stringify({ sha: merged.sha, force: true }),
    });
    return json(res, 200, { published: true, commit: merged.sha, branch: head, message: 'Your portfolio content has been published. The persistent draft branch is ready for the next edit. Vercel will deploy the updated main branch.' });
  } catch (error) {
    console.error('[portfolio-admin:publish]', error?.status || 500, error?.message || 'Unknown publish error');
    const detail = error.status === 409 || error.status === 422
      ? 'GitHub could not merge this draft. Your draft is safe; check whether main changed or has branch protection, then try again.'
      : (error.message || 'Could not publish the draft.');
    return json(res, error.status && error.status < 500 ? error.status : 500, { error: detail });
  }
}
