import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distAssets = path.join(__dirname, 'dist', 'assets');
const imgDir = path.join(distAssets, 'img');

const assets = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Tambahkan semua file di dist/assets/ (kecuali img/)
fs.readdirSync(distAssets).forEach(file => {
  if (file !== 'img') {
    assets.push(`/assets/${file}`);
  }
});

// Tambahkan semua gambar di dist/assets/img/
if (fs.existsSync(imgDir)) {
  fs.readdirSync(imgDir).forEach(file => {
    assets.push(`/assets/img/${file}`);
  });
}

// Tulis ke sw-assets.json
fs.writeFileSync(
  path.join(__dirname, 'sw-assets.json'),
  JSON.stringify(assets, null, 2)
);

console.log('sw-assets.json generated:', assets); 