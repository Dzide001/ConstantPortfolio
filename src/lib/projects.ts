import { getCollection } from "astro:content";
import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import { CATEGORIES } from "../data/categories";

const strip = (p: string) => p.replace(/^\/+/, "");
export const url = (p = "") => import.meta.env.BASE_URL + strip(p);

export async function allProjects() {
  // Astro returns entries sorted by id; restore the order they have in projects.json.
  return (await getCollection("projects")).map((e) => ({ id: e.id, ...e.data })).sort((a, b) => a.order - b.order);
}
export type Project = Awaited<ReturnType<typeof allProjects>>[number];

export const summaryFor = (p: Project) =>
  `${p.role} for ${p.title}` +
  (p.venue ? ` at ${p.venue}` : "") +
  (p.director ? `, directed by ${p.director}` : "") +
  (p.year ? ` (${p.year}).` : ".");

// Photos live in src/images so Astro can resize them. JSON entries look like
// "images/theatre/<id>/photo.jpg". Anything else (full URLs, files in public/) passes through.
const localImages = import.meta.glob<{ default: ImageMetadata }>(
  "/src/images/**/*.{jpg,jpeg,png,webp,avif,gif}",
);

export interface Photo { src: string; srcFull: string; width?: number; height?: number }

export async function resolvePhotos(p: Project, thumbWidth = 700): Promise<Photo[]> {
  const paths = p.gallery.length ? p.gallery : [CATEGORIES.find((c) => c.id === p.category)!.heroImage];
  return Promise.all(
    paths.map(async (path) => {
      const loader = localImages["/src/" + strip(path)];
      if (!loader) return { src: /^https?:/.test(path) ? path : url(path), srcFull: /^https?:/.test(path) ? path : url(path) };
      const meta = (await loader()).default;
      const thumb = await getImage({ src: meta, width: thumbWidth, format: "webp" });
      const full = await getImage({ src: meta, width: 1800, format: "webp" });
      return { src: thumb.src, srcFull: full.src, width: thumb.attributes.width, height: thumb.attributes.height };
    }),
  );
}

export const trackSrc = (src: string) => (/^https?:/.test(src) ? src : url(src));
