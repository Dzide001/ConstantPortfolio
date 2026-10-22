import site from "./site.json";
import about from "./about.json";
import theatre from "./categories/theatre.json";
import film from "./categories/film.json";
import game from "./categories/game.json";
import system from "./categories/system.json";

// The text below is edited in the /admin/ editor (see public/admin/config.yml).
// ids and hero images are fixed because pages and project data refer to them.
export type CategoryId = "theatre" | "film" | "game" | "system";

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
  description: string;
  heroImage: string;
}

export const CATEGORIES: Category[] = [
  { id: "theatre", heroImage: "images/categories/theatre.svg", ...theatre },
  { id: "film", heroImage: "images/categories/film.svg", ...film },
  { id: "game", heroImage: "images/categories/game.svg", ...game },
  { id: "system", heroImage: "images/categories/system.svg", ...system },
];

export const SITE = site;
export const ABOUT = about;
export const EXPERIENCE = about.experience;
