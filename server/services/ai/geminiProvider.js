const { GEMINI_API_KEY, GEMINI_MODEL } = require("../../config/env");

/**
 * Sends a chat completion request to the Gemini API.
 * Converts OpenAI-style {role, content} messages into Gemini's
 * {role: 'user'|'model', parts:[{text}]} + systemInstruction shape.
 */
async function complete(messages) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const systemMsg = messages.find((m) => m.role === "system");
  const conversation = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: conversation,
      ...(systemMsg && { systemInstruction: { parts: [{ text: systemMsg.content }] } }),
      generationConfig: { temperature: 0.6 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
}

module.exports = { complete, name: "gemini" };
