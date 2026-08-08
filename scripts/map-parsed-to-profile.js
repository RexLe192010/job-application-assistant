const fs = require('fs');
const path = require('path');
const aiClient = require('../extension/src/shared/aiClient.js');

async function main() {
  const parsedPath = process.argv[2] || path.join(__dirname, '..', 'parsed', 'Rex_CV_20260712__Research_.aiclient2026-08-07T14-38-38-832Z.parsed.json');
  if (!fs.existsSync(parsedPath)) {
    console.error('Parsed file not found:', parsedPath);
    process.exit(1);
  }
  const txt = fs.readFileSync(parsedPath, 'utf8');
  const parsed = JSON.parse(txt);
  const profile = aiClient.mapParsedToProfile(parsed, path.basename(parsedPath));
  const outName = path.basename(parsedPath).replace(/\.parsed\.json$/, '') + '.profile.json';
  const outPath = path.join(path.dirname(parsedPath), outName);
  fs.writeFileSync(outPath, JSON.stringify(profile, null, 2), 'utf8');
  console.log('Wrote profile to', outPath);
}

main().catch(e=>{ console.error(e); process.exit(1); });
