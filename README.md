# Joel — Portfolio

React + Vite + TypeScript portfolio with the existing cinematic mountain hero, layered parallax, sunlight treatment, and scroll-driven section animations.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run typecheck
npm run build
npm run preview
```

## Deployment and routing

Vercel rewrites are configured in `vercel.json` so direct visits and refreshes on `/project-lab` return the React app.

Add your production domain and a real social-preview image before enabling canonical and social-image metadata. The Decap Turbo Site ID is configured in `public/admin/config.yml`.

## Content management

This project uses Decap CMS with GitHub-backed content. The admin interface is served from `/admin/`. Content is stored in JSON files under `src/content/`; uploaded media is stored under `public/uploads/`.

Read **[DECAP-CMS-SETUP.md](./DECAP-CMS-SETUP.md)** for the complete GitHub, Vercel and Decap Turbo setup, authentication, draft/preview/publish workflow, and troubleshooting.

The `turbo_site_id` in `public/admin/config.yml` is set to the Site ID supplied from the Decap Turbo dashboard screenshot.

## Image performance

Large scene artwork is delivered as resized WebP files in `public/assets/`. Keep hero images eager/preloaded and below-the-fold images lazy-loaded. For CMS uploads, prefer WebP and keep each image under 1 MB where practical.

## Content files

- `src/content/site.json` — hero and social links
- `src/content/about.json` — About section and portrait
- `src/content/contact.json` — contact section and links
- `src/content/toolkit.json` — technology tiles
- `src/content/projects/*.json` — project entries

## Important

The CMS edits source JSON in GitHub. Publishing merges a pull request into `main`; Vercel then rebuilds the site. No Supabase project, database credentials, or always-on database are required.

## Launch checklist

- Add the production domain, then configure canonical URL, absolute sitemap URLs, and social metadata for that domain.
- Add a real `public/social-preview.webp` and configure `og:image` / `twitter:image` to its absolute production URL if link-preview images are desired.
- The Decap Turbo Site ID is already configured from the supplied dashboard screenshot.
- The large mountain and portrait PNG assets have been resized and converted to WebP. Prefer WebP project uploads, ideally under 1 MB.
- GitHub Actions runs typecheck and production build on pushes and pull requests. Three.js is separated into a dedicated vendor chunk and the shader component is deferred until after the hero's first render. The parallax calculations and mountain CSS are preserved.


## Test on a real phone

1. Connect the computer and phone to the same Wi-Fi network.
2. Start Vite so it listens on the local network:

   ```bash
   npm run dev -- --host 0.0.0.0
   ```

3. On Windows, run `ipconfig` in Command Prompt and find the computer's **IPv4 Address** under the active Wi-Fi adapter.
4. On the phone, open `http://YOUR-PC-IP:5173` (replace the example with the IPv4 address).
5. If Windows Firewall asks, allow Node.js on your private network.

For a quick layout preview on desktop Chrome/Edge, press `F12`, then `Ctrl+Shift+M` to open the device toolbar and choose a phone model. A real phone is still the best test for touch, font rendering and performance.

On mobile/touch devices, the mountain artwork and sun remain static; the pointer-driven parallax and WebGL sunlight shader are skipped to reduce battery and GPU use.
