const fs = require('fs');
const path = require('path');

const root = process.cwd();

const filesToCheck = [
  'README.md',
  'mimari.md',
  'kontrol.md',
  'isplani.md',
  'package.json',
  'docs/index.html',
  'docs/styles.css',
  'docs/app/index.html',
  'THIRD_PARTY_NOTICES.md',
];

const mojibakePatterns = [
  /Ã./g,
  /Ä./g,
  /Å./g,
  /â€”/g,
  /â€œ|â€\u009d|â€\u0099|â€¢/g,
  /�/g,
];

const suspiciousQuestionMarkPattern = /[A-Za-zÇĞİÖŞÜçğıöşü]\?[A-Za-zÇĞİÖŞÜçğıöşü]/g;

const failures = [];

for (const relativePath of filesToCheck) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');

  for (const pattern of mojibakePatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length) {
      failures.push({
        file: relativePath,
        reason: `Mojibake izi bulundu: ${matches[0]}`,
      });
      break;
    }
  }

  const questionMatches = content.match(suspiciousQuestionMarkPattern);
  if (questionMatches && questionMatches.length) {
    failures.push({
      file: relativePath,
      reason: `Şüpheli soru işareti deseni bulundu: ${questionMatches[0]}`,
    });
  }
}

if (failures.length) {
  console.error('[text-check] Türkçe metin bozulması tespit edildi:');
  for (const failure of failures) {
    console.error(`- ${failure.file}: ${failure.reason}`);
  }
  process.exit(1);
}

console.log('[text-check] OK');
