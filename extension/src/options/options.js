(function initOptionsPage() {
  const form = document.getElementById("kbForm");
  const aiForm = document.getElementById("aiForm");
  const resumeFileInput = document.getElementById("resumeFile");
  const analyzeResumeBtn = document.getElementById("analyzeResumeBtn");
  const clearResumeBtn = document.getElementById("clearResumeBtn");
  const refreshModelsBtn = document.getElementById("refreshModelsBtn");
  const statusEl = document.getElementById("status");
  const resumeStatusEl = document.getElementById("resumeStatus");
  const resumePreviewEl = document.getElementById("resumePreview");
  const modelStatusEl = document.getElementById("modelStatus");
  const modelListEl = document.getElementById("modelList");
  const modelOptionsEl = document.getElementById("modelOptions");
  const storage = window.JobApplyAssistant && window.JobApplyAssistant.storage;
  const aiClient = window.JobApplyAssistant && window.JobApplyAssistant.aiClient;
  const resumeParser = window.JobApplyAssistant && window.JobApplyAssistant.resumeParser;

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setResumeStatus(text) {
    resumeStatusEl.textContent = text;
  }

  function setModelStatus(text) {
    modelStatusEl.textContent = text;
  }

  function renderResumePreview(profile) {
    if (!profile || !profile.sourceFile) {
      resumePreviewEl.innerHTML = "";
      return;
    }

    const chunks = Array.isArray(profile.resumeChunks) ? profile.resumeChunks : [];
    const structured = profile.structuredFields || {};

    resumePreviewEl.innerHTML = "";

    const fileBlock = document.createElement("div");
    fileBlock.className = "preview-item";
    fileBlock.innerHTML = "<strong>File</strong>";
    const fileName = document.createElement("div");
    fileName.textContent = profile.sourceFile.name;
    const fileMeta = document.createElement("div");
    fileMeta.className = "muted";
    fileMeta.textContent = `${chunks.length} chunks · ${profile.extractedAt || ""}`;
    fileBlock.append(fileName, fileMeta);

    const summaryBlock = document.createElement("div");
    summaryBlock.className = "preview-item";
    summaryBlock.innerHTML = "<strong>Summary</strong>";
    const summaryText = document.createElement("div");
    summaryText.textContent = profile.summary || "No summary yet.";
    summaryBlock.append(summaryText);

    const structuredBlock = document.createElement("div");
    structuredBlock.className = "preview-item";
    structuredBlock.innerHTML = "<strong>Structured Fields</strong>";
    const structuredText = document.createElement("div");
    structuredText.className = "muted";
    const structuredLines = Object.entries(structured)
      .filter(([key, value]) => key !== "source_file_name" && Boolean(value))
      .map(([key, value]) => `${key}: ${value}`);
    structuredText.textContent = structuredLines.length ? structuredLines.join("\n") : "No structured values extracted.";
    structuredText.style.whiteSpace = "pre-line";
    structuredBlock.append(structuredText);

    resumePreviewEl.append(fileBlock, summaryBlock, structuredBlock);
  }

  async function refreshResumePreview() {
    const profile = await storage.getResumeProfile();
    renderResumePreview(profile);
    if (profile.sourceFile) {
      setResumeStatus(`Imported ${profile.sourceFile.name} with ${profile.resumeChunks.length} chunks.`);
    } else {
      setResumeStatus("No resume uploaded yet.");
    }
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

  async function loadAiSettings() {
    const config = await storage.getAiConfig();
    document.getElementById("aiEnabled").checked = Boolean(config.enabled);
    document.getElementById("apiBaseUrl").value = config.apiBaseUrl || "";
    document.getElementById("model").value = config.model || "";
    document.getElementById("apiKey").value = config.apiKey || "";
    document.getElementById("prioritizeFreeModels").checked = Boolean(config.prioritizeFreeModels);
  }

  function renderModels(models) {
    const list = Array.isArray(models) ? models : [];
    modelOptionsEl.innerHTML = "";
    modelListEl.innerHTML = "";

    list.forEach((entry) => {
      const value = typeof entry === "string" ? entry : entry?.id || entry?.model || entry?.name || "";
      if (!value) {
        return;
      }

      const option = document.createElement("option");
      option.value = value;
      modelOptionsEl.append(option);

      const item = document.createElement("div");
      item.className = "preview-item";
      item.textContent = value;
      modelListEl.append(item);
    });
  }

  async function refreshModels() {
    const config = await storage.getAiConfig();
    const baseUrl = (config.apiBaseUrl || "http://localhost:20128/v1").replace(/\/$/, "");
    const apiKey = config.apiKey || "any-string";

    setModelStatus("Loading models from OmniRoute...");

    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load models: ${response.status}`);
    }

    const payload = await response.json();
    const rawModels = payload?.data || payload?.models || [];
    const models = Array.isArray(rawModels) ? rawModels : [];
    const prioritized = models.slice().sort((a, b) => {
      const aValue = String(typeof a === "string" ? a : a?.id || a?.model || a?.name || "").toLowerCase();
      const bValue = String(typeof b === "string" ? b : b?.id || b?.model || b?.name || "").toLowerCase();
      const freeTerms = ["free", "groq", "cloudflare", "longcat", "nvidia", "cerebras", "kiro", "opencode free"];
      const aScore = freeTerms.some((term) => aValue.includes(term)) ? 0 : 1;
      const bScore = freeTerms.some((term) => bValue.includes(term)) ? 0 : 1;
      return aScore - bScore || aValue.localeCompare(bValue);
    });

    renderModels(prioritized);
    setModelStatus(`Loaded ${prioritized.length} models from OmniRoute.`);
  }

  async function analyzeResumeFile(file) {
    if (!file) {
      throw new Error("Please choose a resume file first");
    }

    if (!resumeParser) {
      throw new Error("Resume parser is not available");
    }

    const baseProfile = await resumeParser.buildResumePackage(file);
    let profile = baseProfile;

    if (aiClient && typeof aiClient.extractResumeData === "function") {
      try {
        const aiResult = await aiClient.extractResumeData(baseProfile.sourceText, file.name);
        if (aiResult && typeof aiResult === "object") {
          profile = {
            ...baseProfile,
            ...aiResult,
            sourceFile: baseProfile.sourceFile,
            sourceText: baseProfile.sourceText,
            extractedAt: baseProfile.extractedAt,
            importedAt: null,
            warnings: Array.isArray(aiResult.warnings) ? aiResult.warnings : baseProfile.warnings
          };
        }
      } catch (error) {
        console.warn("AI resume extraction failed, falling back to local parser.", error);
      }
    }

    profile.importedAt = new Date().toISOString();
    await storage.setResumeProfile(profile);
    await storage.mergeKnowledgeBaseFromFields(profile.structuredFields, false);
    await loadKnowledgeBase();
    await refreshResumePreview();
    setStatus(`Resume analyzed and prefilled from ${file.name}.`);
  }

  analyzeResumeBtn.addEventListener("click", async () => {
    try {
      setStatus("Analyzing resume...");
      await analyzeResumeFile(resumeFileInput.files[0]);
    } catch (error) {
      setStatus(`Resume analysis failed: ${error.message}`);
    }
  });

  clearResumeBtn.addEventListener("click", async () => {
    try {
      await storage.clearResumeProfile();
      resumeFileInput.value = "";
      await refreshResumePreview();
      setStatus("Resume data cleared.");
    } catch (error) {
      setStatus(`Clear failed: ${error.message}`);
    }
  });

  aiForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await storage.setAiConfig({
        enabled: document.getElementById("aiEnabled").checked,
        apiBaseUrl: document.getElementById("apiBaseUrl").value.trim(),
        model: document.getElementById("model").value.trim(),
        apiKey: document.getElementById("apiKey").value.trim(),
        prioritizeFreeModels: document.getElementById("prioritizeFreeModels").checked,
        provider: "omniroute"
      });
      setStatus("Gateway settings saved.");
    } catch (error) {
      setStatus(`Gateway settings save failed: ${error.message}`);
    }
  });

  refreshModelsBtn.addEventListener("click", async () => {
    try {
      await refreshModels();
    } catch (error) {
      setModelStatus(`Model load failed: ${error.message}`);
    }
  });

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

  Promise.all([loadKnowledgeBase(), loadAiSettings(), refreshResumePreview(), refreshModels().catch(() => null)])
    .then(() => setStatus("Loaded current values."))
    .catch((error) => setStatus(`Load failed: ${error.message}`));
})();
