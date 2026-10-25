const rateLimit = require("express-rate-limit");
const { RATE_LIMIT_WINDOW_MIN, RATE_LIMIT_MAX, AUTH_RATE_LIMIT_MAX } = require("../config/env");

const isDevelopment = process.env.NODE_ENV !== "production";

/** General limiter applied to all /api routes. Very generous in development so local testing is never blocked. */
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: isDevelopment ? 50000 : RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});

/** Auth limiter for login/register/resend-verification. */
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: isDevelopment ? 5000 : AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a while before trying again." },
});

module.exports = { apiLimiter, authLimiter };
