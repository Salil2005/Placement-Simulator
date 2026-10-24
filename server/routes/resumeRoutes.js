const express = require("express");
const {
  uploadResume,
  getResume,
  analyze,
  addSkill,
  removeSkill,
  addProject,
  updateProject,
  deleteProject,
  addExperience,
  updateExperience,
  deleteExperience,
} = require("../controllers/resumeController");
const { protect } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();
router.use(protect);

router.post("/upload", upload.single("resume"), uploadResume);
router.post("/analyze", analyze);
router.get("/", getResume);
router.patch("/skills", addSkill);
router.delete("/skills", removeSkill);

// Projects routes
router.post("/projects", addProject);
router.put("/projects/:index", updateProject);
router.delete("/projects/:index", deleteProject);

// Experience routes
router.post("/experience", addExperience);
router.put("/experience/:index", updateExperience);
router.delete("/experience/:index", deleteExperience);

module.exports = router;


