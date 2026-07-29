(function initStorage(global) {
  const STORAGE_KEYS = {
    KNOWLEDGE_BASE: "knowledge_base",
    OBSERVED_FIELDS: "observed_fields",
    FILL_LOGS: "fill_logs",
    RESUME_PROFILE: "resume_profile",
    AI_CONFIG: "ai_config"
  };

  const DEFAULT_KNOWLEDGE_BASE = {
    full_name: "",
    email: "",
    phone: "",
    city: "",
    linkedin: "",
    github: ""
  };

  const DEFAULT_RESUME_PROFILE = {
    sourceFile: null,
    sourceText: "",
    structuredFields: { ...DEFAULT_KNOWLEDGE_BASE },
    resumeChunks: [],
    summary: "",
    warnings: [],
    extractedAt: null,
    importedAt: null
  };

  const DEFAULT_AI_CONFIG = {
    enabled: false,
    provider: "omniroute",
    apiBaseUrl: "http://localhost:20128/v1",
    apiKey: "any-string",
    model: "auto",
    route: "auto",
    prioritizeFreeModels: true
  };

  function getChromeStorage() {
    if (!global.chrome || !global.chrome.storage || !global.chrome.storage.local) {
      throw new Error("chrome.storage.local is not available");
    }
    return global.chrome.storage.local;
  }

  async function read(key, fallbackValue) {
    const store = getChromeStorage();
    const result = await store.get([key]);
    if (result[key] === undefined) {
      return fallbackValue;
    }
    return result[key];
  }

  async function write(key, value) {
    const store = getChromeStorage();
    await store.set({ [key]: value });
    return value;
  }

  async function getKnowledgeBase() {
    const value = await read(STORAGE_KEYS.KNOWLEDGE_BASE, DEFAULT_KNOWLEDGE_BASE);
    return { ...DEFAULT_KNOWLEDGE_BASE, ...(value || {}) };
  }

  async function setKnowledgeBase(partial) {
    const current = await getKnowledgeBase();
    const next = { ...current, ...(partial || {}) };
    await write(STORAGE_KEYS.KNOWLEDGE_BASE, next);
    return next;
  }

  async function mergeKnowledgeBaseFromFields(fields, overwrite = false) {
    const current = await getKnowledgeBase();
    const next = { ...current };
    const allowedKeys = new Set(Object.keys(DEFAULT_KNOWLEDGE_BASE));

    Object.entries(fields || {}).forEach(([key, value]) => {
      if (!allowedKeys.has(key)) {
        return;
      }

      if (value === undefined || value === null) {
        return;
      }

      const text = String(value).trim();
      if (!text) {
        return;
      }

      if (overwrite || !next[key]) {
        next[key] = text;
      }
    });

    await write(STORAGE_KEYS.KNOWLEDGE_BASE, next);
    return next;
  }

  async function getResumeProfile() {
    const value = await read(STORAGE_KEYS.RESUME_PROFILE, DEFAULT_RESUME_PROFILE);
    return {
      ...DEFAULT_RESUME_PROFILE,
      ...(value || {}),
      structuredFields: {
        ...DEFAULT_KNOWLEDGE_BASE,
        ...((value && value.structuredFields) || {})
      }
    };
  }

  async function setResumeProfile(profile) {
    const current = await getResumeProfile();
    const next = {
      ...current,
      ...(profile || {}),
      structuredFields: {
        ...DEFAULT_KNOWLEDGE_BASE,
        ...current.structuredFields,
        ...((profile && profile.structuredFields) || {})
      }
    };
    await write(STORAGE_KEYS.RESUME_PROFILE, next);
    return next;
  }

  async function clearResumeProfile() {
    const next = { ...DEFAULT_RESUME_PROFILE };
    await write(STORAGE_KEYS.RESUME_PROFILE, next);
    return next;
  }

  async function getAiConfig() {
    const value = await read(STORAGE_KEYS.AI_CONFIG, DEFAULT_AI_CONFIG);
    return { ...DEFAULT_AI_CONFIG, ...(value || {}) };
  }

  async function setAiConfig(partial) {
    const current = await getAiConfig();
    const next = { ...current, ...(partial || {}) };
    await write(STORAGE_KEYS.AI_CONFIG, next);
    return next;
  }

  async function appendObservedField(item) {
    const current = await read(STORAGE_KEYS.OBSERVED_FIELDS, []);
    const next = [item, ...current].slice(0, 200);
    await write(STORAGE_KEYS.OBSERVED_FIELDS, next);
    return next;
  }

  async function appendFillLog(item) {
    const current = await read(STORAGE_KEYS.FILL_LOGS, []);
    const next = [item, ...current].slice(0, 500);
    await write(STORAGE_KEYS.FILL_LOGS, next);
    return next;
  }

  async function getStats() {
    const [knowledgeBase, observedFields, fillLogs] = await Promise.all([
      getKnowledgeBase(),
      read(STORAGE_KEYS.OBSERVED_FIELDS, []),
      read(STORAGE_KEYS.FILL_LOGS, [])
    ]);
    const resumeProfile = await getResumeProfile();
    const aiConfig = await getAiConfig();

    const populatedFields = Object.values(knowledgeBase).filter(Boolean).length;
    return {
      populatedFields,
      observedCount: observedFields.length,
      fillLogCount: fillLogs.length,
      latestFillLog: fillLogs[0] || null,
      resumeUploaded: Boolean(resumeProfile.sourceFile),
      resumeChunkCount: Array.isArray(resumeProfile.resumeChunks) ? resumeProfile.resumeChunks.length : 0,
      aiEnabled: Boolean(aiConfig.enabled)
    };
  }

  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});
  namespace.storage = {
    STORAGE_KEYS,
    DEFAULT_KNOWLEDGE_BASE,
    DEFAULT_RESUME_PROFILE,
    DEFAULT_AI_CONFIG,
    read,
    write,
    getKnowledgeBase,
    setKnowledgeBase,
    mergeKnowledgeBaseFromFields,
    getResumeProfile,
    setResumeProfile,
    clearResumeProfile,
    getAiConfig,
    setAiConfig,
    appendObservedField,
    appendFillLog,
    getStats
  };
})(typeof window !== "undefined" ? window : globalThis);
