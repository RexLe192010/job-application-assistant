(function initResumeParser(global) {
  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});

  const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/;
  const LINKEDIN_REGEX = /https?:\/\/(?:www\.)?linkedin\.com\/[\w\-/?=&.%]+/i;
  const GITHUB_REGEX = /https?:\/\/(?:www\.)?github\.com\/[\w\-/?=&.%]+/i;

  function normalizeText(text) {
    return String(text || "")
      .replace(/\u0000/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();
  }

  function collectLines(text) {
    return normalizeText(text)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function isHeadingLine(line) {
    if (!line) {
      return false;
    }

    if (line.length > 80) {
      return false;
    }

    const titleCase = /^[A-Z][A-Za-z0-9 &/,-]{2,}$/.test(line);
    const allCaps = /^[A-Z0-9 &/,-]{3,}$/.test(line) && /[A-Z]/.test(line);
    const punctuationLight = !/[.!?]$/.test(line);

    return punctuationLight && (titleCase || allCaps);
  }

  function guessName(lines) {
    for (const line of lines) {
      if (EMAIL_REGEX.test(line) || LINKEDIN_REGEX.test(line) || GITHUB_REGEX.test(line)) {
        continue;
      }

      const words = line.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 4) {
        continue;
      }

      if (/^(resume|curriculum vitae|cv)$/i.test(line)) {
        continue;
      }

      return line;
    }

    return "";
  }

  function guessCity(lines) {
    for (const line of lines) {
      const cityMatch = line.match(/(?:location|based in|city)[:\s]+(.+)/i);
      if (cityMatch && cityMatch[1]) {
        return cityMatch[1].trim();
      }
    }

    return "";
  }

  function extractStructuredFields(text, fileName) {
    const normalized = normalizeText(text);
    const lines = collectLines(normalized);
    const emailMatch = normalized.match(EMAIL_REGEX);
    const phoneMatch = normalized.match(PHONE_REGEX);
    const linkedinMatch = normalized.match(LINKEDIN_REGEX);
    const githubMatch = normalized.match(GITHUB_REGEX);

    return {
      full_name: guessName(lines),
      email: emailMatch ? emailMatch[0] : "",
      phone: phoneMatch ? phoneMatch[0] : "",
      city: guessCity(lines),
      linkedin: linkedinMatch ? linkedinMatch[0] : "",
      github: githubMatch ? githubMatch[0] : "",
      source_file_name: fileName || ""
    };
  }

  function buildChunkId(index) {
    return `chunk_${String(index + 1).padStart(2, "0")}`;
  }

  function splitIntoChunks(text) {
    const lines = collectLines(text);
    const chunks = [];
    let activeSection = "Overview";
    let buffer = [];

    function flushBuffer() {
      const chunkText = buffer.join(" ").trim();
      if (!chunkText) {
        return;
      }

      chunks.push({
        id: buildChunkId(chunks.length),
        section: activeSection,
        text: chunkText
      });
      buffer = [];
    }

    lines.forEach((line) => {
      if (isHeadingLine(line)) {
        flushBuffer();
        activeSection = line;
        return;
      }

      if (!line) {
        flushBuffer();
        return;
      }

      buffer.push(line);
      if (buffer.join(" ").length >= 800) {
        flushBuffer();
      }
    });

    flushBuffer();

    return chunks;
  }

  async function readFileText(file) {
    if (!file) {
      throw new Error("Resume file is required");
    }

    return file.text();
  }

  async function buildResumePackage(file) {
    const rawText = await readFileText(file);
    const sourceText = normalizeText(rawText);
    const structuredFields = extractStructuredFields(sourceText, file.name);
    const resumeChunks = splitIntoChunks(sourceText);
    const summary = resumeChunks
      .slice(0, 3)
      .map((chunk) => `${chunk.section}: ${chunk.text.slice(0, 240)}`)
      .join("\n\n");

    return {
      sourceFile: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      },
      sourceText,
      structuredFields,
      resumeChunks,
      summary,
      warnings: sourceText ? [] : ["Resume text could not be extracted cleanly from the uploaded file."],
      extractedAt: new Date().toISOString(),
      importedAt: null
    };
  }

  namespace.resumeParser = {
    normalizeText,
    collectLines,
    extractStructuredFields,
    splitIntoChunks,
    buildResumePackage
  };
})(typeof window !== "undefined" ? window : globalThis);