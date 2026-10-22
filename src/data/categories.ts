export type CategoryId = "theatre" | "film" | "game" | "system";

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
  description: string;
  heroImage: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "theatre",
    name: "Theatre",
    tagline: "Sound design & engineering for the stage",
    description:
      "Sound design, engineering, and mixing across Yale Repertory Theatre, Yale School of Drama, Long Wharf Theatre, and productions in Accra, Ghana. Plus 7+ additional sound-designer-of-record credits available on résumé/request.",
    heroImage: "images/categories/theatre.svg",
  },
  {
    id: "film",
    name: "Film & Video",
    tagline: "Editing and post work for broadcast and independent video",
    description:
      "Video editing and production work, including broadcast television experience at TV3 (Accra) and independent post work at Motion Revolutions.",
    heroImage: "images/categories/film.svg",
  },
  {
    id: "game",
    name: "Game Audio",
    tagline: "Interactive & game sound design",
    description: "Game audio work in progress — check back soon, or get in touch to talk about a project.",
    heroImage: "images/categories/game.svg",
  },
  {
    id: "system",
    name: "System Design",
    tagline: "Live sound, AV systems, and venue infrastructure",
    description:
      "System design, live mixing, and AV infrastructure work — from house engineering and sanctuary sound system planning to festival and concert live sound.",
    heroImage: "images/categories/system.svg",
  },
];

export const SITE = {
  name: "Constant K. Dzah",
  role: "Sound Designer & Audio Engineer",
  email: "constantk.dzah@gmail.com",
  phone: "+1 (203) 627-3179",
  location: "New Haven, CT",
};

export const EXPERIENCE = [
  { role: "Associate Sound Designer & Engineer", venue: "Long Wharf Theatre", years: "2026–present" },
  { role: "AV Specialist & Lead Audio Engineer", venue: "Church of Pentecost PIWC, New Haven, CT", years: "2024–present" },
  { role: "Overhire Sound Engineer / Audio Technician", venue: "Ogunquit Playhouse", years: "2026" },
  { role: "Overhire Sound Engineer / Audio Technician", venue: "Yale Cabaret", years: "2026" },
  { role: "Production Audio Engineer & Stage Monitor Mix Engineer", venue: "SOMI Live Concert", years: "2026" },
  { role: "Production Audio Engineer / FOH Mix Engineer", venue: "Skeleton Canoe, Yale University Theatre", years: "2026" },
  { role: "Sound Crew / Mix Engineer", venue: "International Festival of Arts & Ideas, New Haven, CT", years: "2024–2026" },
  { role: "Backup A1", venue: "Hedda Gabler, Yale Repertory Theatre", years: "2025" },
  { role: "Assistant Sound Designer & Engineer", venue: "Falcon Girls, Yale Repertory Theatre", years: "2025" },
  { role: "Stage Monitor Mix Engineer", venue: "Macbeth in Stride, University Theatre, Yale", years: "2024" },
  { role: "FOH Mix Engineer", venue: "Cleansed, University Theatre, Yale", years: "2024" },
  { role: "Video Editor", venue: "Motion Revolutions, Accra, Ghana", years: "2022–2023" },
  { role: "Assistant Sound Designer & A2", venue: "Mansa Musa (Musical), National Theatre, Accra, Ghana", years: "2022–2023" },
  { role: "Video Editor & Assistant Producer", venue: "TV3 (APL), Accra, Ghana", years: "2021" },
  { role: "A2", venue: "Something Must Kill a Man, National Theatre, Accra, Ghana", years: "2021" },
  { role: "Live Sound Engineer & DJ", venue: "4th IoD Ghana Corporate Governance Excellence Awards, Accra", years: "2021" },
  { role: "Live Sound Engineer", venue: "Lododo Art Foundation", years: "2021" },
  { role: "Teaching & Technical Assistant", venue: "University of Ghana", years: "2020–2021" },
  { role: "Video Editor Intern", venue: "TV3 (APL), Accra, Ghana", years: "2019" },
];
