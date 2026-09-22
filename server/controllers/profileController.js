const User = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");

const updateProfile = asyncHandler(async (req, res) => {
  const { name, theme, avatarUrl } = req.body;
  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (theme) user.theme = theme;
  if (avatarUrl) user.avatarUrl = avatarUrl;

  await user.save();
  res.json({ user: user.toSafeJSON() });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: "Password updated successfully" });
});

module.exports = { updateProfile, changePassword };
