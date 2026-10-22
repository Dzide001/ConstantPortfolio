import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

// The CMS (public/admin) may save empty fields as null or omit them, so be forgiving.
const str = z.string().nullish().transform((v) => v ?? "");

const projects = defineCollection({
  // projects.json is { "projects": [...] }; array order = tile order on the site.
  loader: file("src/data/projects.json", { parser: (text) => JSON.parse(text).projects.map((p: object, order: number) => ({ ...p, order })) }),
  schema: z.object({
    order: z.number(),
    category: z.enum(["theatre", "film", "game", "system"]),
    title: z.string(),
    venue: str,
    year: str,
    role: z.string(),
    director: str,
    note: str,
    gallery: z.array(z.string()).nullish().transform((v) => v ?? []),
    tracks: z
      .array(z.object({ title: z.string(), src: z.string(), duration: str.optional() }))
      .nullish()
      .transform((v) => v ?? []),
  }),
});

export const collections = { projects };
