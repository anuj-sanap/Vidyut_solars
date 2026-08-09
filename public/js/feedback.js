function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadFeedbackCards() {
  const holder = document.querySelector("#feedbackCards");
  const moreBtn = document.querySelector("#feedbackMoreBtn");
  if (!holder) return;

  try {
    const res = await fetch("/api/feedback");
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Unable to load feedback.");

    const items = Array.isArray(data.feedback) ? data.feedback : [];
    const initialCount = Math.min(3, items.length);

    if (!items.length) {
      holder.innerHTML = `<article class="feedback-card"><div class="feedback-text">No customer feedback yet.</div></article>`;
      if (moreBtn) {
        moreBtn.disabled = true;
        moreBtn.textContent = "More";
      }
      return;
    }

    const visible = items.slice(0, initialCount);
    holder.innerHTML = visible
      .map(
        (item) => `<article class="feedback-card" data-reveal>
          <div class="feedback-quote">“</div>
          <p class="feedback-text">${escapeHtml(item.quote || "")}</p>
          <div class="feedback-author-row">
            <span class="feedback-avatar">👤</span>
            <div>
              <div class="feedback-author">${escapeHtml(item.name || "Customer")}</div>
              <div class="feedback-location">📍 ${escapeHtml(item.location || "Nashik")}</div>
            </div>
            <div class="star-row">★★★★★</div>
          </div>
        </article>`,
      )
      .join("");

    if (moreBtn) {
      moreBtn.disabled = items.length <= 3;
      moreBtn.textContent = items.length > 3 ? "More" : "More";
      moreBtn.dataset.allFeedback = JSON.stringify(items);
      moreBtn.dataset.loaded = "1";
    }
  } catch (error) {
    holder.innerHTML = `<article class="feedback-card"><div class="feedback-text">No customer feedback yet.</div></article>`;
  }
}

function setupFeedbackMoreButton() {
  const moreBtn = document.querySelector("#feedbackMoreBtn");
  const holder = document.querySelector("#feedbackCards");
  if (!moreBtn || !holder) return;

  moreBtn.addEventListener("click", () => {
    const raw = moreBtn.dataset.allFeedback || "[]";
    try {
      const items = JSON.parse(raw);
      if (!Array.isArray(items) || !items.length) return;

      holder.innerHTML = items
        .map(
          (item) => `<article class="feedback-card" data-reveal>
            <div class="feedback-quote">“</div>
            <p class="feedback-text">${escapeHtml(item.quote || "")}</p>
            <div class="feedback-author-row">
              <span class="feedback-avatar">👤</span>
              <div>
                <div class="feedback-author">${escapeHtml(item.name || "Customer")}</div>
                <div class="feedback-location">📍 ${escapeHtml(item.location || "Nashik")}</div>
              </div>
              <div class="star-row">★★★★★</div>
            </div>
          </article>`,
        )
        .join("");

      moreBtn.textContent = "All Feedback";
      moreBtn.disabled = true;
    } catch (_) {
      moreBtn.textContent = "More";
    }
  });
}

function refreshFeedbackFromApi() {
  return loadFeedbackCards();
}

document.addEventListener("DOMContentLoaded", () => {
  setupFeedbackMoreButton();
  loadFeedbackCards();

  window.addEventListener("storage", (event) => {
    if (event.key === "vidyut-feedback-refresh") {
      refreshFeedbackFromApi();
    }
  });
});
