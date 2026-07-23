function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getOwnerKey() {
  return window.VidyutAuth?.getToken?.() || "";
}

async function parseApiResponse(res) {
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status}).`;
    throw new Error(message);
  }

  if (!data || data.success === false) {
    throw new Error(data?.message || "Unexpected server response.");
  }

  return data;
}

function renderOwnerProjects(items) {
  const holder = document.querySelector("#ownerProjectsList");
  if (!holder) return;
  if (!items.length) {
    holder.innerHTML = `<p class="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">No projects added yet.</p>`;
    return;
  }

  holder.innerHTML = items
    .map((project) => {
      const imagePaths = Array.isArray(project.imagePaths)
        ? project.imagePaths
        : project.imagePath
          ? [project.imagePath]
          : [];

      const imageTags = imagePaths
        .map(
          (img) => `<label class="grid gap-2 rounded-md border border-border p-2 text-xs text-muted-foreground">
            <span class="flex items-center gap-2">
              <input type="checkbox" class="keep-image" value="${escapeHtml(img)}" checked />
              <span class="truncate">${escapeHtml(img)}</span>
            </span>
            <img src="${escapeHtml(img)}" alt="Existing project image" class="h-24 w-full rounded object-cover" />
          </label>`,
        )
        .join("");

      return `
        <article class="theme-card">
          <form class="owner-edit-form grid gap-3" data-project-id="${project.id}">
            <input type="hidden" name="projectId" value="${project.id}" />
            <label class="text-sm font-medium text-foreground">Project Title</label>
            <input name="title" value="${escapeHtml(project.title || "")}" required class="input-field" />
            <label class="text-sm font-medium text-foreground">Location</label>
            <input name="location" value="${escapeHtml(project.location || "")}" required class="input-field" />
            <label class="text-sm font-medium text-foreground">Description</label>
            <textarea name="description" rows="2" class="input-field">${escapeHtml(project.description || "")}</textarea>
            <label class="text-sm font-medium text-foreground">Keep Existing Images</label>
            <div class="grid gap-1 rounded-md border border-border p-2">${imageTags || "<p class='text-xs text-muted-foreground'>No images</p>"}</div>
            <label class="text-sm font-medium text-foreground">Add New Images (optional)</label>
            <input name="newImages" type="file" multiple accept="image/*" class="input-field" />
            <div class="flex flex-wrap gap-2">
              <button type="submit" class="btn-primary px-3 py-2 text-xs">Save Changes</button>
              <button type="button" class="delete-project btn-destructive">Delete</button>
            </div>
            <p class="owner-item-status text-xs"></p>
          </form>
        </article>
      `;
    })
    .join("");

  holder.querySelectorAll(".owner-edit-form").forEach((form) => {
    form.addEventListener("submit", updateProject);
    const deleteBtn = form.querySelector(".delete-project");
    if (deleteBtn) deleteBtn.addEventListener("click", () => deleteProject(form));
  });
}

async function loadOwnerProjects() {
  if (!window.VidyutAuth?.requireLogin({ role: "admin" })) return;
  try {
    const res = await fetch("/api/projects");
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Unable to load projects.");
    renderOwnerProjects(Array.isArray(data.projects) ? data.projects : []);
  } catch (_) {
    renderOwnerProjects([]);
  }
}

async function updateProject(event) {
  event.preventDefault();
  const form = event.target;
  const status = form.querySelector(".owner-item-status");
  const key = getOwnerKey();
  if (!key) {
    status.textContent = "Admin login is required.";
    status.className = "owner-item-status text-xs text-destructive";
    window.VidyutAuth?.redirectToLogin("admin");
    return;
  }

  const projectId = form.dataset.projectId;
  const keepImagePaths = Array.from(form.querySelectorAll(".keep-image:checked")).map((el) => el.value);
  const payload = new FormData();
  payload.append("title", form.title.value);
  payload.append("location", form.location.value);
  payload.append("description", form.description.value);
  payload.append("keepImagePaths", JSON.stringify(keepImagePaths));
  Array.from(form.newImages.files || []).forEach((file) => payload.append("projectImages", file));

  try {
    const res = await window.VidyutAuth.authFetch(`/api/admin/projects/${projectId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${key}` },
      body: payload,
    });
    await parseApiResponse(res);
    status.textContent = "Project updated.";
    status.className = "owner-item-status text-xs text-primary";
    await loadOwnerProjects();
  } catch (error) {
    status.textContent = error.message || "Update failed.";
    status.className = "owner-item-status text-xs text-destructive";
  }
}

async function deleteProject(form) {
  const status = form.querySelector(".owner-item-status");
  const key = getOwnerKey();
  if (!key) {
    status.textContent = "Admin login is required.";
    status.className = "owner-item-status text-xs text-destructive";
    window.VidyutAuth?.redirectToLogin("admin");
    return;
  }
  if (!window.confirm("Delete this project permanently?")) return;

  const projectId = form.dataset.projectId;
  try {
    const res = await window.VidyutAuth.authFetch(`/api/admin/projects/${projectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    await parseApiResponse(res);
    await loadOwnerProjects();
  } catch (error) {
    status.textContent = error.message || "Delete failed.";
    status.className = "owner-item-status text-xs text-destructive";
  }
}

async function uploadProject(event) {
  event.preventDefault();
  const form = event.target;
  const status = document.querySelector("#ownerStatus");
  const button = form.querySelector("button[type='submit']");
  const key = getOwnerKey();

  if (!key) {
    status.textContent = "Admin login is required.";
    status.className = "text-sm text-destructive";
    window.VidyutAuth?.redirectToLogin("admin");
    return;
  }

  button.disabled = true;
  button.textContent = "Uploading...";
  status.textContent = "";

  try {
    const payload = new FormData();
    payload.append("title", form.title.value);
    payload.append("location", form.location.value);
    payload.append("description", form.description.value);
    const files = form.projectImages.files || [];
    if (!files.length) throw new Error("Please select at least one image.");
    Array.from(files).forEach((file) => {
      payload.append("projectImages", file);
    });

    const res = await window.VidyutAuth.authFetch("/api/admin/projects", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: payload,
    });
    await parseApiResponse(res);

    form.reset();
    status.textContent = "Project uploaded successfully.";
    status.className = "text-sm text-primary";
    await loadOwnerProjects();
  } catch (error) {
    status.textContent = error.message || "Upload failed.";
    status.className = "text-sm text-destructive";
  } finally {
    button.disabled = false;
    button.textContent = "Upload Project";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.VidyutAuth?.requireLogin({ role: "admin" })) return;
  const form = document.querySelector("#ownerProjectForm");
  if (form) form.addEventListener("submit", uploadProject);
  loadOwnerProjects();
});
