const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    avatarUrl: { type: String, default: "" },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    stats: {
      totalInterviews: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      bestScore: { type: Number, default: 0 },
    },

    // Email verification (feature is gated behind REQUIRE_EMAIL_VERIFICATION;
    // the fields exist regardless so it can be turned on without a migration).
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationExpires: { type: Date, default: null, select: false },

    // Hashed refresh tokens for the currently-active sessions/devices. Storing
    // a hash (not the raw token) means a database leak can't be replayed as-is.
    refreshTokenHashes: { type: [String], default: [], select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationTokenHash;
  delete obj.emailVerificationExpires;
  delete obj.refreshTokenHashes;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
