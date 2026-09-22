import api from "./api.js";

export const interviewService = {
  list: () => api.get("/interviews").then((r) => r.data),

  create: (payload, resumeFile) => {
    if (resumeFile) {
      const form = new FormData();
      Object.entries(payload).forEach(([k, v]) => form.append(k, v));
      form.append("resume", resumeFile);
      // Let the browser/axios set the Content-Type header itself — it needs
      // to include a `boundary=...` param that only it knows, and manually
      // setting "multipart/form-data" without one breaks multer's parsing
      // on the server (fields arrive empty/garbled).
      return api.post("/interviews", form).then((r) => r.data);
    }
    return api.post("/interviews", payload).then((r) => r.data);
  },

  start: (id) => api.post(`/interviews/${id}/start`).then((r) => r.data),

  respond: (id, payload) => api.post(`/interviews/${id}/respond`, payload).then((r) => r.data),

  get: (id) => api.get(`/interviews/${id}`).then((r) => r.data),

  finish: (id) => api.post(`/interviews/${id}/finish`).then((r) => r.data),

  getReport: (interviewId) => api.get(`/reports/${interviewId}`).then((r) => r.data),

  downloadReport: (interviewId) => api.get(`/reports/${interviewId}/download`, { responseType: "blob" }),

  history: () => api.get("/history").then((r) => r.data),

  dashboard: () => api.get("/dashboard").then((r) => r.data),
};