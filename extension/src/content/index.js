(function initContentEntry(global) {
  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});
  const detector = namespace.fieldDetector;
  const filler = namespace.fieldFiller;
  const watcher = namespace.fieldWatcher;
  const storage = namespace.storage;

  if (!detector || !filler || !watcher || !storage) {
    return;
  }

  watcher.startWatching();

  async function runFill() {
    const knowledgeBase = await storage.getKnowledgeBase();
    const detectedFields = detector.detectFillableFields(document);
    const report = await filler.fillDetectedFields(detectedFields, knowledgeBase);
    return {
      ok: true,
      report,
      detectedCount: detectedFields.length
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
      return;
    }

    if (message.type === "fill-form") {
      runFill()
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    if (message.type === "detect-fields") {
      const detectedFields = detector.detectFillableFields(document);
      sendResponse({
        ok: true,
        detectedCount: detectedFields.length,
        fields: detectedFields.map((item) => ({
          fieldType: item.fieldType,
          confidence: item.confidence,
          source: item.source
        }))
      });
    }
  });
})(window);
