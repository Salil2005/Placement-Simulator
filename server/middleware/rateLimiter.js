const rateLimit = require("express-rate-limit");
const { RATE_LIMIT_WINDOW_MIN, RATE_LIMIT_MAX, AUTH_RATE_LIMIT_MAX } = require("../config/env");

/** General limiter applied to all /api routes. Generous, just to stop abuse/scraping. */
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

/** Strict limiter for login/register/resend-verification to blunt brute-force/credential-stuffing. */
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a while before trying again." },
});

module.exports = { apiLimiter, authLimiter };
