(function initFieldDetector(global) {
  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});
  const schema = namespace.fieldSchema;

  if (!schema) {
    throw new Error("fieldSchema is required before fieldDetector");
  }

  const { FIELD_TYPES, normalizeText, scoreByText } = schema;

  function getAssociatedLabelText(element) {
    if (!element) {
      return "";
    }

    const labels = [];

    if (element.id) {
      const explicit = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (explicit) {
        labels.push(explicit.textContent || "");
      }
    }

    const parentLabel = element.closest("label");
    if (parentLabel) {
      labels.push(parentLabel.textContent || "");
    }

    return labels.join(" ");
  }

  function guessByInputType(element) {
    const type = normalizeText(element.getAttribute("type"));
    if (type === "email") {
      return { fieldType: FIELD_TYPES.EMAIL, confidence: 1 };
    }
    if (type === "tel") {
      return { fieldType: FIELD_TYPES.PHONE, confidence: 1 };
    }
    if (type === "url") {
      const nameLike = normalizeText(
        `${element.name || ""} ${element.id || ""} ${element.placeholder || ""}`
      );
      if (nameLike.includes("linkedin")) {
        return { fieldType: FIELD_TYPES.LINKEDIN, confidence: 0.95 };
      }
      if (nameLike.includes("github")) {
        return { fieldType: FIELD_TYPES.GITHUB, confidence: 0.95 };
      }
    }
    return null;
  }

  function detectSingleField(element) {
    const typeGuess = guessByInputType(element);
    if (typeGuess) {
      return {
        element,
        ...typeGuess,
        source: "input-type"
      };
    }

    const candidateText = [
      getAssociatedLabelText(element),
      element.getAttribute("aria-label") || "",
      element.getAttribute("placeholder") || "",
      element.name || "",
      element.id || "",
      element.getAttribute("autocomplete") || ""
    ].join(" ");

    let bestType = null;
    let bestScore = 0;

    for (const fieldType of Object.values(FIELD_TYPES)) {
      const score = scoreByText(fieldType, candidateText);
      if (score > bestScore) {
        bestScore = score;
        bestType = fieldType;
      }
    }

    if (!bestType || bestScore < 0.5) {
      return null;
    }

    return {
      element,
      fieldType: bestType,
      confidence: bestScore,
      source: "semantic"
    };
  }

  function detectFillableFields(root) {
    const scope = root || document;
    const selectors = ["input", "textarea", "select"];
    const nodes = scope.querySelectorAll(selectors.join(","));

    const matches = [];
    nodes.forEach((element) => {
      if (element.disabled || element.readOnly || element.type === "hidden") {
        return;
      }
      const result = detectSingleField(element);
      if (result) {
        matches.push(result);
      }
    });

    return matches;
  }

  namespace.fieldDetector = {
    detectFillableFields,
    detectSingleField
  };
})(window);
