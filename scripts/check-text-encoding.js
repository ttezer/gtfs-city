const fs = require('fs');
const path = require('path');

const root = process.cwd();

const filesToCheck = [
  'README.md',
  'README.en.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'isplani.md',
  'yol-haritasi.md',
  'mimari.md',
  'kontrol.md',
  'package.json',
  'docs/index.html',
  'docs/styles.css',
  'docs/app/index.html',
  'THIRD_PARTY_NOTICES.md',
];

const mojibakePatterns = [
  /Ãƒ./g,
  /Ã„./g,
  /Ã…./g,
  /Ã¢â‚¬â€/g,
  /Ã¢â‚¬Å“|Ã¢â‚¬\u009d|Ã¢â‚¬\u0099|Ã¢â‚¬Â¢/g,
  /ï¿½/g,
];

const turkishDocs = new Set([
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'isplani.md',
  'yol-haritasi.md',
]);

const asciiTurkishPatterns = [
  /\bTurkce\b/g,
  /\bIngilizce\b/g,
  /\bGuncel\b/g,
  /\bDegisiklik\b/g,
  /\bKatki\b/g,
  /\bYol Haritasi\b/g,
  /\bYol Haritasi\b/g,
  /\bYuksek\b/g,
  /\bDusuk\b/g,
  /\bOncelik\b/g,
  /\bPlanlandi\b/g,
  /\bInceleniyor\b/g,
  /\bGelistiriliyor\b/g,
  /\bTamamlandi\b/g,
  /\bOzellik\b/g,
  /\bGelistirme\b/g,
  /\bGorunur\b/g,
  /\bGorunum\b/g,
  /\bGorsel\b/g,
  /\bGorsellestirme\b/g,
  /\bMasaustu\b/g,
  /\bBaslangic\b/g,
  /\bCalisma\b/g,
  /\bYonetimi\b/g,
  /\bAyrintili\b/g,
  /\bAcik\b/g,
  /\bKucuk\b/g,
  /\bBuyuk\b/g,
  /\bbagli\b/g,
  /\bygulama\b/g,
  /\bogrul/g,
  /\byalnizca\b/g,
  /\bdogrulama\b/g,
  /\bdogruluk\b/g,
  /\bdagitim\b/g,
  /\bcikis\b/g,
  /\bDonem\b/g,
  /\bDonus\b/g,
  /\bDonum\b/g,
  /\bdiger\b/g,
];

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

  const lines = content.split('\n');
  for (const line of lines) {
    if (/https?:\/\//.test(line)) continue;
    const suspiciousQuestionMarkPattern = /[A-Za-zÃ‡ÄÄ°Ã–ÅÃœÃ§ÄŸÄ±Ã¶ÅŸÃ¼]\?[A-Za-zÃ‡ÄÄ°Ã–ÅÃœÃ§ÄŸÄ±Ã¶ÅŸÃ¼]/g;
    const questionMatches = line.match(suspiciousQuestionMarkPattern);
    if (questionMatches && questionMatches.length) {
      failures.push({
        file: relativePath,
        reason: `Şüpheli soru işareti deseni bulundu: ${questionMatches[0]}`,
      });
      break;
    }
  }

  if (turkishDocs.has(relativePath)) {
    for (const pattern of asciiTurkishPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length) {
        failures.push({
          file: relativePath,
          reason: `ASCII-Türkçe izi bulundu: ${matches[0]}`,
        });
        break;
      }
    }
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
