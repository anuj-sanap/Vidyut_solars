(function () {
  const TOKEN_KEY = "vidyutAuthToken";
  const USER_KEY = "vidyutAuthUser";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function authHeaders(extraHeaders) {
    const token = getToken();
    return {
      ...(extraHeaders || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function authFetch(url, options) {
    const headers = authHeaders(options?.headers);
    const res = await fetch(url, { ...(options || {}), headers });
    if (res.status === 401) {
      clearSession();
    }
    return res;
  }

  function redirectToLogin(mode) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    const admin = mode === "admin" ? "&mode=admin" : "";
    window.location.href = `/auth.html?next=${next}${admin}`;
  }

  function requireLogin(options) {
    const user = getUser();
    if (!getToken() || !user) {
      redirectToLogin(options?.role === "admin" ? "admin" : "user");
      return null;
    }
    if (options?.role && user.role !== options.role) {
      redirectToLogin(options.role === "admin" ? "admin" : "user");
      return null;
    }
    return user;
  }

  window.VidyutAuth = {
    getToken,
    getUser,
    setSession,
    clearSession,
    authHeaders,
    authFetch,
    requireLogin,
    redirectToLogin,
  };
})();
