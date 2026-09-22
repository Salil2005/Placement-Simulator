const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
} = require("../config/env");

/** Short-lived access token sent as `Authorization: Bearer <token>` on every request. */
function generateAccessToken(userId) {
  return jwt.sign({ id: userId, type: "access" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/** Long-lived refresh token. Only ever exchanged for a new access token via /auth/refresh. */
function generateRefreshToken(userId) {
  return jwt.sign({ id: userId, type: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

/**
 * Refresh tokens (and email-verification tokens) are stored hashed, never in
 * plaintext, so a database leak alone can't be used to impersonate a user.
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Back-compat alias: existing call sites used `generateToken` for the access token. */
const generateToken = generateAccessToken;

module.exports = {
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
};
