import api from "./api.js";

export const authService = {
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
  login: (payload) => api.post("/auth/login", payload).then((r) => r.data),
  logout: (refreshToken) => api.post("/auth/logout", { refreshToken }).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`).then((r) => r.data),
  resendVerification: (email) => api.post("/auth/resend-verification", { email }).then((r) => r.data),
  updateProfile: (payload) => api.put("/profile", payload).then((r) => r.data),
  changePassword: (payload) => api.put("/profile/password", payload).then((r) => r.data),
};
