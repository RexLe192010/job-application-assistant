#!/usr/bin/env node
// Simple PDF text extraction test using pdfjs-dist (disableWorker)
const fs = require('fs');
const path = require('path');

async function extractPdfText(filePath) {
  // pdfjs-dist ships ESM (.mjs); dynamically import the module for Node CJS compatibility
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

async function main() {
  const arg = process.argv[2];
  const filePath = arg || path.join(__dirname, 'Rex_CV_20260712__Research_.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('PDF not found:', filePath);
    process.exit(2);
  }

  try {
    console.log('Extracting text from', filePath);
    const txt = await extractPdfText(filePath);
    console.log('--- BEGIN EXTRACTED TEXT ---');
    console.log(txt.slice(0, 2000)); // print head
    console.log('--- END EXTRACTED TEXT ---');
    // Optionally write to file
    fs.writeFileSync(filePath + '.txt', txt, 'utf8');
    console.log('Saved extracted text to', filePath + '.txt');
  } catch (err) {
    console.error('Extraction failed:', err);
    process.exit(1);
  }
}

main();
