#!/usr/bin/env node
// Extract PDF text with pdfjs and send to OmniRoute to get structured JSON extraction.
// Usage: node test-pdf-to-omniroute.js [path/to/file.pdf]

const fs = require('fs');
const path = require('path');
const OMNIROUTE_BASE_URL = 'http://localhost:20128/v1';

async function extractPdfText(filePath) {
  const pdfjsLibModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsLib = pdfjsLibModule.default || pdfjsLibModule;

  const raw = fs.readFileSync(filePath);
  const arrayBuffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true });
  const pdf = await loadingTask.promise;

  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n\n';
  }

  return text.trim();
}

async function requestChatCompletion(body) {
  const res = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'auto', stream: false, ...body })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OmniRoute request failed ${res.status}: ${text}`);
  }

  return res.json();
}

function extractJsonFromText(txt) {
  // Try direct parse first
  try {
    return JSON.parse(txt);
  } catch (e) {
    // Fallback: extract first JSON object-looking block
    const m = txt.match(/\{[\s\S]*\}/);
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

async function main() {
  const arg = process.argv[2];
  const pdfPath = arg || path.join(__dirname, 'Rex_CV_20260712__Research_.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found:', pdfPath);
    process.exit(2);
  }

  console.log('Extracting text from', pdfPath);
  const text = await extractPdfText(pdfPath);
  console.log('Extracted text length:', text.length);

  const systemMsg = `You are a strict, reliable resume parser. When given resume text, produce EXACTLY one JSON object and NOTHING else (no explanation, no markdown, no backticks). First detect which high-level sections are present in the resume, then return them as structured JSON. Always include a \\"personal\\" object for basic contact fields.`;

  const userMsg = `Parsing rules and desired sections:\n1) ALWAYS extract contact/personal info from anywhere in the text: full_name, email, phone, summary. To find email use common email patterns, to find phone use international or local phone patterns. These PERSONAL fields must be filled when present.\n2) Then return any of these section keys if present in the document: \"education\", \"publications\", \"main_experience\", \"projects\", \"technical_skills\", \"teaching_experience\", \"honors_and_awards\", \"extracurricular_activities\".\n3) If a section is not present, you may omit it or return an empty array.\n4) For \"education\" items use: {institution:string|null, degree:string|null, start_date:string|null, end_date:string|null}.\n5) For \"main_experience\" items use: {title:string|null, organization:string|null, start_date:string|null, end_date:string|null, bullets:[string]}.\n6) For \"projects\" items use: {name:string|null, technologies:[string], start_date:string|null, end_date:string|null, description:string|null}.\n7) For \"technical_skills\" return an array of strings (grouped by list if possible).\n8) Use null for missing scalar fields and empty arrays when appropriate.\n9) Normalize dates to short month-year or year strings when available (e.g., \"Aug 2022\"); parse ranges where present.\n10) Do NOT fabricate facts; if unsure, leave fields null.\n11) Additionally, include an optional \"other_sections\" object mapping any other detected section titles to their raw text if they don't fit the requested keys.\n\nIMPORTANT: personal example (must follow this format if data exists):\n"personal": {"full_name":"Xinyi (Rex) Le","email":"rexle192010@gmail.com","phone":"+1 346-541-6204","summary":null}\n\nNow analyze and parse the following resume text. Detect which of the desired sections exist in the text, extract them according to the rules, and return ONLY the single JSON object.`;

  console.log('Stage 1: extracting personal/contact fields (use ENTIRE text)...');
  // Stage 1: focused personal extraction — use the full extracted text so links aren't missed
  const personalResp = await requestChatCompletion({
    temperature: 0,
    messages: [
      { role: 'system', content: 'You are a utility that extracts contact info.' },
      { role: 'user', content: `Use ALL of the resume text provided. Extract full_name, email, phone, linkedin, github, and summary (if any). Output JSON only with keys full_name, email, phone, linkedin, github, summary. Text:\n\n${text}` }
    ]
  });

  const personalRaw = personalResp?.choices?.[0]?.message?.content || '{}';
  let personal = extractJsonFromText(personalRaw) || { full_name: null, email: null, phone: null, summary: null };
  console.log('\n--- Personal extraction ---\n', personal);

  console.log('\nStage 2: detect sections and extract other fields (education, experience, etc.)...');
  // Stage 2: detect sections. Provide lighter rules and include known personal to help the model.
  const sectionPrompt = `Detect which of these sections appear in the resume: education, publications, main_experience, projects, technical_skills, teaching_experience, honors_and_awards, extracurricular_activities. For each detected section, extract structured info where reasonable (e.g., education items with institution/degree/dates; experience with title/org/dates/bullets). Return ONE JSON object that MAY omit sections not found. Do NOT include contact info (we already extracted it). Example: {\n  "education": [...],\n  "main_experience":[...],\n  "technical_skills":["Python","Java"]\n}\n\nResume text:\n\n${text}`;

  const sectionsResp = await requestChatCompletion({
    temperature: 0,
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: sectionPrompt }
    ]
  });

  const sectionsRaw = sectionsResp?.choices?.[0]?.message?.content || '{}';
  const sectionsParsed = extractJsonFromText(sectionsRaw) || {};

  const final = { personal, ...sectionsParsed };
  console.log('\n--- Final merged JSON ---\n');
  console.log(JSON.stringify(final, null, 2));
  // Save outputs for later review
  try {
    const outDir = path.join(__dirname, 'parsed');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const base = path.basename(pdfPath, path.extname(pdfPath));
    const parsedPath = path.join(outDir, `${base}.parsed.json`);
    const rawPath = path.join(outDir, `${base}.raw.json`);
    fs.writeFileSync(parsedPath, JSON.stringify(final, null, 2), 'utf8');
    fs.writeFileSync(rawPath, JSON.stringify({ personalRaw, sectionsRaw }, null, 2), 'utf8');
    console.log('Saved parsed JSON to', parsedPath);
    console.log('Saved raw model outputs to', rawPath);
  } catch (err) {
    console.warn('Failed to save parsed outputs:', err.message);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
