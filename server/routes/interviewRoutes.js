const express = require("express");
const {
  createInterview,
  startInterview,
  respond,
  getInterview,
  listInterviews,
} = require("../controllers/interviewController");
const { finishInterview } = require("../controllers/reportController");
const { protect } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

router.use(protect);

router.get("/", listInterviews);
router.post("/", upload.single("resume"), createInterview);
router.get("/:id", getInterview);
router.post("/:id/start", startInterview);
router.post("/:id/respond", respond);
router.post("/:id/finish", finishInterview);

module.exports = router;
