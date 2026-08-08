// Test aiClient.extractResumeData in Node by mocking storage config
(async () => {
  const fs = require('fs');
  const path = require('path');

  // Minimal global environment expected by aiClient
  global.JobApplyAssistant = global.JobApplyAssistant || {};

  global.JobApplyAssistant.storage = {
    getAiConfig: async () => ({
      enabled: true,
      apiBaseUrl: 'http://localhost:20128/v1',
      apiKey: 'any-string',
      model: 'auto'
    })
  };

  // load aiClient (it registers to global.JobApplyAssistant.aiClient)
  require('./extension/src/shared/aiClient.js');

  if (!global.JobApplyAssistant.aiClient || !global.JobApplyAssistant.aiClient.extractResumeData) {
    console.error('aiClient not registered');
    process.exit(2);
  }

  const textFile = path.join(__dirname, 'Rex_CV_20260712__Research_.pdf.txt');
  if (!fs.existsSync(textFile)) {
    console.error('Text file not found:', textFile);
    process.exit(2);
  }

  const text = fs.readFileSync(textFile, 'utf8');
  console.log('Calling extractResumeData (this sends requests to OmniRoute)...');
  try {
    const res = await global.JobApplyAssistant.aiClient.extractResumeData(text, 'Rex_CV_20260712__Research_.pdf');
    console.log('=== extractResumeData result ===');
    console.log(JSON.stringify(res, null, 2));
    // Save result to parsed/ with a filename indicating aiclient/test
    try {
      const outDir = path.join(__dirname, 'parsed');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
      const base = path.basename('Rex_CV_20260712__Research_', path.extname('Rex_CV_20260712__Research_.pdf'));
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const parsedPath = path.join(outDir, `${base}.aiclient${ts}.parsed.json`);
      fs.writeFileSync(parsedPath, JSON.stringify(res, null, 2), 'utf8');
      console.log('Saved parsed JSON to', parsedPath);
    } catch (err) {
      console.warn('Failed to save parsed JSON:', err && err.message);
    }
  } catch (err) {
    console.error('extractResumeData failed:', err);
    process.exit(1);
  }
})();
