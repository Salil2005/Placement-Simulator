// require("dotenv").config();

// console.log("MONGO_URI =", process.env.MONGO_URI);

// module.exports = {
//   PORT: process.env.PORT || 7000,
//   CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5002",
//   MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/placement-simulator",

//   JWT_SECRET: process.env.JWT_SECRET || "dev_secret_change_me",
//   JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",

//   JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me",
//   JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

//   REQUIRE_EMAIL_VERIFICATION:
//     process.env.REQUIRE_EMAIL_VERIFICATION === "true",
//   EMAIL_VERIFICATION_EXPIRES_MIN: Number(
//     process.env.EMAIL_VERIFICATION_EXPIRES_MIN || 1440
//   ),

//   SMTP_HOST: process.env.SMTP_HOST,
//   SMTP_PORT: Number(process.env.SMTP_PORT || 587),
//   SMTP_SECURE: process.env.SMTP_SECURE === "true",
//   SMTP_USER: process.env.SMTP_USER,
//   SMTP_PASS: process.env.SMTP_PASS,
//   SMTP_FROM:
//     process.env.SMTP_FROM ||
//     "Placement Simulator <no-reply@placement-simulator.local>",

//   RATE_LIMIT_WINDOW_MIN: Number(process.env.RATE_LIMIT_WINDOW_MIN || 15),
//   RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 300),
//   AUTH_RATE_LIMIT_MAX: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),

//   AI_PROVIDER: process.env.AI_PROVIDER || "ollama",

//   OLLAMA_BASE_URL:
//     process.env.OLLAMA_BASE_URL || "http://localhost:11434",
//   OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen3:8b",

//   GROK_API_KEY: process.env.GROK_API_KEY,
//   GROK_BASE_URL:
//     process.env.GROK_BASE_URL || "https://api.x.ai/v1",
//   GROK_MODEL: process.env.GROK_MODEL || "grok-2-latest",

//   GEMINI_API_KEY: process.env.GEMINI_API_KEY,
//   GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-1.5-flash",
// };


require("dotenv").config();

module.exports = {
  // ==========================================================
  // SERVER
  // ==========================================================

  PORT: process.env.PORT || 7000,

  CLIENT_URL:
    process.env.CLIENT_URL || "http://localhost:5002",

  // ==========================================================
  // DATABASE
  // ==========================================================

  MONGO_URI:
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/placement-simulator",

  // ==========================================================
  // JWT
  // ==========================================================

  JWT_SECRET:
    process.env.JWT_SECRET ||
    "dev_secret_change_me",

  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN || "15m",

  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    "dev_refresh_secret_change_me",

  JWT_REFRESH_EXPIRES_IN:
    process.env.JWT_REFRESH_EXPIRES_IN || "30d",

  // ==========================================================
  // EMAIL VERIFICATION
  // ==========================================================

  REQUIRE_EMAIL_VERIFICATION:
    process.env.REQUIRE_EMAIL_VERIFICATION === "true",

  EMAIL_VERIFICATION_EXPIRES_MIN:
    Number(
      process.env.EMAIL_VERIFICATION_EXPIRES_MIN || 1440
    ),

  // ==========================================================
  // SMTP
  // ==========================================================

  SMTP_HOST: process.env.SMTP_HOST,

  SMTP_PORT:
    Number(process.env.SMTP_PORT || 587),

  SMTP_SECURE:
    process.env.SMTP_SECURE === "true",

  SMTP_USER:
    process.env.SMTP_USER,

  SMTP_PASS:
    process.env.SMTP_PASS,

  SMTP_FROM:
    process.env.SMTP_FROM ||
    "Placement Simulator <no-reply@placement-simulator.local>",

  // ==========================================================
  // RATE LIMITING
  // ==========================================================

  RATE_LIMIT_WINDOW_MIN:
    Number(
      process.env.RATE_LIMIT_WINDOW_MIN || 15
    ),

  RATE_LIMIT_MAX:
    Number(
      process.env.RATE_LIMIT_MAX || 300
    ),

  AUTH_RATE_LIMIT_MAX:
    Number(
      process.env.AUTH_RATE_LIMIT_MAX || 20
    ),

  // ==========================================================
  // AI PROVIDER
  // ==========================================================

  AI_PROVIDER:
    process.env.AI_PROVIDER || "groq",

  // ==========================================================
  // OLLAMA
  // ==========================================================

  OLLAMA_BASE_URL:
    process.env.OLLAMA_BASE_URL ||
    "http://localhost:11434",

  OLLAMA_MODEL:
    process.env.OLLAMA_MODEL ||
    "llama3:latest",

  // ==========================================================
  // GROQ
  // ==========================================================

  GROQ_API_KEY:
    process.env.GROQ_API_KEY,

  GROQ_BASE_URL:
    process.env.GROQ_BASE_URL ||
    "https://api.groq.com/openai/v1",

  GROQ_MODEL:
    process.env.GROQ_MODEL ||
    "openai/gpt-oss-20b",

  // ==========================================================
  // GROK / XAI
  // ==========================================================

  GROK_API_KEY:
    process.env.GROK_API_KEY,

  GROK_BASE_URL:
    process.env.GROK_BASE_URL ||
    "https://api.x.ai/v1",

  GROK_MODEL:
    process.env.GROK_MODEL ||
    "grok-2-latest",

  // ==========================================================
  // GEMINI
  // ==========================================================

  GEMINI_API_KEY:
    process.env.GEMINI_API_KEY,

  GEMINI_MODEL:
    process.env.GEMINI_MODEL ||
    "gemini-1.5-flash",
};