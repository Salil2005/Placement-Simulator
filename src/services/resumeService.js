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

  addProject: (data) => api.post("/resume/projects", data).then((r) => r.data),
  updateProject: (index, data) => api.put(`/resume/projects/${index}`, data).then((r) => r.data),
  deleteProject: (index) => api.delete(`/resume/projects/${index}`).then((r) => r.data),

  addExperience: (data) => api.post("/resume/experience", data).then((r) => r.data),
  updateExperience: (index, data) => api.put(`/resume/experience/${index}`, data).then((r) => r.data),
  deleteExperience: (index) => api.delete(`/resume/experience/${index}`).then((r) => r.data),
};

