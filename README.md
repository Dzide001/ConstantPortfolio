# constantdzah.com — sound design portfolio (Astro)

A static Astro site: home, portfolio hub, one page per category, one real page per project, About,
and a hidden `/admin/` page. A sticky audio bar keeps playing while visitors click between pages.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs dist/
```

## Where things live

```
src/data/projects.json   <- every project (edit by hand or through /admin/)
src/data/categories.ts   <- category text, your contact details, the About-page experience list
src/images/<cat>/<id>/   <- project photos (Astro resizes them to WebP automatically)
public/audio/<cat>/<id>/ <- audio clips
public/images/about/     <- headshot (replace headshot-placeholder.svg, update src/pages/about.astro)
src/pages/               <- pages; src/components, src/layouts, src/styles
src/scripts/player.ts    <- the audio player
legacy-site/             <- the previous plain-HTML version, kept as a backup
```

## Adding content

Add a project to `src/data/projects.json` (unique `id`, `category` of `theatre | film | game | system`).
Put photos in `src/images/<category>/<id>/` and list them as `"images/<category>/<id>/photo.jpg"` in `gallery`.
Put audio in `public/audio/<category>/<id>/` and list `{ "title": "...", "src": "audio/<category>/<id>/cue.mp3" }` in `tracks`.
`note` is the personal write-up shown on the project page and used for link previews.

The `/admin/` page does the same through the GitHub API (it commits the JSON, photos and audio for you).
Create a fine-grained token limited to this repo with **Contents: Read and write**, paste it in the
Setup panel (stored only in your browser). Each save triggers a rebuild and redeploy.

## Deploying (GitHub Pages)

1. Push this folder to a GitHub repo. In **Settings → Pages**, set **Source** to **GitHub Actions**.
2. `.github/workflows/deploy.yml` builds and publishes on every push to `main`.
3. Set your real address in `astro.config.mjs` (`SITE_URL`, default `https://constantdzah.com`).
   If the repo is not named `<username>.github.io`, also set `BASE_PATH` to `/<repo-name>`
   (the workflow has commented-out `env` lines for both).

Large audio libraries: GitHub is meant for code, so keep clips to a few MB each, or host them elsewhere and
use full `https://` URLs in `src` (the player accepts any URL).
