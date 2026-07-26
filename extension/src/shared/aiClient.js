(function initAiClient(global) {
  async function generateAnswer() {
    throw new Error("AI client is not connected in MVP phase");
  }

  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});
  namespace.aiClient = {
    generateAnswer
  };
})(typeof window !== "undefined" ? window : globalThis);
