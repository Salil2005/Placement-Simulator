import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService } from "../services/authService.js";
import { tokenStore } from "../services/tokenStore.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clearTokens())
      .finally(() => setLoading(false));
  }, []);

  // api.js dispatches this when a refresh attempt fails (refresh token
  // expired/revoked), so the UI drops back to a logged-out state cleanly
  // instead of silently failing every subsequent request.
  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const { accessToken, refreshToken, user } = await authService.login(credentials);
    tokenStore.setTokens({ accessToken, refreshToken });
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const { accessToken, refreshToken, user } = await authService.register(payload);
    tokenStore.setTokens({ accessToken, refreshToken });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    const refreshToken = tokenStore.getRefreshToken();
    // Best-effort: revoke server-side, but don't block clearing local state on it.
    authService.logout(refreshToken).catch(() => {});
    tokenStore.clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await authService.me();
    setUser(user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
