function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getOwnerKey() {
  const input = document.querySelector("#ownerKey");
  return String(input?.value || "").trim();
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
    holder.innerHTML = `<p class="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">No projects added yet.</p>`;
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
          (img) => `<label class="grid gap-2 rounded-md border border-slate-200 p-2 text-xs text-slate-600">
            <span class="flex items-center gap-2">
              <input type="checkbox" class="keep-image" value="${escapeHtml(img)}" checked />
              <span class="truncate">${escapeHtml(img)}</span>
            </span>
            <img src="${escapeHtml(img)}" alt="Existing project image" class="h-24 w-full rounded object-cover" />
          </label>`,
        )
        .join("");

      return `
        <article class="rounded-xl border border-slate-200 p-4">
          <form class="owner-edit-form grid gap-3" data-project-id="${project.id}">
            <input type="hidden" name="projectId" value="${project.id}" />
            <label class="text-sm font-medium text-slate-700">Project Title</label>
            <input name="title" value="${escapeHtml(project.title || "")}" required class="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <label class="text-sm font-medium text-slate-700">Location</label>
            <input name="location" value="${escapeHtml(project.location || "")}" required class="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <label class="text-sm font-medium text-slate-700">Description</label>
            <textarea name="description" rows="2" class="rounded-md border border-slate-300 px-3 py-2 text-sm">${escapeHtml(project.description || "")}</textarea>
            <label class="text-sm font-medium text-slate-700">Keep Existing Images</label>
            <div class="grid gap-1 rounded-md border border-slate-200 p-2">${imageTags || "<p class='text-xs text-slate-500'>No images</p>"}</div>
            <label class="text-sm font-medium text-slate-700">Add New Images (optional)</label>
            <input name="newImages" type="file" multiple accept="image/*" class="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <div class="flex flex-wrap gap-2">
              <button type="submit" class="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Save Changes</button>
              <button type="button" class="delete-project rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700">Delete</button>
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
  const key = getOwnerKey();
  if (!key) return;
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
    status.textContent = "Owner key is required.";
    status.className = "owner-item-status text-xs text-red-600";
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
    const res = await fetch(`/api/admin/projects/${projectId}`, {
      method: "PUT",
      headers: { "x-owner-key": key },
      body: payload,
    });
    await parseApiResponse(res);
    status.textContent = "Project updated.";
    status.className = "owner-item-status text-xs text-emerald-700";
    await loadOwnerProjects();
  } catch (error) {
    status.textContent = error.message || "Update failed.";
    status.className = "owner-item-status text-xs text-red-600";
  }
}

async function deleteProject(form) {
  const status = form.querySelector(".owner-item-status");
  const key = getOwnerKey();
  if (!key) {
    status.textContent = "Owner key is required.";
    status.className = "owner-item-status text-xs text-red-600";
    return;
  }
  if (!window.confirm("Delete this project permanently?")) return;

  const projectId = form.dataset.projectId;
  try {
    const res = await fetch(`/api/admin/projects/${projectId}`, {
      method: "DELETE",
      headers: { "x-owner-key": key },
    });
    await parseApiResponse(res);
    await loadOwnerProjects();
  } catch (error) {
    status.textContent = error.message || "Delete failed.";
    status.className = "owner-item-status text-xs text-red-600";
  }
}

async function uploadProject(event) {
  event.preventDefault();
  const form = event.target;
  const status = document.querySelector("#ownerStatus");
  const button = form.querySelector("button[type='submit']");
  const key = String(form.ownerKey.value || "").trim();

  if (!key) {
    status.textContent = "Owner key is required.";
    status.className = "text-sm text-red-600";
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

    const res = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "x-owner-key": key },
      body: payload,
    });
    await parseApiResponse(res);

    const keySnapshot = key;
    form.reset();
    form.ownerKey.value = keySnapshot;
    status.textContent = "Project uploaded successfully.";
    status.className = "text-sm text-emerald-700";
    await loadOwnerProjects();
  } catch (error) {
    status.textContent = error.message || "Upload failed.";
    status.className = "text-sm text-red-600";
  } finally {
    button.disabled = false;
    button.textContent = "Upload Project";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#ownerProjectForm");
  if (form) form.addEventListener("submit", uploadProject);
  const ownerKeyInput = document.querySelector("#ownerKey");
  if (ownerKeyInput) {
    ownerKeyInput.addEventListener("change", loadOwnerProjects);
    ownerKeyInput.addEventListener("blur", loadOwnerProjects);
  }
});
