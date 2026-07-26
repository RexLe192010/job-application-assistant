(function initFieldFiller(global) {
  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});

  function dispatchInputEvents(element) {
    ["input", "change", "blur"].forEach((eventName) => {
      const event = new Event(eventName, { bubbles: true });
      element.dispatchEvent(event);
    });
  }

  function setElementValue(element, value) {
    if (element.tagName === "SELECT") {
      const normalized = String(value).trim().toLowerCase();
      const targetOption = Array.from(element.options).find((option) => {
        const optionValue = String(option.value || "").trim().toLowerCase();
        const optionText = String(option.textContent || "").trim().toLowerCase();
        return optionValue === normalized || optionText === normalized;
      });

      if (!targetOption) {
        return false;
      }

      element.value = targetOption.value;
      dispatchInputEvents(element);
      return true;
    }

    element.focus();
    element.value = value;
    dispatchInputEvents(element);
    return true;
  }

  async function fillDetectedFields(detectedFields, knowledgeBase) {
    const storage = namespace.storage;
    const report = {
      total: detectedFields.length,
      filled: 0,
      skipped: 0,
      missing: []
    };

    for (const field of detectedFields) {
      const value = knowledgeBase[field.fieldType];
      if (!value) {
        report.skipped += 1;
        report.missing.push(field.fieldType);
        continue;
      }

      const ok = setElementValue(field.element, value);
      if (ok) {
        report.filled += 1;
      } else {
        report.skipped += 1;
      }
    }

    if (storage) {
      await storage.appendFillLog({
        url: location.href,
        timestamp: new Date().toISOString(),
        report
      });
    }

    return report;
  }

  namespace.fieldFiller = {
    fillDetectedFields
  };
})(window);
