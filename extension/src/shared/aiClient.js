(function initAiClient(global) {
  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});

  function getStorage() {
    return namespace.storage || null;
  }

  async function getConfig() {
    const storage = getStorage();
    if (!storage) {
      return null;
    }
    return storage.getAiConfig();
  }

  async function callOmniRouteChat(prompt, systemMessage) {
    const config = await getConfig();
    if (!config || !config.enabled || !config.apiBaseUrl || !config.apiKey || !config.model) {
      return null;
    }

    const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI response did not include message content");
    }

    return content;
  }

  async function extractResumeData(text, fileName) {
    const prompt = [
      `Resume file: ${fileName || "unknown"}`,
      "Extract high-confidence structured fields and preserve the original content as semantic chunks.",
      "Return valid JSON with this shape:",
      '{"structuredFields":{"full_name":"","email":"","phone":"","city":"","linkedin":"","github":""},"resumeChunks":[{"id":"chunk_1","section":"","text":""}],"summary":"","warnings":[]}',
      "Rules:",
      "- structuredFields should contain only high-confidence values.",
      "- resumeChunks should preserve original wording and natural section boundaries.",
      "- summary should be concise and factual.",
      "- warnings should include any ambiguity or extraction issues.",
      "Resume text:",
      text
    ].join("\n");

    const content = await callOmniRouteChat(
      prompt,
      "You are a resume extraction engine behind OmniRoute. Prioritize free or low-cost models when the router decides, and only output valid JSON."
    );

    if (!content) {
      return null;
    }

    const cleaned = content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    return JSON.parse(cleaned);
  }

  async function generateAnswer() {
    throw new Error("Answer generation is not connected yet");
  }

  namespace.aiClient = {
    generateAnswer,
    extractResumeData,
    callOmniRouteChat
  };
})(typeof window !== "undefined" ? window : globalThis);
