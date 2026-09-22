const mongoose = require("mongoose");

const transcriptEventSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["ai", "user"], required: true },
    content: { type: String, required: true },
    questionIndex: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true, unique: true },
    transcript: [transcriptEventSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
