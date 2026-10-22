import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
  loader: file("src/data/projects.json"),
  schema: z.object({
    category: z.enum(["theatre", "film", "game", "system"]),
    title: z.string(),
    venue: z.string().default(""),
    year: z.string().default(""),
    role: z.string(),
    director: z.string().default(""),
    note: z.string().default(""),
    gallery: z.array(z.string()).default([]),
    tracks: z
      .array(z.object({ title: z.string(), src: z.string(), duration: z.string().optional() }))
      .default([]),
  }),
});

export const collections = { projects };
