import api from "./api.js";

export const placementService = {
  eligibility: () => api.get("/placement/eligibility").then((r) => r.data),
  generate: () => api.post("/placement/generate").then((r) => r.data),
  get: () => api.get("/placement").then((r) => r.data),
  download: () => api.get("/placement/download", { responseType: "blob" }),
};
