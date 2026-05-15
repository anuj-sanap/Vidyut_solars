async function loadComponent(selector, path) {
  const target = document.querySelector(selector);
  if (!target) return;

  const res = await fetch(path);
  if (!res.ok) return;
  target.innerHTML = await res.text();
}

function setupMenu() {
  const toggle = document.querySelector("#menuToggle");
  const mobileNav = document.querySelector("#mobileNav");
  if (!toggle || !mobileNav) return;

  toggle.addEventListener("click", () => {
    mobileNav.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (mobileNav.classList.contains("hidden")) return;
    if (mobileNav.contains(event.target) || toggle.contains(event.target)) return;
    mobileNav.classList.add("hidden");
  });
}

function highlightActiveNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  document.querySelectorAll(".nav-link").forEach((el) => {
    if (el.getAttribute("data-nav") === page) {
      el.classList.add("text-emerald-700");
      el.classList.add("font-extrabold");
    }
  });
}

function setYear() {
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
}

function setupAuthNav() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("vidyutAuthUser") || "null");
  } catch (_) {
    user = null;
  }

  const authLinks = [document.querySelector("#authNavLink"), document.querySelector("#mobileAuthNavLink")].filter(Boolean);
  const logoutButtons = [document.querySelector("#logoutBtn"), document.querySelector("#mobileLogoutBtn")].filter(Boolean);
  const ownerProjectLinks = [
    document.querySelector("#ownerProjectsNavLink"),
    document.querySelector("#mobileOwnerProjectsNavLink"),
  ].filter(Boolean);

  ownerProjectLinks.forEach((link) => {
    link.classList.toggle("hidden", user?.role !== "admin");
  });

  authLinks.forEach((link) => {
    if (!user) {
      link.textContent = "Login";
      link.href = "/auth.html";
      link.classList.remove("hidden");
      return;
    }

    link.textContent = user.name || "Account";
    link.href = user.role === "admin" ? "/owner-projects.html" : "/pages/calculator.html";
    link.classList.remove("hidden");
  });

  logoutButtons.forEach((button) => {
    button.classList.toggle("hidden", !user);
    button.addEventListener("click", () => {
      localStorage.removeItem("vidyutAuthToken");
      localStorage.removeItem("vidyutAuthUser");
      window.location.href = "/index.html";
    });
  });
}

async function notifyVisit() {
  try {
    const pathname = window.location.pathname || "/";
    const key = `visit_notified_${pathname}`;
    if (sessionStorage.getItem(key)) return;

    let visitId = localStorage.getItem("visitId");
    if (!visitId) {
      visitId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("visitId", visitId);
    }

    await fetch("/api/notify-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: pathname,
        visitId,
      }),
    });

    sessionStorage.setItem(key, "1");
  } catch (_) {
    // Keep UI silent if notification endpoint is unreachable.
  }
}

async function bootLayout() {
  await loadComponent("#navbar-root", "/components/navbar.html");
  await loadComponent("#footer-root", "/components/footer.html");
  await loadComponent("#whatsapp-root", "/components/whatsapp-float.html");
  setupMenu();
  highlightActiveNav();
  setupAuthNav();
  setYear();
  notifyVisit();
}

document.addEventListener("DOMContentLoaded", bootLayout);
