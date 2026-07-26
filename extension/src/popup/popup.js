(function initPopup() {
  const statusEl = document.getElementById("status");
  const kbCountEl = document.getElementById("kbCount");
  const observedCountEl = document.getElementById("observedCount");
  const fillLogCountEl = document.getElementById("fillLogCount");
  const detectBtn = document.getElementById("detectBtn");
  const fillBtn = document.getElementById("fillBtn");
  const optionsBtn = document.getElementById("optionsBtn");

  const storage = window.JobApplyAssistant && window.JobApplyAssistant.storage;

  function setStatus(message) {
    statusEl.textContent = message;
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function sendToActiveTab(payload) {
    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      throw new Error("No active tab found");
    }
    return chrome.tabs.sendMessage(tab.id, payload);
  }

  async function refreshStats() {
    if (!storage) {
      return;
    }
    const stats = await storage.getStats();
    kbCountEl.textContent = String(stats.populatedFields);
    observedCountEl.textContent = String(stats.observedCount);
    fillLogCountEl.textContent = String(stats.fillLogCount);
  }

  detectBtn.addEventListener("click", async () => {
    try {
      setStatus("Detecting fields...");
      const result = await sendToActiveTab({ type: "detect-fields" });
      if (!result || !result.ok) {
        throw new Error(result && result.error ? result.error : "Detect failed");
      }
      setStatus(`Detected ${result.detectedCount} fillable fields.`);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  });

  fillBtn.addEventListener("click", async () => {
    try {
      setStatus("Filling fields...");
      const result = await sendToActiveTab({ type: "fill-form" });
      if (!result || !result.ok) {
        throw new Error(result && result.error ? result.error : "Fill failed");
      }
      const report = result.report;
      setStatus(`Filled ${report.filled}/${report.total} fields.`);
      await refreshStats();
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  });

  optionsBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "open-options" });
  });

  refreshStats().catch((error) => setStatus(`Error: ${error.message}`));
})();
