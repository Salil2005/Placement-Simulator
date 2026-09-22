const express = require("express");
const {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);
router.get("/me", protect, getMe);

module.exports = router;
