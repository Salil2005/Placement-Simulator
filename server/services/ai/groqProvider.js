const {
  GROQ_API_KEY,
  GROQ_BASE_URL,
  GROQ_MODEL,
} = require("../../config/env");

async function complete(messages) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const baseUrl =
    GROQ_BASE_URL || "https://api.groq.com/openai/v1";

  const model =
    GROQ_MODEL || "openai/gpt-oss-20b";

  const inputCharacters = messages.reduce(
    (total, message) =>
      total + String(message.content || "").length,
    0
  );

  console.log("\n========== GROQ REQUEST ==========");
  console.log("Model:", model);
  console.log("Input characters:", inputCharacters);
  console.log("==================================");

  try {
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
        max_completion_tokens: 4096,
      }),
    });

    const body = await res.text();

    if (!res.ok) {
      console.error("\n========== GROQ ERROR ==========");
      console.error("Status:", res.status);
      console.error("Response:", body);
      console.error("================================\n");

      const error = new Error(
        `Groq error ${res.status}: ${body}`
      );

      error.statusCode = res.status;

      throw error;
    }

    const data = JSON.parse(body);

    console.log("\n========== GROQ RESPONSE ==========");

    if (data?.usage) {
      console.log(
        "Prompt tokens:",
        data.usage.prompt_tokens
      );

      console.log(
        "Completion tokens:",
        data.usage.completion_tokens
      );

      console.log(
        "Total tokens:",
        data.usage.total_tokens
      );

      if (data.usage.completion_tokens_details) {
        console.log(
          "Reasoning tokens:",
          data.usage.completion_tokens_details.reasoning_tokens
        );
      }
    }

    console.log(
      "Finish reason:",
      data?.choices?.[0]?.finish_reason
    );

    console.log("===================================\n");

    const choice = data?.choices?.[0];

    const content =
      choice?.message?.content;

    if (!content) {

      if (choice?.finish_reason === "length") {
        throw new Error(
          "Groq response was truncated because the completion token limit was reached."
        );
      }

      console.error(
        "Groq returned no content:",
        JSON.stringify(data, null, 2)
      );

      throw new Error(
        "Groq returned an empty response"
      );
    }

    return content;

  } catch (error) {

    console.error(
      "Groq provider failed:",
      error.message
    );

    throw error;
  }
}

module.exports = {
  complete,
  name: "groq",
};