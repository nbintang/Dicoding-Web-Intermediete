const TOKEN_KEY = "story_token";

export const Auth = {

  save(token) {
    if (typeof token !== "string" || token.trim() === "") {
      console.warn("[Auth] Token tidak valid, penyimpanan dibatalkan.");
      return;
    }

    try {
      localStorage.setItem(TOKEN_KEY, token.trim());
      console.info("[Auth] Token disimpan.");
    } catch (error) {
      console.error("[Auth] Gagal menyimpan token:", error);
    }
  },

  get() {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (!stored) return null;
      return stored.trim();
    } catch (error) {
      console.error("[Auth] Gagal mengambil token:", error);
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      console.info("[Auth] Token dihapus.");
    } catch (error) {
      console.error("[Auth] Gagal menghapus token:", error);
    }
  },

  isAuthed() {
    const current = this.get();
    return typeof current === "string" && current.length > 10;
  },
};

export function saveToken(token) {
  Auth.save(token);
}

export function getToken() {
  return Auth.get();
}

export function removeToken() {
  Auth.clear();
}

export function isLoggedIn() {
  return Auth.isAuthed();
}

export function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
