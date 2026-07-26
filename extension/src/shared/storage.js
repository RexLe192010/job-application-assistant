(function initStorage(global) {
  const STORAGE_KEYS = {
    KNOWLEDGE_BASE: "knowledge_base",
    OBSERVED_FIELDS: "observed_fields",
    FILL_LOGS: "fill_logs"
  };

  const DEFAULT_KNOWLEDGE_BASE = {
    full_name: "",
    email: "",
    phone: "",
    city: "",
    linkedin: "",
    github: ""
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

    const populatedFields = Object.values(knowledgeBase).filter(Boolean).length;
    return {
      populatedFields,
      observedCount: observedFields.length,
      fillLogCount: fillLogs.length,
      latestFillLog: fillLogs[0] || null
    };
  }

  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});
  namespace.storage = {
    STORAGE_KEYS,
    DEFAULT_KNOWLEDGE_BASE,
    read,
    write,
    getKnowledgeBase,
    setKnowledgeBase,
    appendObservedField,
    appendFillLog,
    getStats
  };
})(typeof window !== "undefined" ? window : globalThis);
