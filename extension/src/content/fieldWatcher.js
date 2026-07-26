(function initFieldWatcher(global) {
  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});
  const detector = namespace.fieldDetector;
  const storage = namespace.storage;

  if (!detector || !storage) {
    return;
  }

  const tracked = new WeakMap();

  function shouldRecord(element) {
    if (!element) {
      return false;
    }
    const value = (element.value || "").trim();
    if (!value || value.length < 2) {
      return false;
    }
    const lastValue = tracked.get(element);
    if (lastValue === value) {
      return false;
    }
    tracked.set(element, value);
    return true;
  }

  async function onUserInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (!shouldRecord(target)) {
      return;
    }

    const detection = detector.detectSingleField(target);
    if (!detection) {
      return;
    }

    const payload = {
      fieldType: detection.fieldType,
      confidence: detection.confidence,
      value: (target.value || "").trim(),
      source: "user-input",
      url: location.href,
      timestamp: new Date().toISOString()
    };

    await storage.appendObservedField(payload);

    if (detection.confidence >= 0.85) {
      await storage.setKnowledgeBase({ [detection.fieldType]: payload.value });
    }
  }

  function startWatching() {
    document.addEventListener("change", onUserInput, true);
    document.addEventListener("blur", onUserInput, true);
  }

  namespace.fieldWatcher = {
    startWatching
  };
})(window);
