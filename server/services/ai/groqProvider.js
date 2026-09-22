// const { GROK_API_KEY, GROK_BASE_URL, GROK_MODEL } = require("../../config/env");

// /** Sends a chat completion request to the Grok (xAI) API. */
// async function complete(messages) {
//   if (!GROK_API_KEY) throw new Error("GROK_API_KEY is not configured");

//   const res = await fetch(`${GROK_BASE_URL}/chat/completions`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${GROK_API_KEY}`,
//     },
//     body: JSON.stringify({
//       model: GROK_MODEL,
//       messages,
//       temperature: 0.6,
//     }),
//   });

//   if (!res.ok) {
//     const body = await res.text().catch(() => "");
//     throw new Error(`Grok error ${res.status}: ${body}`);
//   }

//   const data = await res.json();
//   return data?.choices?.[0]?.message?.content ?? "";
// }

// module.exports = { complete, name: "grok" };

const {
  GROQ_API_KEY,
  GROQ_BASE_URL,
  GROQ_MODEL,
} = require("../../config/env");

/**
 * Sends a chat completion request to the Groq API.
 */
async function complete(messages) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const baseUrl =
    GROQ_BASE_URL || "https://api.groq.com/openai/v1";

  const model =
    GROQ_MODEL || "openai/gpt-oss-20b";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },

    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    throw new Error(
      `Groq error ${res.status}: ${body}`
    );
  }

  const data = await res.json();

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty response");
  }

  return content;
}

module.exports = {
  complete,
  name: "groq",
};

