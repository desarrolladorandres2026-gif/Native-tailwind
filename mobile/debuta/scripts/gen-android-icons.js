/**
 * Genera los íconos nativos de Android (launcher legacy + adaptive icon)
 * a partir de assets/images/icon.png y adaptive-icon-foreground.png,
 * replicando lo que hace `expo prebuild` sin tocar el resto de android/.
 *
 * El adaptive icon se reconstruye para parecerse al icon.png:
 *   - background: gradiente diagonal coral -> fucsia (full-bleed)
 *   - foreground: la "D" centrada con margen de zona segura
 * (los launchers amplían el adaptive icon ~1.5x y recortan 18dp de borde,
 *  por eso el contenido lleva padding para no salir gigante/recortado).
 *
 * android/ es una carpeta generada (CNG) con ajustes manuales que un
 * prebuild --clean borraría. Ejecutar:  node scripts/gen-android-icons.js
 */
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');

const ROOT = path.join(__dirname, '..');
const RES = path.join(ROOT, 'android/app/src/main/res');
const ICON_SRC = path.join(ROOT, 'assets/images/icon.png');

// Gradiente muestreado de icon.png (esquina sup-izq -> inf-der)
const GRAD_TL = { r: 0xff, g: 0x5b, b: 0x60 }; // #ff5b60
const GRAD_BR = { r: 0xfd, g: 0x33, b: 0x76 }; // #fd3376
const BG_COLOR = '#FD297B'; // fallback (app.json)

// Proporción de la altura del lienzo que ocupará el logo en el foreground.
// Con el zoom ~1.5x del launcher equivale a ~64% visible (como en icon.png).
const FG_CONTENT_HEIGHT = 0.43;

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const LEGACY_BASE = 48;   // ic_launcher / ic_launcher_round
const ADAPTIVE_BASE = 108; // ic_launcher_foreground / _background

// Extrae la "D" blanca (con los recortes del búho) desde icon.png:
// los píxeles claros pasan a blanco opaco; el gradiente rosa se vuelve
// transparente para que el background gradiente se vea por los recortes.
function extractWhiteLogo(src) {
  const img = src.clone();
  const { data } = img.bitmap;
  for (let i = 0; i < data.length; i += 4) {
    const mn = Math.min(data[i + 1], data[i + 2]); // min(G,B): alto solo en el blanco
    let alpha;
    if (data[i + 3] < 10) alpha = 0;
    else if (mn >= 205) alpha = 255;
    else if (mn <= 150) alpha = 0;
    else alpha = Math.round(((mn - 150) / 55) * 255);
    data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = alpha;
  }
  return img;
}

function bbox(image) {
  const { width, height, data } = image.bitmap;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function applyCircleMask(image) {
  const { width, height, data } = image.bitmap;
  const r = Math.min(width, height) / 2, cx = width / 2, cy = height / 2;
  image.scan(0, 0, width, height, (x, y, idx) => {
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (dist > r) data[idx + 3] = 0;
    else if (dist > r - 1) data[idx + 3] = Math.round(data[idx + 3] * (r - dist));
  });
  return image;
}

function gradientImage(size) {
  const img = new Jimp(size, size, 0x000000ff);
  const max = (size - 1) * 2;
  img.scan(0, 0, size, size, (x, y, idx) => {
    const t = (x + y) / max;
    img.bitmap.data[idx + 0] = Math.round(GRAD_TL.r + (GRAD_BR.r - GRAD_TL.r) * t);
    img.bitmap.data[idx + 1] = Math.round(GRAD_TL.g + (GRAD_BR.g - GRAD_TL.g) * t);
    img.bitmap.data[idx + 2] = Math.round(GRAD_TL.b + (GRAD_BR.b - GRAD_TL.b) * t);
    img.bitmap.data[idx + 3] = 255;
  });
  return img;
}

async function writePng(image, dir, name) {
  fs.writeFileSync(path.join(dir, name), await image.getBufferAsync(Jimp.MIME_PNG));
}

(async () => {
  const iconSrc = await Jimp.read(ICON_SRC);
  const whiteLogo = extractWhiteLogo(iconSrc); // "D" + búho en blanco con recortes
  const box = bbox(whiteLogo);
  const logo = whiteLogo.clone().crop(box.x, box.y, box.w, box.h); // logo recortado sin padding
  const logoRatio = box.w / box.h;

  for (const [dpi, scale] of Object.entries(DENSITIES)) {
    const dir = path.join(RES, `mipmap-${dpi}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) {
      if (/^ic_launcher.*\.(webp|png)$/.test(f)) fs.unlinkSync(path.join(dir, f));
    }

    const legacy = Math.round(LEGACY_BASE * scale);
    const fgSize = Math.round(ADAPTIVE_BASE * scale);

    // Legacy (Android <8 y diálogos): el icon.png completo
    await writePng(iconSrc.clone().cover(legacy, legacy), dir, 'ic_launcher.png');
    await writePng(applyCircleMask(iconSrc.clone().cover(legacy, legacy)), dir, 'ic_launcher_round.png');

    // Adaptive background: gradiente full-bleed
    await writePng(gradientImage(fgSize), dir, 'ic_launcher_background.png');

    // Adaptive foreground: logo centrado con margen de zona segura
    const ch = Math.round(fgSize * FG_CONTENT_HEIGHT);
    const cw = Math.round(ch * logoRatio);
    const canvas = new Jimp(fgSize, fgSize, 0x00000000);
    canvas.composite(logo.clone().resize(cw, ch), Math.round((fgSize - cw) / 2), Math.round((fgSize - ch) / 2));
    await writePng(canvas, dir, 'ic_launcher_foreground.png');

    console.log(`mipmap-${dpi}: launcher ${legacy}px | adaptive ${fgSize}px (logo ${cw}x${ch})`);
  }

  // Adaptive icon XML (Android 8+) -> background gradiente + foreground logo
  const anydpi = path.join(RES, 'mipmap-anydpi-v26');
  fs.mkdirSync(anydpi, { recursive: true });
  const adaptiveXml =
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
    '    <background android:drawable="@mipmap/ic_launcher_background"/>\n' +
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n' +
    '</adaptive-icon>\n';
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), adaptiveXml);
  console.log('mipmap-anydpi-v26: ic_launcher.xml + ic_launcher_round.xml (background gradiente)');

  // Mantener color fallback en values/colors.xml
  const colorsPath = path.join(RES, 'values/colors.xml');
  let colors = fs.readFileSync(colorsPath, 'utf8');
  if (colors.includes('name="iconBackground"')) {
    colors = colors.replace(/<color name="iconBackground">[^<]*<\/color>/, `<color name="iconBackground">${BG_COLOR}</color>`);
  } else {
    colors = colors.replace('</resources>', `  <color name="iconBackground">${BG_COLOR}</color>\n</resources>`);
  }
  fs.writeFileSync(colorsPath, colors);

  console.log('\nÍconos generados correctamente.');
})().catch((e) => { console.error('ERROR:', e); process.exit(1); });
