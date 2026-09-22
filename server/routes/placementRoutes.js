const express = require("express");
const { getEligibility, generate, getPlacement, downloadPlacement } =
  require("../controllers/placementController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.get("/eligibility", getEligibility);
router.post("/generate", generate);
router.get("/download", downloadPlacement);
router.get("/", getPlacement);

module.exports = router;
