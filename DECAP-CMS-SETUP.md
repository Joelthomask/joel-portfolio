# Joel Portfolio — Decap CMS + GitHub setup

This version uses Decap CMS with Decap Turbo's `turbo-github` backend. Portfolio content and uploaded images live in your GitHub repository as JSON files and media files. There is no Supabase database and no always-on database service to pause.

## What stays the same

- The existing React + Vite portfolio design, mountain layers, sunlight effect, parallax and scroll animations are retained.
- The portfolio reads content from JSON files under `src/content/`.
- Decap CMS edits those same files through `/admin`.
- Uploaded images are stored in `public/uploads/` and served from `/uploads/...`.
- Publishing uses Git branches and pull requests. Vercel builds the production site after a pull request is merged.

## 1. Create or choose a GitHub repository

1. Sign in to [GitHub](https://github.com/).
2. Create a repository, for example `joel-portfolio`. A private repository is fine.
3. Extract this project ZIP.
4. Open the extracted project folder in VS Code.
5. Open Terminal → New Terminal and run:

   ```bash
   git init
   git add .
   git commit -m "Add portfolio and Decap CMS"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/joel-portfolio.git
   git push -u origin main
   ```

   Replace `YOUR_GITHUB_USERNAME` and the repository name with your actual values. If the folder is already a Git repository, do not run `git init`; add the remote if needed and push the commit.

## 2. Deploy the portfolio on Vercel

1. Open [Vercel](https://vercel.com/) and sign in with GitHub.
2. Import the repository you just pushed.
3. Keep the detected Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.
5. Note your live domain, such as `https://your-portfolio.vercel.app`.

The `/admin/` page is included under `public/admin/`, so Vite copies it into the production build.

## 3. Create your free Decap Turbo site

The standard Decap GitHub backend needs an OAuth server. This project uses Decap Turbo's hosted GitHub backend instead, so you do not have to build or host an OAuth server.

1. Open [Decap Turbo](https://decapcms.org/turbo/) and create an account.
2. The Free plan includes one site and one seat, with no credit card required.
3. Create an organization if prompted.
4. Open **Git connection** and connect GitHub. Install the Decap Turbo GitHub App on the GitHub account that owns your portfolio repository. Select only your portfolio repository if GitHub offers that choice.
5. Return to Decap Turbo and create a site:
   - Git provider: GitHub
   - Repository: your `username/repository`
   - Branch: `main`
   - Config path: `public/admin/config.yml`
   - Admin interface URL: your exact production admin URL, for example `https://your-portfolio.vercel.app/admin/`
6. Create the site and copy the **Site ID** shown on its Overview page.

## 4. Put the Site ID into the CMS config

Open `public/admin/config.yml` in VS Code. Find:

```yaml
backend:
  name: turbo-github
  branch: main
  turbo_site_id: YOUR_DECAP_TURBO_SITE_ID
```

Replace `YOUR_DECAP_TURBO_SITE_ID` with the exact Site ID copied from Decap Turbo. Keep the indentation. Do not add a GitHub personal access token, Supabase key, or other secret to this file.

Commit and push the change:

```bash
git add public/admin/config.yml
git commit -m "Connect Decap CMS"
git push
```

Vercel will deploy the updated site.

## 5. Open the admin dashboard

Visit:

`https://YOUR-LIVE-DOMAIN/admin/`

Choose **Login with Turbo** and sign in using the account you connected to Decap Turbo. You should see these collections:

- **Home / Hero** — greeting, name, role, intro and social links
- **Projects** — add, edit, delete, feature and reorder projects; upload an optional project image
- **About** — headings, biography and portrait
- **My Toolkit** — technology names, symbols and descriptions
- **Contact** — heading, description, WhatsApp URL, email and location

## 6. Draft, preview and publish

This project enables Decap's `editorial_workflow`.

1. Edit a collection entry and save it as a draft.
2. Decap creates a CMS branch and a GitHub pull request; the production `main` branch is unchanged.
3. Vercel can create a preview deployment for the pull request. Use the preview URL to review the changes.
4. When satisfied, use Decap's **Publish** / approve action to merge the draft pull request.
5. Vercel automatically builds and deploys the merged `main` branch to your live site.

If your Vercel project has GitHub deployment previews disabled, enable Preview Deployments in Vercel's project settings. You can still review the pull request before publishing.

## 7. Local development

Run the site as usual:

```bash
npm install
npm run dev
```

The public portfolio is available at the Vite local URL. The live CMS login is intended to be used on the production URL registered in Decap Turbo. Do not expect the live Turbo authentication callback to accept a different localhost origin unless you add that localhost URL to the site's Admin interface URLs in Decap Turbo.

## 8. Content structure

- `src/content/site.json` — hero and social links
- `src/content/about.json` — About copy and portrait
- `src/content/contact.json` — Contact copy and links
- `src/content/toolkit.json` — toolkit entries
- `src/content/projects/*.json` — one JSON file per project
- `public/uploads/` — uploaded media

The React app imports these JSON files at build time. A CMS publish therefore causes a GitHub commit/merge and a Vercel rebuild. This is intentional: it keeps the portfolio static, fast and independent of a runtime database.

## Troubleshooting

- **CMS says `Unknown site_id`:** copy the Site ID again from the correct Decap Turbo site's Overview page.
- **Turbo cannot see the repository:** check that the Decap Turbo GitHub App is installed on the correct GitHub owner and has access to this repository.
- **CMS reports a config error:** verify the Turbo Site ID, `public/admin/config.yml` config path, and YAML indentation.
- **Changes are in GitHub but not live:** check the Vercel deployment for the merged `main` commit. Draft pull requests do not change production.
- **Images do not appear:** verify that the CMS uploaded them under `public/uploads/` and the saved URL begins with `/uploads/`.

## Cost and inactivity

There is no Supabase database in this setup. The content is stored in GitHub. Decap CMS itself is open source. Decap Turbo's current Free plan includes one site and one seat at €0/month, with no credit card required. Vercel and GitHub have their own plan limits and terms, so check those providers' current plans for your account.
