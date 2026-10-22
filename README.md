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
src/data/projects.json   <- every project (edit in /admin/ or by hand)
src/data/*.json          <- page text, contact details, category text (edited in /admin/)
src/images/<cat>/<id>/   <- project photos (Astro resizes them to WebP automatically)
public/audio/<cat>/<id>/ <- audio clips
public/images/about/     <- headshot (replace headshot-placeholder.svg, update src/pages/about.astro)
src/pages/               <- pages; src/components, src/layouts, src/styles
src/scripts/player.ts    <- the audio player
legacy-site/             <- the previous plain-HTML version, kept as a backup
```

## Editing the site visually: /admin/

Open **https://constantdzah.com/admin/** (Sveltia CMS). It can add, edit, delete and **drag to reorder** projects,
change a project's category, and upload photos and audio. The order of the list is the order of the tiles on the site.

**Signing in (once):** click **Sign In Using Access Token** and paste a GitHub fine-grained token limited to this repo
with **Contents: Read and write** (create it at github.com/settings/personal-access-tokens/new). It is stored only in
your browser. Don't use "Sign In with GitHub": that button needs a login server this site doesn't have.

Each save is a commit to `main`, which rebuilds and redeploys the site in a few minutes.
The project's **page address (id)** becomes its URL, so don't change it on existing projects.

**Trying changes before they go live (Chrome/Edge):** run `npm run dev`, open http://localhost:4321/admin/index.html,
click **Work with Local Repository** and pick this folder. Edits then save to your files instead of GitHub.

**Everything is editable in /admin/:** *Portfolio* (projects), *Pages* (landing heading, welcome text and hero photo;
About intro, headshot, education, consoles, languages and the experience timeline), *Category text* (names, taglines,
descriptions) and *Site settings* (email, phone, location and the contact-form address).

Editing by hand still works. The data lives in `src/data/`: `projects.json` (array order = tile order),
`landing.json`, `about.json`, `site.json` and `categories/*.json`. Uploaded photos land in `src/images/uploads/`
(Astro resizes them) and audio in `public/audio/uploads/`. Layout and design changes are code (`src/pages`, `src/styles`).

## Deploying (GitHub Pages)

1. Push this folder to a GitHub repo. In **Settings → Pages**, set **Source** to **GitHub Actions**.
2. `.github/workflows/deploy.yml` builds and publishes on every push to `main`.
3. Set your real address in `astro.config.mjs` (`SITE_URL`, default `https://constantdzah.com`).
   If the repo is not named `<username>.github.io`, also set `BASE_PATH` to `/<repo-name>`
   (the workflow has commented-out `env` lines for both).

Large audio libraries: GitHub is meant for code, so keep clips to a few MB each, or host them elsewhere and
use full `https://` URLs in `src` (the player accepts any URL).
