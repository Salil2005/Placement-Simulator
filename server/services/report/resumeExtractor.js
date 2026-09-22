const fs = require("fs");
const path = require("path");

/**
 * Extract plain text from an uploaded resume file.
 * - .pdf  -> pdf-parse
 * - .docx -> mammoth
 * - .doc  -> word-extractor (legacy binary Word format)
 * - .txt  -> read as-is
 * Text is truncated to keep the AI prompt within limits.
 */
async function extractResumeText(absPath) {
  const ext = path.extname(absPath).toLowerCase();

  if (ext === ".pdf") {
    const text = await extractPdf(absPath);
    return truncate(text);
  }

  if (ext === ".docx") {
    const text = await extractDocx(absPath);
    return truncate(text);
  }

  if (ext === ".doc") {
    const text = await extractDoc(absPath);
    return truncate(text);
  }

  if (ext === ".txt") {
    return truncate(fs.readFileSync(absPath, "utf8"));
  }

  return "";
}

async function extractPdf(absPath) {
  // Lazy require so the app still boots if the dep is missing.
  let pdfParse;
  try {
    pdfParse = require("pdf-parse");
  } catch {
    throw new Error("pdf-parse is not installed. Run `npm install` in /server.");
  }
  const buffer = fs.readFileSync(absPath);
  const data = await pdfParse(buffer);
  return data.text || "";
}

async function extractDocx(absPath) {
  let mammoth;
  try {
    mammoth = require("mammoth");
  } catch {
    throw new Error("mammoth is not installed. Run `npm install` in /server.");
  }
  try {
    const { value } = await mammoth.extractRawText({ path: absPath });
    return value || "";
  } catch (err) {
    console.error("[resumeExtractor] failed to parse .docx:", err.message);
    return "";
  }
}

async function extractDoc(absPath) {
  let WordExtractor;
  try {
    WordExtractor = require("word-extractor");
  } catch {
    throw new Error("word-extractor is not installed. Run `npm install` in /server.");
  }
  try {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(absPath);
    return doc.getBody() || "";
  } catch (err) {
    // Legacy .doc parsing is best-effort - some encrypted/odd files may fail.
    console.error("[resumeExtractor] failed to parse legacy .doc:", err.message);
    return "";
  }
}

function truncate(text, max = 12000) {
  const clean = text.replace(/\s+\n/g, "\n").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

module.exports = { extractResumeText };
