import api from "./api.js";

export const resumeService = {
  upload: (file) => {
    const form = new FormData();
    form.append("resume", file);
    return api
      .post("/resume/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
  get: () => api.get("/resume").then((r) => r.data),
  analyze: () => api.post("/resume/analyze").then((r) => r.data),
  addSkill: (field, value) => api.patch("/resume/skills", { field, value }).then((r) => r.data),
  removeSkill: (field, value) => api.delete("/resume/skills", { data: { field, value } }).then((r) => r.data),
};

