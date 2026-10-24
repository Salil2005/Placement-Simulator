/**
 * dualApiClient.js
 *
 * Fires two AI API calls simultaneously using two separate API keys
 * (KEY_1 and KEY_2). Each call receives its own portion of the resume text
 * so the work is genuinely split, not duplicated.
 *
 * The module is intentionally provider-agnostic — any OpenAI-compatible
 * REST endpoint works.  Currently wired to two Groq keys by default, but
 * you can swap to Gemini or any other provider by setting DUAL_API_PROVIDER.
 *
 * Usage (anywhere in the server):
 *
 *   const { dualComplete, mergeResumeResults } = require("../ai/dualApiClient");
 *
 *   const [raw1, raw2] = await dualComplete(prompt1, prompt2);
 *   const merged       = mergeResumeResults(raw1, raw2);
 */

const {
  GROQ_API_KEY,
  GROQ_API_KEY_2,
  GROQ_BASE_URL,
  GROQ_MODEL,
  GEMINI_API_KEY,
  GEMINI_API_KEY_2,
  GEMINI_MODEL,
  DUAL_API_PROVIDER,
} = require("../../config/env");

// ─────────────────────────────────────────────────────────────────────────────
// JSON helpers
// ─────────────────────────────────────────────────────────────────────────────

function stripJsonFences(text) {
  if (typeof text !== "string") return "";
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function safeParseJSON(text, fallback) {
  try {
    return JSON.parse(stripJsonFences(text));
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider implementations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single Groq chat completion using the supplied API key.
 * @param {string} apiKey
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function groqComplete(apiKey, prompt) {
  if (!apiKey) throw new Error("Groq API key is missing.");

  const baseUrl = GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  const model   = GROQ_MODEL   || "llama3-8b-8192";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization : `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages   : [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens : 4096,
    }),
  });

  const body = await res.text();

  if (!res.ok) {
    throw new Error(`Groq [${res.status}]: ${body.slice(0, 300)}`);
  }

  const data    = JSON.parse(body);
  const content = data?.choices?.[0]?.message?.content;

  if (!content) throw new Error("Groq returned an empty response.");

  return content;
}

/**
 * Single Gemini chat completion using the supplied API key.
 * @param {string} apiKey
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function geminiComplete(apiKey, prompt) {
  if (!apiKey) throw new Error("Gemini API key is missing.");

  const model = GEMINI_MODEL || "gemini-1.5-flash";
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({
      contents        : [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini [${res.status}]: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? ""
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider registry
// ─────────────────────────────────────────────────────────────────────────────

const DUAL_PROVIDERS = {
  groq  : { key1: () => GROQ_API_KEY,   key2: () => GROQ_API_KEY_2,   fn: groqComplete   },
  gemini: { key1: () => GEMINI_API_KEY, key2: () => GEMINI_API_KEY_2, fn: geminiComplete },
};

function resolveProvider() {
  const name     = (DUAL_API_PROVIDER || "groq").toLowerCase();
  const provider = DUAL_PROVIDERS[name];

  if (!provider) {
    throw new Error(
      `Unknown DUAL_API_PROVIDER "${name}". Valid options: groq | gemini.`
    );
  }

  const key1 = provider.key1();
  const key2 = provider.key2();

  if (!key1 || !key2) {
    const prefix = name.toUpperCase();
    throw new Error(
      `Both ${prefix}_API_KEY and ${prefix}_API_KEY_2 must be set in .env ` +
      `to use the dual-API resume parser.`
    );
  }

  return { key1, key2, fn: provider.fn };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send two prompts in parallel — one per API key.
 *
 * If one key fails the other result is still returned; the failed call
 * resolves to "{}" so the merge step gracefully handles the partial data.
 *
 * @param {string} prompt1  Prompt sent to KEY_1
 * @param {string} prompt2  Prompt sent to KEY_2
 * @returns {Promise<[string, string]>}  Raw text from both keys
 */
async function dualComplete(prompt1, prompt2) {
  const { key1, key2, fn } = resolveProvider();

  const [res1, res2] = await Promise.allSettled([
    fn(key1, prompt1),
    fn(key2, prompt2),
  ]);

  const text1 =
    res1.status === "fulfilled"
      ? res1.value
      : (() => {
          console.error("[dualApiClient] KEY_1 failed:", res1.reason?.message);
          return "{}";
        })();

  const text2 =
    res2.status === "fulfilled"
      ? res2.value
      : (() => {
          console.error("[dualApiClient] KEY_2 failed:", res2.reason?.message);
          return "{}";
        })();

  return [text1, text2];
}

/**
 * Parse and deep-merge two raw JSON strings from parallel resume-parse calls.
 *
 * - Flat string arrays (skills, languages, …) → concatenated + case-insensitive dedup
 * - Object arrays (projects, experience)      → concatenated + fuzzy-key dedup
 *
 * @param {string} raw1  Raw text from KEY_1
 * @param {string} raw2  Raw text from KEY_2
 * @returns {object}     Fully merged structured resume data
 */
function mergeResumeResults(raw1, raw2) {
  const EMPTY = {
    skills              : [],
    programmingLanguages: [],
    frameworks          : [],
    databases           : [],
    coreCsSubjects      : [],
    certifications      : [],
    projects            : [],
    experience          : [],
  };

  const r1 = safeParseJSON(raw1, EMPTY);
  const r2 = safeParseJSON(raw2, EMPTY);

  /** Deduplicate a flat string array (case-insensitive). */
  function dedupeStrings(arr1 = [], arr2 = []) {
    const seen = new Set();
    const out  = [];
    for (const item of [...arr1, ...arr2]) {
      if (typeof item !== "string" || !item.trim()) continue;
      const key = item.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item.trim());
      }
    }
    return out;
  }

  /**
   * Deduplicate object arrays (projects / experience).
   * Two entries are duplicates when their first 50 chars of a canonical key match.
   * Works for both plain strings and { title, name, role } shaped objects.
   */
  function dedupeObjects(arr1 = [], arr2 = []) {
    const canonicalize = (item) => {
      if (typeof item === "string") return item.trim().toLowerCase().slice(0, 50);
      return String(
        item?.title || item?.name || item?.role || item?.company || JSON.stringify(item)
      )
        .trim()
        .toLowerCase()
        .slice(0, 50);
    };

    const seen = new Set();
    const out  = [];
    for (const item of [...arr1, ...arr2]) {
      if (!item) continue;
      const key = canonicalize(item);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
    return out;
  }

  return {
    skills              : dedupeStrings(r1.skills,               r2.skills),
    programmingLanguages: dedupeStrings(r1.programmingLanguages,  r2.programmingLanguages),
    frameworks          : dedupeStrings(r1.frameworks,            r2.frameworks),
    databases           : dedupeStrings(r1.databases,             r2.databases),
    coreCsSubjects      : dedupeStrings(r1.coreCsSubjects,        r2.coreCsSubjects),
    certifications      : dedupeStrings(r1.certifications,        r2.certifications),
    projects            : dedupeObjects(r1.projects,              r2.projects),
    experience          : dedupeObjects(r1.experience,            r2.experience),
  };
}

module.exports = { dualComplete, mergeResumeResults };