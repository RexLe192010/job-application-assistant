(function initFieldSchema(global) {
  const FIELD_TYPES = {
    FULL_NAME: "full_name",
    EMAIL: "email",
    PHONE: "phone",
    CITY: "city",
    LINKEDIN: "linkedin",
    GITHUB: "github"
  };

  const FIELD_SYNONYMS = {
    [FIELD_TYPES.FULL_NAME]: [
      "full name",
      "name",
      "legal name",
      "candidate name",
      "your name",
      "姓名"
    ],
    [FIELD_TYPES.EMAIL]: ["email", "e-mail", "邮箱", "mail"],
    [FIELD_TYPES.PHONE]: [
      "phone",
      "mobile",
      "cell",
      "telephone",
      "tel",
      "phone number",
      "电话",
      "手机号"
    ],
    [FIELD_TYPES.CITY]: ["city", "location", "current city", "居住城市", "城市"],
    [FIELD_TYPES.LINKEDIN]: ["linkedin", "linkedin profile", "linkedin url"],
    [FIELD_TYPES.GITHUB]: ["github", "github profile", "github url"]
  };

  function normalizeText(value) {
    return (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function scoreByText(fieldType, text) {
    const normalized = normalizeText(text);
    if (!normalized) {
      return 0;
    }

    const aliases = FIELD_SYNONYMS[fieldType] || [];
    let best = 0;

    for (const alias of aliases) {
      const aliasNormalized = normalizeText(alias);
      if (!aliasNormalized) {
        continue;
      }
      if (normalized === aliasNormalized) {
        best = Math.max(best, 1);
      } else if (normalized.includes(aliasNormalized)) {
        best = Math.max(best, 0.75);
      } else if (aliasNormalized.includes(normalized) && normalized.length > 3) {
        best = Math.max(best, 0.5);
      }
    }

    return best;
  }

  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});
  namespace.fieldSchema = {
    FIELD_TYPES,
    FIELD_SYNONYMS,
    normalizeText,
    scoreByText
  };
})(typeof window !== "undefined" ? window : globalThis);
