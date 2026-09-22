const crypto = require("crypto");
const User = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendVerificationEmail } = require("../utils/email");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../utils/generateToken");
const {
  CLIENT_URL,
  REQUIRE_EMAIL_VERIFICATION,
  EMAIL_VERIFICATION_EXPIRES_MIN,
} = require("../config/env");

const MAX_ACTIVE_REFRESH_TOKENS = 10; // per user, oldest dropped first (simple multi-device support)

/** Issues a fresh access+refresh pair for a user and stores the refresh token's hash. */
async function issueTokenPair(user) {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokenHashes.push(hashToken(refreshToken));
  if (user.refreshTokenHashes.length > MAX_ACTIVE_REFRESH_TOKENS) {
    user.refreshTokenHashes = user.refreshTokenHashes.slice(-MAX_ACTIVE_REFRESH_TOKENS);
  }
  await user.save();

  return { accessToken, refreshToken };
}

/** Creates, stores (hashed), and emails a fresh email-verification link. Best-effort - never throws. */
async function issueVerificationEmail(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRES_MIN * 60 * 1000);
  await user.save();

  const verifyUrl = `${CLIENT_URL}/verify-email/${rawToken}`;
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
  } catch (err) {
    console.error("[auth] failed to send verification email:", err.message);
  }
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const user = await User.create({ name, email, password });
  await issueVerificationEmail(user);

  const { accessToken, refreshToken } = await issueTokenPair(user);
  res.status(201).json({ accessToken, refreshToken, user: user.toSafeJSON() });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password +refreshTokenHashes");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (REQUIRE_EMAIL_VERIFICATION && !user.isEmailVerified) {
    return res.status(403).json({
      error: "Please verify your email before logging in. Check your inbox for the verification link.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  const { accessToken, refreshToken } = await issueTokenPair(user);
  res.json({ accessToken, refreshToken, user: user.toSafeJSON() });
});

/** POST /api/auth/refresh - exchanges a valid refresh token for a new access+refresh pair. */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const user = await User.findById(decoded.id).select("+refreshTokenHashes");
  const incomingHash = hashToken(refreshToken);
  if (!user || !user.refreshTokenHashes.includes(incomingHash)) {
    return res.status(401).json({ error: "Refresh token is no longer valid" });
  }

  // Rotate: invalidate the used refresh token, issue a brand new pair.
  user.refreshTokenHashes = user.refreshTokenHashes.filter((h) => h !== incomingHash);
  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(user);
  res.json({ accessToken, refreshToken: newRefreshToken });
});

/** POST /api/auth/logout - revokes one refresh token (i.e. logs out this device/session). */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.id).select("+refreshTokenHashes");
      if (user) {
        const incomingHash = hashToken(refreshToken);
        user.refreshTokenHashes = user.refreshTokenHashes.filter((h) => h !== incomingHash);
        await user.save();
      }
    } catch {
      // Token already invalid/expired - nothing to revoke, treat logout as successful anyway.
    }
  }
  res.json({ message: "Logged out" });
});

/** GET /api/auth/verify-email/:token */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const tokenHash = hashToken(token);

  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationTokenHash +emailVerificationExpires");

  if (!user) {
    return res.status(400).json({ error: "Verification link is invalid or has expired." });
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();

  res.json({ message: "Email verified successfully.", user: user.toSafeJSON() });
});

/** POST /api/auth/resend-verification */
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const user = await User.findOne({ email });
  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  if (user && !user.isEmailVerified) {
    await issueVerificationEmail(user);
  }
  res.json({ message: "If that account exists and isn't verified yet, a new email has been sent." });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

module.exports = { register, login, refresh, logout, verifyEmail, resendVerification, getMe };
