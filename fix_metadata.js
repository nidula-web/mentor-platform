const fs = require('fs');
const files = [
  'app/browse/layout.tsx',
  'app/c/[shareCode]/page.tsx',
  'app/contact/layout.tsx',
  'app/layout.tsx',
  'app/login/layout.tsx',
  'app/privacy/page.tsx',
  'app/signup/layout.tsx',
  'app/terms/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/'use client'\r?\n?/g, '');
    content = content.replace(/"use client"\r?\n?/g, '');
    fs.writeFileSync(file, content);
    console.log('Fixed export metadata error by removing use client in:', file);
  } else {
    console.log('File not found:', file);
  }
}
