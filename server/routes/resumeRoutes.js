const express = require("express");
const { uploadResume, getResume, analyze, addSkill, removeSkill } = require("../controllers/resumeController");
const { protect } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();
router.use(protect);

router.post("/upload", upload.single("resume"), uploadResume);
router.post("/analyze", analyze);
router.get("/", getResume);
router.patch("/skills", addSkill);
router.delete("/skills", removeSkill);

module.exports = router;


