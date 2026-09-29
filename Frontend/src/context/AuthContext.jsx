import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, tokenStore, AUTH_EXPIRED_EVENT, TOKEN_STORAGE_KEY } from "../utils/api";

const THEME_KEY = "jobtrack-theme";

function readCachedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

// The real theme is stored on the user (database). We also cache the last one locally so the
// loading and login screens already use it, instead of flashing light mode first.
document.documentElement.dataset.theme = readCachedTheme();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // false until we know whether a valid session exists
  const [authError, setAuthError] = useState(""); // set when the server can't be reached at startup
  const userRef = useRef(null);

  const commitUser = useCallback((next) => {
    userRef.current = next;
    setUser(next);
  }, []);

  // Restore the session: if a token is stored, ask the server who it belongs to.
  const loadUser = useCallback(async () => {
    setAuthError("");
    setReady(false);

    if (!tokenStore.get()) {
      commitUser(null);
      setReady(true);
      return;
    }

    try {
      const { user: me } = await api.me();
      commitUser(me);
    } catch (error) {
      if (error.status === 401) {
        tokenStore.clear(); // expired or invalid -> back to the login screen
        commitUser(null);
      } else {
        // Server down / network problem: keep the token, let the user retry.
        setAuthError(error.message);
      }
    } finally {
      setReady(true);
    }
  }, [commitUser]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onExpired = () => {
      tokenStore.clear();
      commitUser(null);
    };
    // Log in / out in another tab -> follow it in this tab.
    const onStorage = (event) => {
      if (event.key !== TOKEN_STORAGE_KEY) return;
      if (event.newValue) loadUser();
      else commitUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener("storage", onStorage);
    };
  }, [commitUser, loadUser]);

  const theme = user?.theme;
  useEffect(() => {
    if (!theme) return; // logged out: keep whatever theme is currently applied
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // role: "jobseeker" | "recruiter". Admin accounts are never created through signup.
  const signup = useCallback(
    async ({ name, email, password, role }) => {
      const { token, user: created } = await api.signup({ name, email, password, role });
      tokenStore.set(token);
      commitUser(created);
      return created;
    },
    [commitUser]
  );

  const login = useCallback(
    async ({ email, password }) => {
      const { token, user: existing } = await api.login({ email, password });
      tokenStore.set(token);
      commitUser(existing);
      return existing;
    },
    [commitUser]
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    commitUser(null);
  }, [commitUser]);

  // Profile updates. Applied instantly, rolled back if the server rejects them.
  const updateProfile = useCallback(
    async (updates) => {
      const previous = userRef.current;
      if (!previous) return { ok: false, error: "You are not logged in." };

      commitUser({ ...previous, ...updates });
      try {
        const { user: saved } = await api.updateMe(updates);
        commitUser(saved);
        return { ok: true, user: saved };
      } catch (error) {
        commitUser(previous);
        return { ok: false, error: error.message };
      }
    },
    [commitUser]
  );

  // Replaces the whole cached user object — used after education/experience edits,
  // which return the full updated user rather than a partial patch.
  const setFullUser = useCallback((next) => commitUser(next), [commitUser]);

  const value = useMemo(
    () => ({ user, ready, authError, retryAuth: loadUser, signup, login, logout, updateProfile, setFullUser }),
    [user, ready, authError, loadUser, signup, login, logout, updateProfile, setFullUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
