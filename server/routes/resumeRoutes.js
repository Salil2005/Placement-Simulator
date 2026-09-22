const express = require("express");
const { uploadResume, getResume, analyze } = require("../controllers/resumeController");
const { protect } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();
router.use(protect);

router.post("/upload", upload.single("resume"), uploadResume);
router.post("/analyze", analyze);
router.get("/", getResume);

module.exports = router;
