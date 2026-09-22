const express = require("express");
const { getHistory, getDashboardStats } = require("../controllers/historyController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.get("/history", getHistory);
router.get("/dashboard", getDashboardStats);

module.exports = router;
