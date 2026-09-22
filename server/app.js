const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { CLIENT_URL } = require("./config/env");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/authRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const reportRoutes = require("./routes/reportRoutes");
const historyRoutes = require("./routes/historyRoutes");
const profileRoutes = require("./routes/profileRoutes");
const placementRoutes = require("./routes/placementRoutes");
const resumeRoutes = require("./routes/resumeRoutes");

const app = express();

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// Resume uploads are intentionally not exposed as public static files. They
// can contain sensitive personal data and are only read by server services.
// Uploads and generated reports can contain personal data. They are served
// only by their authenticated download endpoints, never as public files.

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "placement-simulator-backend" }));

app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api", historyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/placement", placementRoutes);
app.use("/api/resume", resumeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
