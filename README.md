# Joel Thomas — Portfolio

Personal portfolio and Project Lab built with React, TypeScript, Vite, CSS and Three.js. Deployed on Vercel, with a private GitHub-backed Portfolio Studio at `/admin/`.

## Run locally

Requires Node.js 22.x.

```bash
npm install
npm run dev
```

Open `http://localhost:5173` for the website and `http://localhost:5173/admin/` for the local admin preview. Local admin preview uses local JSON files and does not write to GitHub.

## Build and verify

```bash
npm run typecheck
npm run build
npm run preview
```

## Content

- Site content: `src/content/`
- Project entries: `src/content/projects/`
- Public assets: `public/` (refer to them with root paths such as `/uploads/example.webp`)

## Portfolio Studio setup

Configure these Vercel environment variables for the Production environment:

- `GITHUB_CLIENT_ID` — GitHub OAuth App client ID.
- `GITHUB_CLIENT_SECRET` — GitHub OAuth App client secret.
- `GITHUB_OWNER` — GitHub repository owner.
- `GITHUB_REPO` — repository name.
- `GITHUB_BRANCH` — production branch, normally `main`.
- `GITHUB_ADMIN_USERNAME` — the only GitHub username allowed to administer the site.
- `ADMIN_SESSION_SECRET` — random secret of at least 32 characters.

Set the GitHub OAuth App callback URL to `https://YOUR-PRODUCTION-DOMAIN/api/admin/callback`. Keep secrets only in Vercel environment variables; never commit them.

## Draft and publish workflow

1. Edit content in `/admin/`.
2. Click **Save draft** to save all changed content and any staged images together in one Git commit on `admin/draft-USERNAME`.
3. Return later to continue editing the same persistent draft.
4. Click **Publish** when ready. The draft is merged into `main`; Vercel then deploys the production site.

The repository is public, so the draft branch and its content are public on GitHub too. Do not store secrets or private information in portfolio drafts.

### Reduce unnecessary Vercel preview builds

**This script is not automatically enabled by `vercel.json`.** In Vercel, open **Project Settings → Git → Ignored Build Step** and set the command to:

```bash
bash scripts/vercel-ignore-build.sh
```

Then save the setting. Verify it by saving a draft: the `admin/draft-*` deployment should be skipped, while publishing to `main` should still create a Production deployment. If the dashboard field is empty, the script is not active.

This skips builds for `admin/draft-*` branches while continuing to build `main` and other branches. Draft commits remain on GitHub; only publishing to `main` triggers the production build. Vercel may still show a skipped deployment entry for an ignored commit.

## Project structure

- `src/` — React application, components, styles and JSON content.
- `public/` — static assets and admin UI.
- `api/admin/` — serverless OAuth, session, content, draft and publish endpoints.
- `lib/admin.js` — GitHub API and admin session helpers.
- `vercel.json` — SPA route rewrite for direct navigation and refreshes.


## Media library and About portrait

Portfolio Studio lists image assets tracked under `public/assets/` and `public/uploads/`. You can preview, download, copy paths, stage replacements and stage deletions. Deletions and replacements are applied only when you save the draft; publish to make them live. Images referenced by portfolio content are marked with their usage. Update references before deleting an image that is in use. The About section supports selecting an existing media asset or uploading a replacement; it intentionally has no image-editing tools.

The public site's `J.` wordmark opens a small owner menu with Home and Admin login. The admin API remains protected by the GitHub allowlist and server-side session.
