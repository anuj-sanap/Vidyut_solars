function nextUrl() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "/pages/calculator.html";
  return next.startsWith("/") ? next : "/pages/calculator.html";
}

function isAdminMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") === "admin" || params.get("next") === "/owner-projects.html";
}

async function parseAuthResponse(res) {
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Authentication failed.");
  }
  return data;
}

function showStatus(el, message, isError) {
  if (!el) return;
  el.textContent = message;
  el.className = `text-sm ${isError ? "text-red-600" : "text-emerald-700"}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const registerPanel = document.querySelector("#registerPanel");
  const loginStatus = document.querySelector("#loginStatus");
  const registerStatus = document.querySelector("#registerStatus");
  const ownerKey = document.querySelector("#ownerKey");
  const ownerKeyWrap = document.querySelector("#ownerKeyWrap");
  const adminMode = isAdminMode();

  if (adminMode) {
    document.title = "Admin Login | Vidyut PowerTech";
    registerPanel?.classList.add("hidden");
    ownerKey?.classList.remove("hidden");
    ownerKeyWrap?.classList.remove("hidden");
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus(loginStatus, "", false);
    const button = loginForm.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Logging in...";

    try {
      const payload = {
        email: loginForm.email.value,
        password: loginForm.password.value,
        ownerKey: loginForm.ownerKey?.value || "",
      };
      const endpoint = adminMode ? "/api/auth/admin/login" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseAuthResponse(res);
      window.VidyutAuth.setSession(data.token, data.user);
      window.location.href = nextUrl();
    } catch (error) {
      showStatus(loginStatus, error.message || "Login failed.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Login";
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus(registerStatus, "", false);
    const button = registerForm.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Creating...";

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerForm.name.value,
          email: registerForm.email.value,
          password: registerForm.password.value,
        }),
      });
      const data = await parseAuthResponse(res);
      window.VidyutAuth.setSession(data.token, data.user);
      window.location.href = nextUrl();
    } catch (error) {
      showStatus(registerStatus, error.message || "Registration failed.", true);
    } finally {
      button.disabled = false;
      button.textContent = "Create Account";
    }
  });
});
