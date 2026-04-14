function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureLightbox() {
  if (document.querySelector("#projectImageLightbox")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div id="projectImageLightbox" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/85 p-4">
        <button
          type="button"
          id="lightboxCloseBtn"
          class="absolute right-4 top-4 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
          aria-label="Close image preview"
        >
          Close
        </button>
        <img id="lightboxImage" src="" alt="Project image preview" class="max-h-[90vh] max-w-[95vw] rounded-lg object-contain" />
      </div>
    `,
  );
}

function openLightbox(imageSrc) {
  const box = document.querySelector("#projectImageLightbox");
  const image = document.querySelector("#lightboxImage");
  if (!box || !image || !imageSrc) return;
  image.src = imageSrc;
  box.classList.remove("hidden");
  box.classList.add("flex");
}

function closeLightbox() {
  const box = document.querySelector("#projectImageLightbox");
  const image = document.querySelector("#lightboxImage");
  if (!box || !image) return;
  box.classList.add("hidden");
  box.classList.remove("flex");
  image.src = "";
}

function renderProjects(items) {
  const grid = document.querySelector("#projectsGrid");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `
      <article class="rounded-xl bg-white p-5 text-sm text-slate-600 shadow">
        No projects added yet. Please check back soon.
      </article>
    `;
    return;
  }

  grid.innerHTML = items
    .map(
      (project) => {
        const imageList = Array.isArray(project.imagePaths) && project.imagePaths.length
          ? project.imagePaths
          : project.imagePath
            ? [project.imagePath]
            : [];
        const coverImage = imageList[0] || "/logo.png";
        const allImagesStrip = imageList
          .slice(1)
          .map(
            (imagePath) => `
              <img
                src="${escapeHtml(imagePath)}"
                data-full-image="${escapeHtml(imagePath)}"
                class="project-image h-16 w-full cursor-zoom-in rounded object-cover"
                alt="${escapeHtml(project.title)} additional view"
              />
            `,
          )
          .join("");

        return `
      <article class="project-card overflow-hidden rounded-xl bg-white shadow">
        <img
          src="${escapeHtml(coverImage)}"
          data-full-image="${escapeHtml(coverImage)}"
          class="project-image h-56 w-full cursor-zoom-in object-cover"
          alt="${escapeHtml(project.title)} in ${escapeHtml(project.location)}"
        />
        <div class="p-4 text-sm">
          <p class="font-semibold text-slate-900">${escapeHtml(project.title)}</p>
          <p class="mt-1 text-slate-700">${escapeHtml(project.location)}</p>
          ${imageList.length > 1 ? `<p class="mt-1 text-xs font-medium text-slate-500">${imageList.length} project images</p>` : ""}
          ${project.description ? `<p class="mt-2 text-slate-600">${escapeHtml(project.description)}</p>` : ""}
          ${
            allImagesStrip
              ? `<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">${allImagesStrip}</div>`
              : ""
          }
        </div>
      </article>
    `;
      },
    )
    .join("");
}

async function loadProjects() {
  try {
    const res = await fetch("/api/projects");
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Unable to load projects");
    renderProjects(Array.isArray(data.projects) ? data.projects : []);
  } catch (_) {
    renderProjects([]);
  }
}

function attachLightboxEvents() {
  const grid = document.querySelector("#projectsGrid");
  const closeBtn = document.querySelector("#lightboxCloseBtn");
  const box = document.querySelector("#projectImageLightbox");
  if (!grid || !closeBtn || !box) return;

  grid.addEventListener("click", (event) => {
    const image = event.target.closest(".project-image");
    if (!image) return;
    openLightbox(image.getAttribute("data-full-image"));
  });

  closeBtn.addEventListener("click", closeLightbox);
  box.addEventListener("click", (event) => {
    if (event.target === box) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  ensureLightbox();
  attachLightboxEvents();
  await loadProjects();
});
