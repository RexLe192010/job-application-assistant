#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const OMNIROUTE_BASE_URL = 'http://localhost:20128/v1';

async function extractPdfText(filePath) {
  const pdfjsLibModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsLib = pdfjsLibModule.default || pdfjsLibModule;
  const raw = fs.readFileSync(filePath);
  const arrayBuffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
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
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

(async()=>{
  const pdfPath = path.join(__dirname, 'Rex_CV_20260712__Research_.pdf');
  const text = await extractPdfText(pdfPath);
  const snippet = text.slice(0, 2000);
  const resp = await requestChatCompletion({
    temperature: 0,
    messages: [
      { role: 'system', content: 'You are a utility that extracts contact info.' },
      { role: 'user', content: `Extract full_name, email, phone from the text below. Output JSON only. Text:\n\n${snippet}` }
    ]
  });
  console.log('Raw:', resp?.choices?.[0]?.message?.content);
})();
