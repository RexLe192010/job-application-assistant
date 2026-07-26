(function initOptionsPage() {
  const form = document.getElementById("kbForm");
  const statusEl = document.getElementById("status");
  const storage = window.JobApplyAssistant && window.JobApplyAssistant.storage;

  function setStatus(text) {
    statusEl.textContent = text;
  }

  async function loadKnowledgeBase() {
    if (!storage) {
      return;
    }
    const knowledge = await storage.getKnowledgeBase();
    Object.entries(knowledge).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) {
        field.value = value;
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = {};
      const formData = new FormData(form);
      for (const [key, value] of formData.entries()) {
        payload[key] = String(value || "").trim();
      }

      await storage.setKnowledgeBase(payload);
      setStatus("Saved successfully.");
    } catch (error) {
      setStatus(`Save failed: ${error.message}`);
    }
  });

  loadKnowledgeBase()
    .then(() => setStatus("Loaded current values."))
    .catch((error) => setStatus(`Load failed: ${error.message}`));
})();
