import axios from "axios";
import { tokenStore } from "./tokenStore.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:7000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Ensures concurrent 401s only trigger a single /auth/refresh call, and every
// request that was waiting on it retries once that call resolves.
let refreshInFlight = null;

async function refreshAccessToken() {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  // Plain axios (not the `api` instance) so this call never re-enters these
  // same interceptors and can't loop back on itself.
  const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
  tokenStore.setTokens(data);
  return data.accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const status = err.response?.status;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh");

    if (status === 401 && !originalRequest?._retried && !isAuthEndpoint && tokenStore.getRefreshToken()) {
      originalRequest._retried = true;
      try {
        refreshInFlight = refreshInFlight || refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
        const newAccessToken = await refreshInFlight;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        tokenStore.clearTokens();
        // AuthContext listens for this to clear its in-memory user and
        // redirect to /login, without api.js needing to know about routing.
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
      }
    }

    const message = err.response?.data?.error || err.message || "Request failed";
    const wrapped = new Error(message);
    wrapped.code = err.response?.data?.code;
    wrapped.status = err.response?.status;
    return Promise.reject(wrapped);
  }
);

export { API_URL };
export default api;
