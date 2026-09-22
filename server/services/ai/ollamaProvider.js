const { OLLAMA_BASE_URL, OLLAMA_MODEL } = require("../../config/env");

/** Sends a chat completion request to a local Ollama instance. */
async function complete(messages) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data?.message?.content ?? "";
}

module.exports = { complete, name: "ollama" };
