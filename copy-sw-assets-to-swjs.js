import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const swAssetsPath = path.join(__dirname, 'sw-assets.json');
const swJsPath = path.join(__dirname, 'public', 'sw.js');

// Baca sw-assets.json
const assets = JSON.parse(fs.readFileSync(swAssetsPath, 'utf-8'));

// Baca sw.js
let swJsContent = fs.readFileSync(swJsPath, 'utf-8');

// Ganti STATIC_ASSETS di sw.js dengan array terbaru
debugger;
swJsContent = swJsContent.replace(
  /const STATIC_ASSETS = \[[\s\S]*?\];/,
  `const STATIC_ASSETS = ${JSON.stringify(assets, null, 2)};`
);

// Tulis ulang sw.js
fs.writeFileSync(swJsPath, swJsContent);

console.log('STATIC_ASSETS in public/sw.js updated from sw-assets.json!'); 