/* One audio element for the whole site. Because the layout uses Astro's ClientRouter
   (view transitions) and the sticky bar is marked transition:persist, this module runs
   once and playback continues while the visitor clicks between pages. */

interface Track { title: string; src: string; duration?: string }

const audio = new Audio();
let queueId = "";
let queue: Track[] = [];
let index = 0;
let title = "";
let subtitle = "";

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

function load(autoplay = true) {
  const t = queue[index];
  if (!t) return;
  audio.src = t.src;
  if (autoplay) audio.play().catch(() => {});
  render();
}
function open(id: string, tracks: Track[], t: string, sub: string, i = 0) {
  queueId = id; queue = tracks; title = t; subtitle = sub; index = i;
  load();
}
function toggle() { if (queue.length) audio.paused ? audio.play().catch(() => {}) : audio.pause(); }
function go(i: number) { if (queue.length) { index = (i + queue.length) % queue.length; load(); } }
function close() { audio.pause(); queue = []; queueId = ""; render(); }

export function render() {
  const bar = $("sticky-player");
  const has = queue.length > 0;
  bar?.classList.toggle("visible", has);
  document.body.classList.toggle("player-active", has);
  const playing = has && !audio.paused;

  if (has) {
    $("deck-title")!.textContent = queue[index]?.title || title;
    $("deck-subtitle")!.textContent = subtitle;
    $("deck-play")!.innerHTML = playing ? "&#10074;&#10074;" : "&#9658;";
    $("deck-play")!.setAttribute("aria-label", playing ? "Pause" : "Play");
    $("deck-disc")!.classList.toggle("spin", playing);
    $("deck-current")!.textContent = fmt(audio.currentTime);
    $("deck-duration")!.textContent = fmt(audio.duration);
    $("deck-scrub-fill")!.style.width = audio.duration ? `${(audio.currentTime / audio.duration) * 100}%` : "0%";
  }

  document.querySelectorAll<HTMLElement>("[data-queue-id]").forEach((el) => {
    const mine = el.dataset.queueId === queueId && has;
    el.querySelectorAll<HTMLElement>("[data-card-play]").forEach((b) => {
      const on = mine && playing;
      b.classList.toggle("is-playing", on);
      b.innerHTML = on ? "&#10074;&#10074;" : "&#9658;";
      b.setAttribute("aria-label", on ? "Pause" : "Play");
    });
    el.querySelectorAll<HTMLElement>("[data-track-index]").forEach((li) => {
      const active = mine && Number(li.dataset.trackIndex) === index;
      li.classList.toggle("active", active);
      li.querySelector(".track-playing-icon")!.innerHTML = active && playing ? "&#9836;" : "";
    });
  });
}

["play", "pause", "timeupdate", "loadedmetadata"].forEach((e) => audio.addEventListener(e, render));
audio.addEventListener("ended", () => (index < queue.length - 1 ? go(index + 1) : render()));

document.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;

  const card = t.closest<HTMLElement>("[data-card-play]");
  const row = t.closest<HTMLElement>("[data-track-index]");
  const q = (card || row)?.closest<HTMLElement>("[data-queue-id]");
  if (q) {
    e.preventDefault();
    const id = q.dataset.queueId!;
    const i = row ? Number(row.dataset.trackIndex) : 0;
    if (id === queueId && queue.length) {
      if (row && i !== index) go(i); else toggle();
    } else {
      open(id, JSON.parse(q.dataset.tracks || "[]"), q.dataset.title || "", q.dataset.subtitle || "", i);
    }
    return;
  }

  if (t.closest("#deck-play")) toggle();
  else if (t.closest("#deck-prev")) go(index - 1);
  else if (t.closest("#deck-next")) go(index + 1);
  else if (t.closest("#deck-close")) close();
  else if (t.closest("#deck-scrub")) {
    const r = $("deck-scrub")!.getBoundingClientRect();
    if (audio.duration) audio.currentTime = ((e as MouseEvent).clientX - r.left) / r.width * audio.duration;
  }

  const car = t.closest<HTMLElement>("[data-scroll]");
  if (car) {
    document.getElementById(car.dataset.scroll!)?.scrollBy({ left: Number(car.dataset.dir) * 300, behavior: "smooth" });
  }

  if (t.closest("#nav-toggle")) document.getElementById("nav-links")?.classList.toggle("open");

  const lb = document.getElementById("lightbox");
  if (lb) {
    const img = t.closest<HTMLImageElement>(".gallery-grid img");
    if (img) {
      lb.querySelector("img")!.src = img.dataset.full || img.src;
      lb.classList.add("open");
    } else if (t.closest("#lightbox")) lb.classList.remove("open");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.getElementById("lightbox")?.classList.remove("open");
});
document.addEventListener("astro:page-load", render);
render();
