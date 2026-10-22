import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Set SITE_URL (and BASE_PATH if the repo is not <user>.github.io) at build time,
// or edit the defaults below.
const site = process.env.SITE_URL || "https://constantdzah.com";
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  site,
  base,
  devToolbar: { enabled: false },
  trailingSlash: "always",
  integrations: [sitemap({ filter: (page) => !page.includes("/admin/") })],
});
