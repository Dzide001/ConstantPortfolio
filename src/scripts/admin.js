/* =========================================================
   ADMIN PANEL — add/edit/delete projects by writing directly
   to your GitHub repo via the GitHub REST API, from the browser.

   No server, no build step. You paste a GitHub token (kept only
   in this browser's localStorage) and this page talks to
   api.github.com directly to:
     - upload photos into src/images/ and audio into public/audio/
     - read + rewrite src/data/projects.json

   See the "Setup" panel on this page for how to create the token.
   ========================================================= */

const CATEGORIES = window.__CATEGORIES || [];
let PROJECTS = window.__PROJECTS || [];
const DATA_PATH = "src/data/projects.json";
let _projectsLoaded = null;

/* Read the freshest list from GitHub when a token is saved, else use the build-time copy. */
async function loadProjects() {
  const { token, owner, repo } = getSettings();
  if (token && owner && repo) {
    const cur = await ghGetFile(DATA_PATH);
    if (cur) PROJECTS = JSON.parse(cur.content);
  }
  return PROJECTS;
}

const SETTINGS_KEY = "portfolioAdminSettings";
let newGalleryFiles = []; // File objects staged for upload on save
let newAudioFiles = []; // { file, title }
let editingId = null; // set when editing an existing project

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function ghHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
  };
}

async function ghGetFile(path) {
  const { token, owner, repo, branch } = getSettings();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch || "main")}`;
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error reading ${path}: ${res.status} ${(await res.json()).message || ""}`);
  const data = await res.json();
  const content = decodeURIComponent(escape(atob(data.content)));
  return { content, sha: data.sha };
}

async function ghPutFile(path, base64Content, message, sha) {
  const { token, owner, repo, branch } = getSettings();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const body = { message, content: base64Content, branch: branch || "main" };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub API error writing ${path}: ${res.status} ${err.message || ""}`);
  }
  return res.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueFilename(originalName) {
  const clean = originalName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return `${Date.now()}-${clean}`;
}

function setStatus(msg, type) {
  const el = document.getElementById("admin-status");
  el.textContent = msg;
  el.className = `admin-status show ${type || "info"}`;
}

function clearStatus() {
  const el = document.getElementById("admin-status");
  el.className = "admin-status";
}

/* ---------- Settings panel ---------- */
function initSettingsPanel() {
  const s = getSettings();
  document.getElementById("set-owner").value = s.owner || "";
  document.getElementById("set-repo").value = s.repo || "";
  document.getElementById("set-branch").value = s.branch || "main";
  document.getElementById("set-token").value = s.token || "";

  document.getElementById("save-settings").addEventListener("click", () => {
    const owner = document.getElementById("set-owner").value.trim();
    const repo = document.getElementById("set-repo").value.trim();
    const branch = document.getElementById("set-branch").value.trim() || "main";
    const token = document.getElementById("set-token").value.trim();
    if (!owner || !repo || !token) {
      setStatus("Owner, repo, and token are all required.", "error");
      return;
    }
    saveSettings({ owner, repo, branch, token });
    setStatus("Settings saved in this browser.", "success");
  });

  document.getElementById("clear-settings").addEventListener("click", () => {
    localStorage.removeItem(SETTINGS_KEY);
    document.getElementById("set-owner").value = "";
    document.getElementById("set-repo").value = "";
    document.getElementById("set-branch").value = "main";
    document.getElementById("set-token").value = "";
    setStatus("Cleared.", "info");
  });
}

/* ---------- Category select ---------- */
function populateCategorySelect() {
  const sel = document.getElementById("f-category");
  sel.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
}

/* ---------- Existing project list ---------- */
async function renderExistingList() {
  const list = document.getElementById("existing-list");
  try {
    await loadProjects();
  } catch (e) {
    list.innerHTML = `<li>Could not load src/data/projects.json (${e.message}). If you haven't deployed yet, this list will populate once the site is live.</li>`;
    return;
  }
  if (!PROJECTS.length) {
    list.innerHTML = `<li>No projects yet — add your first one above.</li>`;
    return;
  }
  list.innerHTML = PROJECTS.map((p) => {
    const cat = CATEGORIES.find((c) => c.id === p.category);
    return `
      <li data-id="${p.id}">
        <div>
          <div class="p-title">${p.title}</div>
          <div class="p-meta">${cat ? cat.name : p.category} &middot; ${p.venue || ""} ${p.year ? "&middot; " + p.year : ""}</div>
        </div>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${p.id}">Edit</button>
          <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${p.id}">Delete</button>
        </div>
      </li>`;
  }).join("");

  list.querySelectorAll('[data-action="edit"]').forEach((btn) =>
    btn.addEventListener("click", () => loadIntoForm(btn.dataset.id))
  );
  list.querySelectorAll('[data-action="delete"]').forEach((btn) =>
    btn.addEventListener("click", () => deleteProject(btn.dataset.id))
  );
}

/* ---------- Form <-> project object ---------- */
function resetForm() {
  editingId = null;
  newGalleryFiles = [];
  newAudioFiles = [];
  document.getElementById("project-form").reset();
  document.getElementById("form-heading").textContent = "Add a project";
  document.getElementById("existing-gallery").innerHTML = "";
  document.getElementById("existing-tracks").innerHTML = "";
  document.getElementById("new-gallery-preview").innerHTML = "";
  document.getElementById("new-audio-preview").innerHTML = "";
  document.getElementById("cancel-edit").style.display = "none";
}

async function loadIntoForm(id) {
  await loadProjects();
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return;
  editingId = id;
  newGalleryFiles = [];
  newAudioFiles = [];
  document.getElementById("form-heading").textContent = `Editing: ${p.title}`;
  document.getElementById("f-title").value = p.title || "";
  document.getElementById("f-category").value = p.category || "theatre";
  document.getElementById("f-venue").value = p.venue || "";
  document.getElementById("f-year").value = p.year || "";
  document.getElementById("f-role").value = p.role || "";
  document.getElementById("f-director").value = p.director || "";
  document.getElementById("f-note").value = p.note || "";
  document.getElementById("cancel-edit").style.display = "inline-flex";

  const galleryEl = document.getElementById("existing-gallery");
  galleryEl.innerHTML = (p.gallery || [])
    .map(
      (src, i) => `
    <li data-src="${src}">
      <span style="flex:1;font-size:0.8rem;color:var(--text-faint);">${src.split("/").pop()}</span>
      <button type="button" class="chip-remove" data-remove-gallery="${i}">&times;</button>
    </li>`
    )
    .join("");
  galleryEl.querySelectorAll("[data-remove-gallery]").forEach((btn) =>
    btn.addEventListener("click", () => btn.closest("li").remove())
  );

  const tracksEl = document.getElementById("existing-tracks");
  tracksEl.innerHTML = (p.tracks || [])
    .map(
      (t, i) => `
    <li data-src="${t.src}">
      <input type="text" value="${t.title}" data-track-title="${i}">
      <button type="button" class="chip-remove" data-remove-track="${i}">&times;</button>
    </li>`
    )
    .join("");
  tracksEl.querySelectorAll("[data-remove-track]").forEach((btn) =>
    btn.addEventListener("click", () => btn.closest("li").remove())
  );

  document.getElementById("new-gallery-preview").innerHTML = "";
  document.getElementById("new-audio-preview").innerHTML = "";
  window.scrollTo({ top: document.getElementById("project-form").offsetTop - 20, behavior: "smooth" });
}

function renderNewGalleryPreview() {
  const el = document.getElementById("new-gallery-preview");
  el.innerHTML = newGalleryFiles
    .map(
      (f, i) => `
    <li>
      <span style="flex:1;font-size:0.85rem;">${f.name}</span>
      <button type="button" class="chip-remove" data-remove-new-gallery="${i}">&times;</button>
    </li>`
    )
    .join("");
  el.querySelectorAll("[data-remove-new-gallery]").forEach((btn) =>
    btn.addEventListener("click", () => {
      newGalleryFiles.splice(parseInt(btn.dataset.removeNewGallery, 10), 1);
      renderNewGalleryPreview();
    })
  );
}

function renderNewAudioPreview() {
  const el = document.getElementById("new-audio-preview");
  el.innerHTML = newAudioFiles
    .map(
      (t, i) => `
    <li>
      <input type="text" value="${t.title}" data-new-track-title="${i}">
      <button type="button" class="chip-remove" data-remove-new-audio="${i}">&times;</button>
    </li>`
    )
    .join("");
  el.querySelectorAll("[data-new-track-title]").forEach((inp) =>
    inp.addEventListener("input", () => {
      newAudioFiles[parseInt(inp.dataset.newTrackTitle, 10)].title = inp.value;
    })
  );
  el.querySelectorAll("[data-remove-new-audio]").forEach((btn) =>
    btn.addEventListener("click", () => {
      newAudioFiles.splice(parseInt(btn.dataset.removeNewAudio, 10), 1);
      renderNewAudioPreview();
    })
  );
}

function cleanTitleFromFilename(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
}

/* ---------- Save (create or update) ---------- */
async function saveProject(e) {
  e.preventDefault();
  const { token, owner, repo } = getSettings();
  if (!token || !owner || !repo) {
    setStatus("Add your GitHub owner, repo, and token in Setup above first.", "error");
    return;
  }

  const title = document.getElementById("f-title").value.trim();
  const category = document.getElementById("f-category").value;
  if (!title || !category) {
    setStatus("Title and category are required.", "error");
    return;
  }

  const id = editingId || slugify(title);
  const saveBtn = document.getElementById("save-project");
  saveBtn.disabled = true;
  setStatus("Saving… this can take a moment if you're uploading photos or audio.", "info");

  try {
    // 1. Collect surviving existing gallery/track entries (minus any removed in the UI)
    const gallery = Array.from(document.querySelectorAll("#existing-gallery li")).map((li) => li.dataset.src);
    const tracks = Array.from(document.querySelectorAll("#existing-tracks li")).map((li, i) => ({
      src: li.dataset.src,
      title: li.querySelector("input").value || "Untitled",
    }));

    // 2. Upload new gallery photos
    for (const file of newGalleryFiles) {
      const path = `images/${category}/${id}/${uniqueFilename(file.name)}`;
      const b64 = await fileToBase64(file);
      await ghPutFile(`src/${path}`, b64, `Add photo for ${title}`);
      gallery.push(path);
    }

    // 3. Upload new audio tracks
    for (const t of newAudioFiles) {
      const path = `audio/${category}/${id}/${uniqueFilename(t.file.name)}`;
      const b64 = await fileToBase64(t.file);
      await ghPutFile(`public/${path}`, b64, `Add audio for ${title}`);
      tracks.push({ src: path, title: t.title || cleanTitleFromFilename(t.file.name) });
    }

    // 4. Build project object
    const project = {
      id,
      category,
      title,
      venue: document.getElementById("f-venue").value.trim(),
      year: document.getElementById("f-year").value.trim(),
      role: document.getElementById("f-role").value.trim(),
      director: document.getElementById("f-director").value.trim(),
      note: document.getElementById("f-note").value.trim(),
      gallery,
      tracks,
    };

    // 5. Fetch the freshest projects.json + sha, then upsert
    const current = await ghGetFile(DATA_PATH);
    const list = current ? JSON.parse(current.content) : [];
    const idx = list.findIndex((p) => p.id === id);
    if (idx >= 0) list[idx] = project;
    else list.push(project);

    await ghPutFile(
      DATA_PATH,
      utf8ToBase64(JSON.stringify(list, null, 2)),
      editingId ? `Update project: ${title}` : `Add project: ${title}`,
      current ? current.sha : undefined
    );

    setStatus(`Saved "${title}". It should appear on your live site within a minute or two (GitHub Actions rebuilds and redeploys the site automatically).`, "success");
    resetForm();
    _projectsLoaded = null; // force re-fetch
    renderExistingList();
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    saveBtn.disabled = false;
  }
}

async function deleteProject(id) {
  const { token, owner, repo } = getSettings();
  if (!token || !owner || !repo) {
    setStatus("Add your GitHub owner, repo, and token in Setup above first.", "error");
    return;
  }
  if (!confirm(`Delete "${id}"? This removes it from the site. Any uploaded photos/audio stay in the repo (unused, but harmless) unless you delete them manually.`)) return;

  setStatus("Deleting…", "info");
  try {
    const current = await ghGetFile(DATA_PATH);
    const list = current ? JSON.parse(current.content) : [];
    const next = list.filter((p) => p.id !== id);
    await ghPutFile(
      DATA_PATH,
      utf8ToBase64(JSON.stringify(next, null, 2)),
      `Delete project: ${id}`,
      current.sha
    );
    setStatus("Deleted.", "success");
    _projectsLoaded = null;
    renderExistingList();
  } catch (err) {
    setStatus(err.message, "error");
  }
}

(() => {
  initSettingsPanel();
  populateCategorySelect();
  renderExistingList();

  document.getElementById("f-gallery").addEventListener("change", (e) => {
    newGalleryFiles.push(...Array.from(e.target.files));
    renderNewGalleryPreview();
    e.target.value = "";
  });

  document.getElementById("f-audio").addEventListener("change", (e) => {
    Array.from(e.target.files).forEach((file) =>
      newAudioFiles.push({ file, title: cleanTitleFromFilename(file.name) })
    );
    renderNewAudioPreview();
    e.target.value = "";
  });

  document.getElementById("project-form").addEventListener("submit", saveProject);
  document.getElementById("cancel-edit").addEventListener("click", resetForm);
})();
