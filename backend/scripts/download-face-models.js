'use strict';

/**
 * Descarga los modelos de face-api.js desde GitHub.
 * Ejecutar una sola vez: node scripts/download-face-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.resolve(__dirname, '../models/face-api');
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const FILES = [
  // Detección de rostro (SSD MobileNet V1)
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  // Landmarks de 68 puntos (requerido para reconocimiento)
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  // Reconocimiento facial (descriptores de 128 dimensiones)
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode} para ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log(`Descargando modelos en: ${MODELS_DIR}\n`);

  for (const file of FILES) {
    const dest = path.join(MODELS_DIR, file);
    if (fs.existsSync(dest)) {
      console.log(`  ✓ ${file} (ya existe)`);
      continue;
    }
    process.stdout.write(`  ↓ ${file} ... `);
    try {
      await download(`${BASE_URL}/${file}`, dest);
      const size = (fs.statSync(dest).size / 1024).toFixed(0);
      console.log(`OK (${size} KB)`);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n✅ Todos los modelos descargados correctamente.');
}

main();
