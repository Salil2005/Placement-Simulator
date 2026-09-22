const express = require("express");
const { updateProfile, changePassword } = require("../controllers/profileController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.put("/", updateProfile);
router.put("/password", changePassword);

module.exports = router;
