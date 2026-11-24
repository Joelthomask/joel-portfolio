import { requireAuth, env, gh, json, draftBranchFor } from '../../lib/admin.js';

// Portfolio Admin only edits these content/media paths. Publishing these files
// as a new commit on top of the current main keeps unrelated application code
// from an older draft branch out of production.
const publishablePath = path => /^(src\/content\/(site|about|contact|toolkit)\.json|src\/content\/projects\/[a-zA-Z0-9-]+\.json|public\/(assets|uploads)\/[a-zA-Z0-9._-]+)$/.test(path);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const current = requireAuth(req, res);
  if (!current) return;

  const { owner, repo, branch: base } = env();
  const head = draftBranchFor(current);
  let publishedCommit = null;

  try {
    const [mainRef, draftRef] = await Promise.all([
      gh(current.access_token, `/repos/${owner}/${repo}/git/ref/heads/${base}`),
      gh(current.access_token, `/repos/${owner}/${repo}/git/ref/heads/${head}`),
    ]);

    const [mainCommit, draftCommit] = await Promise.all([
      gh(current.access_token, `/repos/${owner}/${repo}/git/commits/${mainRef.object.sha}`),
      gh(current.access_token, `/repos/${owner}/${repo}/git/commits/${draftRef.object.sha}`),
    ]);

    const draftTree = await gh(current.access_token, `/repos/${owner}/${repo}/git/trees/${draftCommit.tree.sha}?recursive=1`);
    if (draftTree.truncated) throw new Error('The saved draft contains too many files to publish safely. Your draft has not been changed.');

    const contentEntries = draftTree.tree
      .filter(item => item.type === 'blob' && publishablePath(item.path))
      .map(item => ({ path: item.path, mode: item.mode || '100644', type: 'blob', sha: item.sha }));

    if (!contentEntries.length) {
      return json(res, 400, { error: 'No publishable content files were found in the saved draft. Your draft is safe.' });
    }

    // Build a new tree on the CURRENT main tree, overlaying only files that
    // Portfolio Admin is allowed to manage. This avoids GitHub's merge API,
    // which fails when main was force-pushed and the two histories diverged.
    const nextTree = await gh(current.access_token, `/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: mainCommit.tree.sha, tree: contentEntries }),
    });

    const commit = await gh(current.access_token, `/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'Publish portfolio content from Portfolio Admin',
        tree: nextTree.sha,
        parents: [mainRef.object.sha],
      }),
    });

    // This is a fast-forward update because the new commit's parent is the
    // exact main SHA fetched above. force:false protects concurrent main pushes.
    await gh(current.access_token, `/repos/${owner}/${repo}/git/refs/heads/${base}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
    publishedCommit = commit.sha;

    // Reset the persistent draft branch only AFTER main has been updated.
    // If this cleanup fails, publishing still succeeded and the draft remains safe.
    let draftReset = true;
    try {
      await gh(current.access_token, `/repos/${owner}/${repo}/git/refs/heads/${head}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: true }),
      });
    } catch (resetError) {
      draftReset = false;
      console.error('[portfolio-admin:publish:draft-reset]', resetError?.status || 500, resetError?.message || 'Unknown reset error');
    }

    return json(res, 200, {
      published: true,
      commit: publishedCommit,
      branch: head,
      draftReset,
      message: draftReset
        ? 'Portfolio content published successfully. The persistent draft branch is synchronized with main and ready for the next edit.'
        : 'Portfolio content was published successfully, but the draft branch could not be reset. Your saved draft remains safe; contact the administrator before saving another draft.',
    });
  } catch (error) {
    console.error('[portfolio-admin:publish]', error?.status || 500, error?.message || 'Unknown publish error');
    let detail = error?.message || 'Could not publish the draft.';
    if (error?.status === 409 || error?.status === 422) {
      detail = 'GitHub rejected the update to main. Your saved draft is safe. This can happen if main changed during publishing or branch protection prevents direct updates.';
    } else if (error?.status === 404) {
      detail = 'The main or saved draft branch could not be found. Your saved draft has not been deleted.';
    }
    return json(res, error.status && error.status < 500 ? error.status : 500, {
      error: publishedCommit
        ? `The content commit ${publishedCommit} was created, but a later publishing step failed. Check GitHub main before retrying.`
        : detail,
      published: Boolean(publishedCommit),
      commit: publishedCommit,
    });
  }
}
