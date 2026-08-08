(function initAiClient(global) {
  const namespace = global.JobApplyAssistant || (global.JobApplyAssistant = {});

  function getStorage() {
    return namespace.storage || null;
  }

  async function getConfig() {
    const storage = getStorage();
    if (!storage) {
      return null;
    }
    return storage.getAiConfig();
  }

  async function callOmniRouteChat(prompt, systemMessage, temperature = 0.2) {
    const config = await getConfig();
    if (!config || !config.enabled || !config.apiBaseUrl || !config.apiKey || !config.model) {
      return null;
    }
    const url = `${config.apiBaseUrl.replace(/\/$/, "")}/chat/completions`;
    const makeBody = (model) => JSON.stringify({
      model,
      stream: false,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ]
    });

    // Try configured model first
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: makeBody(config.model)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '<failed to read body>');
      // If server complains about invalid model, try fallbacks
      if (errText && errText.toLowerCase().includes('invalid model')) {
        const fallbacks = ['gpt-4o-mini', 'gpt-3.5-turbo'];
        for (const fb of fallbacks) {
          try {
            const fbResp = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
              body: makeBody(fb)
            });
            if (!fbResp.ok) {
              const fbErr = await fbResp.text().catch(() => '<failed to read body>');
              // continue to next fallback
              continue;
            }
            const fbPayload = await fbResp.json();
            const fbContent = fbPayload?.choices?.[0]?.message?.content;
            if (!fbContent) throw new Error('AI response did not include message content');
            return fbContent;
          } catch (e) {
            // try next fallback
            continue;
          }
        }
      }
      throw new Error(`AI request failed ${response.status}: ${errText}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI response did not include message content");
    }

    return content;
  }

  function extractJsonFromText(txt) {
    try {
      return JSON.parse(txt);
    } catch (e) {
      const m = String(txt).match(/\{[\s\S]*\}/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch (e2) {
          return null;
        }
      }
      return null;
    }
  }

  async function extractResumeData(text, fileName) {
    // Follow test-pdf-to-omniroute.js precisely: Stage 1 personal extraction, Stage 2 section extraction, merge and return.
    const personalPrompt = `Use ALL of the resume text provided. Extract full_name, email, phone, linkedin, github, and summary (if any). Output JSON only with keys full_name, email, phone, linkedin, github, summary. Text:\n\n${text}`;

    const personalResp = await callOmniRouteChat(
      personalPrompt,
      'You are a utility that extracts contact info.',
      0
    );

    const personalRaw = personalResp;
    const personal = extractJsonFromText(personalRaw) || { full_name: null, email: null, phone: null, summary: null };

    const systemMsg = `You are a strict, reliable resume parser. When given resume text, produce EXACTLY one JSON object and NOTHING else (no explanation, no markdown, no backticks). First detect which high-level sections are present in the resume, then return them as structured JSON. Always include a \"personal\" object for basic contact fields.`;

    const userRules = `Parsing rules and desired sections:\n1) ALWAYS extract contact/personal info from anywhere in the text: full_name, email, phone, summary. To find email use common email patterns, to find phone use international or local phone patterns. These PERSONAL fields must be filled when present.\n2) Then return any of these section keys if present in the document: \"education\", \"publications\", \"main_experience\", \"projects\", \"technical_skills\", \"teaching_experience\", \"honors_and_awards\", \"extracurricular_activities\".\n3) If a section is not present, you may omit it or return an empty array.\n4) For \"education\" items use: {institution:string|null, degree:string|null, start_date:string|null, end_date:string|null}.\n5) For \"main_experience\" items use: {title:string|null, organization:string|null, start_date:string|null, end_date:string|null, bullets:[string]}.\n6) For \"projects\" items use: {name:string|null, technologies:[string], start_date:string|null, end_date:string|null, description:string|null}.\n7) For \"technical_skills\" return an array of strings (grouped by list if possible).\n8) Use null for missing scalar fields and empty arrays when appropriate.\n9) Normalize dates to short month-year or year strings when available (e.g., \"Aug 2022\"); parse ranges where present.\n10) Do NOT fabricate facts; if unsure, leave fields null.\n11) Additionally, include an optional \"other_sections\" object mapping any other detected section titles to their raw text if they don't fit the requested keys.\n\nIMPORTANT: personal example (must follow this format if data exists):\n\"personal\": {\"full_name\":\"Xinyi (Rex) Le\",\"email\":\"rexle192010@gmail.com\",\"phone\":\"+1 346-541-6204\",\"summary\":null}`;

    // Enforce raw text preservation: include verbatim raw_text and per-section raw fields
    const rawPreserveNote = "\n\nCRITICAL: In addition to the structured extraction, include a top-level 'raw_text' field containing the ORIGINAL resume text EXACTLY as provided (verbatim, do NOT reformat or summarize). For every detected section you return, add an additional 'raw' field that contains the exact substring from the original resume text that corresponds to that section. Preserve spacing, punctuation, and line breaks in these raw fields.\n\nThe final JSON must therefore include both the structured fields and the verbatim raw text pieces so that parsed text and raw text are identical where applicable.";

    const userRulesWithRaw = userRules + rawPreserveNote;

    const sectionPrompt = `${userRulesWithRaw}\n\nDetect which of these sections appear in the resume: education, publications, main_experience, projects, technical_skills, teaching_experience, honors_and_awards, extracurricular_activities. For each detected section, extract structured info where reasonable (e.g., education items with institution/degree/dates; experience with title/org/dates/bullets). Return ONE JSON object that MAY omit sections not found. Do NOT include contact info (we already extracted it). Additionally include the top-level 'raw_text' and per-section 'raw' fields as described. Example: {\n  \"personal\": {...},\n  \"education\": [{\"institution\":\"...\",\"raw\":\"...\"}, ...],\n  \"main_experience\":[{\"title\":\"...\",\"raw\":\"...\"}, ...],\n  \"technical_skills\":[\"Python\",\"Java\"],\n  \"raw_text\":\"<full original resume text>\"\n}\n\nResume text:\n\n${text}`;

    const sectionsResp = await callOmniRouteChat(sectionPrompt, systemMsg, 0);
    const sectionsRaw = sectionsResp;
    const sectionsParsed = extractJsonFromText(sectionsRaw) || {};

    // Prefer personal extracted from Stage1; if Stage2 also returned a `personal` object,
    // merge them but let Stage1 values override Stage2 when present.
    const stage2Personal = sectionsParsed.personal || {};
    const mergedPersonal = Object.assign({}, stage2Personal, personal);

    // Remove personal from sections before merging to avoid accidental overwrite
    const sectionsOnly = Object.assign({}, sectionsParsed);
    delete sectionsOnly.personal;

    const final = Object.assign({ personal: mergedPersonal }, sectionsOnly, {
      full_text: text,
      personalRaw,
      sectionsRaw
    });

    return final;
  }

  async function generateAnswer() {
    throw new Error("Answer generation is not connected yet");
  }

  // Map a parsed resume JSON (from extractResumeData) into a reusable Profile object
  function mapParsedToProfile(parsed, source) {
    const profile = {
      personal: {},
      contact: {},
      links: {},
      education: [],
      experience: [],
      projects: [],
      skills: { other: [] },
      publications: [],
      awards: [],
      certifications: [],
      languages: [],
      work_authorization: {},
      preferences: {}
    };

    try {
      const p = parsed.personal || {};
      // naive name split
      const full = p.full_name || p.full_name || '';
      const names = String(full).trim().split(/\s+/);
      profile.personal.full_name = full || null;
      profile.personal.first_name = names[0] || null;
      profile.personal.last_name = names.slice(1).join(' ') || null;
      profile.personal.preferred_name = profile.personal.first_name;

      profile.contact.email = p.email || null;
      profile.contact.phone = p.phone || null;

      // links
      profile.links.linkedin = p.linkedin || null;
      profile.links.github = p.github || null;

      // education
      if (Array.isArray(parsed.education)) {
        profile.education = parsed.education.map(e => ({
          institution: e.institution || null,
          degree: e.degree || null,
          field_of_study: e.field || e.field_of_study || null,
          start_date: e.start_date || null,
          end_date: e.end_date || null,
          location: e.location || null,
          gpa: e.gpa || null,
          coursework: e.coursework || null,
          raw: e.raw || null
        }));
      }

      // experience (map main_experience -> experience)
      const exList = parsed.main_experience || parsed.experience || [];
      if (Array.isArray(exList)) {
        profile.experience = exList.map(it => ({
          company: it.organization || it.company || null,
          title: it.title || null,
          location: it.location || null,
          start_date: it.start_date || null,
          end_date: it.end_date || null,
          description: Array.isArray(it.bullets) ? it.bullets : (it.description || null),
          raw: it.raw || null,
          type: it.type || null
        }));
      }

      // projects
      if (Array.isArray(parsed.projects)) {
        profile.projects = parsed.projects.map(pr => ({
          name: pr.name || pr.title || null,
          description: pr.description || null,
          technologies: pr.technologies || pr.tech || [],
          url: pr.link || pr.url || null,
          raw: pr.raw || null
        }));
      }

      // skills
      if (Array.isArray(parsed.technical_skills)) {
        profile.skills.other = parsed.technical_skills.slice();
      } else if (typeof parsed.technical_skills === 'string') {
        profile.skills.other = parsed.technical_skills.split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean);
      }

      // publications
      if (Array.isArray(parsed.publications)) profile.publications = parsed.publications.slice();
      // awards
      if (Array.isArray(parsed.honors_and_awards)) profile.awards = parsed.honors_and_awards.slice();

      // languages
      if (Array.isArray(parsed.languages)) profile.languages = parsed.languages.slice();

      // Expose source and timestamps
      profile._meta = {
        source: source || (parsed.source || null),
        generated_at: new Date().toISOString()
      };
    } catch (e) {
      // best-effort mapping; swallow errors
    }

    return profile;
  }

  namespace.aiClient = {
    generateAnswer,
    extractResumeData,
    callOmniRouteChat,
    mapParsedToProfile
  };
  // Node/CommonJS export for scripts
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = namespace.aiClient;
  }
})(typeof window !== "undefined" ? window : globalThis);
