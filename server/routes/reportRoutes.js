const express = require("express");
const { getReport, downloadReport } = require("../controllers/reportController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.get("/:interviewId", getReport);
router.get("/:interviewId/download", downloadReport);

module.exports = router;
