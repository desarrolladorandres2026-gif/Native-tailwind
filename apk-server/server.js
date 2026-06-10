const express = require('express');
const QRCode = require('qrcode');
const os = require('os');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3030;
const BASE_URL = process.env.BASE_URL || null;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      // Saltar hotspot móvil de Windows (192.168.137.x)
      if (iface.address.startsWith('192.168.137.')) continue;
      candidates.push({ name, address: iface.address });
    }
  }

  if (candidates.length === 0) {
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
    return 'localhost';
  }

  const wifi = candidates.find(c => c.address.startsWith('10.') || c.address.startsWith('192.168.'));
  return (wifi || candidates[0]).address;
}

function getAPKInfo() {
  const apksDir = path.join(__dirname, 'apks');
  if (!fs.existsSync(apksDir)) return null;

  const files = fs.readdirSync(apksDir).filter(f => f.endsWith('.apk'));
  if (files.length === 0) return null;

  files.sort((a, b) => {
    return fs.statSync(path.join(apksDir, b)).mtime - fs.statSync(path.join(apksDir, a)).mtime;
  });

  const latest = files[0];
  const stats = fs.statSync(path.join(apksDir, latest));
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

  return { name: latest, sizeMB, mtime: stats.mtime };
}

app.get('/download/:filename?', (req, res) => {
  const apksDir = path.join(__dirname, 'apks');
  let filename = req.params.filename;

  if (!filename) {
    const info = getAPKInfo();
    if (!info) return res.status(404).send('No hay APK disponible.');
    filename = info.name;
  }

  const filePath = path.join(apksDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Archivo no encontrado.');

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.sendFile(filePath);
});

app.get('/', async (req, res) => {
  const localIP = getLocalIP();
  const downloadURL = BASE_URL ? `${BASE_URL}/download` : `http://${localIP}:${PORT}/download`;
  const apkInfo = getAPKInfo();

  let qrSVG = '';
  try {
    qrSVG = await QRCode.toString(downloadURL, {
      type: 'svg',
      width: 220,
      margin: 1,
      color: { dark: '#FFFFFF', light: '#00000000' }
    });
  } catch (err) {
    qrSVG = '<p>Error generando QR</p>';
  }

  const apkAvailable = apkInfo !== null;
  const apkSize = apkInfo ? `${apkInfo.sizeMB} MB` : '--';
  const apkDate = apkInfo
    ? apkInfo.mtime.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : '--';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="theme-color" content="#07060e"/>
  <title>Debuta - Descarga la App</title>
  <style>
    :root {
      --bg:        #07060e;
      --surface:   #0e0c19;
      --border:    rgba(255,255,255,0.07);
      --text-1:    #f0eeff;
      --text-2:    rgba(240,238,255,0.52);
      --text-3:    rgba(240,238,255,0.28);
      --rose:      #f0426a;
      --rose-glow: rgba(240,66,106,0.28);
      --violet:    #7c3aed;
      --green:     #34d399;
      --r:         14px;
      --r-lg:      22px;
      --r-xl:      30px;
    }

    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    body {
      background: var(--bg);
      color: var(--text-1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      min-height: 100dvh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* ---- Background orbs ---- */
    .canvas {
      position: fixed; inset: 0; z-index: 0;
      pointer-events: none; overflow: hidden;
    }
    .orb {
      position: absolute; border-radius: 50%;
      filter: blur(90px);
    }
    .orb-a {
      width: 700px; height: 700px;
      background: radial-gradient(circle, rgba(124,58,237,.22) 0%, transparent 65%);
      top: -280px; left: -180px;
      animation: da 20s ease-in-out infinite;
    }
    .orb-b {
      width: 580px; height: 580px;
      background: radial-gradient(circle, rgba(240,66,106,.18) 0%, transparent 65%);
      bottom: -180px; right: -80px;
      animation: db 26s ease-in-out infinite;
    }
    .orb-c {
      width: 460px; height: 460px;
      background: radial-gradient(circle, rgba(99,102,241,.1) 0%, transparent 65%);
      top: 42%; left: 55%; transform: translate(-50%,-50%);
      animation: dc 32s ease-in-out infinite;
    }
    @keyframes da {
      0%,100% { transform: translate(0,0) scale(1); }
      33%      { transform: translate(55px,45px) scale(1.05); }
      66%      { transform: translate(-30px,70px) scale(.94); }
    }
    @keyframes db {
      0%,100% { transform: translate(0,0); }
      40%     { transform: translate(-65px,-45px) scale(1.1); }
      70%     { transform: translate(45px,-25px) scale(.9); }
    }
    @keyframes dc {
      0%,100% { transform: translate(-50%,-50%) scale(1); opacity:.5; }
      50%      { transform: translate(-50%,-50%) scale(1.28); opacity:.22; }
    }

    /* ---- Layout ---- */
    .page {
      position: relative; z-index: 1;
      max-width: 1140px;
      margin: 0 auto;
      padding: 0 28px;
    }

    /* ---- Nav ---- */
    nav {
      display: flex; align-items: center;
      justify-content: space-between;
      padding: 22px 0;
      border-bottom: 1px solid var(--border);
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-mark {
      width: 34px; height: 34px; border-radius: 10px;
      background: linear-gradient(135deg, var(--violet), var(--rose));
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .brand-name {
      font-size: 18px; font-weight: 800;
      letter-spacing: -.5px; color: var(--text-1);
    }
    .android-pill {
      display: flex; align-items: center; gap: 7px;
      padding: 5px 13px; border-radius: 100px;
      background: rgba(52,211,153,.08);
      border: 1px solid rgba(52,211,153,.2);
      font-size: 12px; font-weight: 600; color: var(--green);
    }
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--green);
      animation: blink 2.4s ease-in-out infinite;
    }
    @keyframes blink {
      0%,100% { opacity:1; } 50% { opacity:.3; }
    }

    /* ---- Hero grid ---- */
    .hero {
      display: grid;
      grid-template-columns: 1.12fr 1fr;
      gap: 72px;
      align-items: center;
      padding: 68px 0 76px;
      min-height: calc(100dvh - 80px);
    }

    .hero-left {
      display: flex; flex-direction: column; gap: 30px;
      animation: up .65s cubic-bezier(.16,1,.3,1) both;
    }

    .eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      width: fit-content;
      padding: 5px 12px; border-radius: 100px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.04);
      font-size: 11.5px; font-weight: 500; color: var(--text-2);
    }

    .headline .kicker {
      display: block;
      font-size: 13px; font-weight: 500; color: var(--text-3);
      text-transform: uppercase; letter-spacing: 2.5px;
      margin-bottom: 2px;
    }

    .headline h1 {
      font-size: clamp(62px, 8vw, 96px);
      font-weight: 900;
      letter-spacing: -4px;
      line-height: .92;
      color: var(--text-1);
    }

    .tagline {
      font-size: 16px; line-height: 1.65;
      color: var(--text-2); max-width: 400px;
    }

    /* ---- CTA ---- */
    .cta-group { display: flex; flex-direction: column; gap: 10px; }

    .btn-dl {
      display: inline-flex; align-items: center; gap: 9px;
      width: fit-content;
      padding: 14px 26px; border-radius: var(--r);
      background: linear-gradient(135deg, var(--violet), var(--rose));
      color: #fff; font-size: 15px; font-weight: 700;
      text-decoration: none; letter-spacing: .1px;
      transition: transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s cubic-bezier(.16,1,.3,1);
      box-shadow: 0 8px 28px var(--rose-glow), 0 2px 6px rgba(0,0,0,.28);
      position: relative; overflow: hidden;
    }
    .btn-dl::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,.18), transparent);
      opacity: 0; transition: opacity .2s;
    }
    .btn-dl:hover { transform: translateY(-3px); box-shadow: 0 18px 44px var(--rose-glow), 0 4px 12px rgba(0,0,0,.35); }
    .btn-dl:hover::after { opacity: 1; }
    .btn-dl:active  { transform: translateY(-1px) scale(.99); }

    .btn-off {
      display: inline-flex; align-items: center; gap: 9px;
      width: fit-content;
      padding: 14px 26px; border-radius: var(--r);
      background: rgba(255,255,255,.05);
      border: 1px solid var(--border);
      color: var(--text-3); font-size: 15px; font-weight: 600;
      cursor: not-allowed;
    }

    .url-hint {
      font-size: 12px; color: var(--text-3);
      display: flex; align-items: center; gap: 5px;
    }
    .url-hint a {
      font-family: 'SF Mono','Cascadia Code','Fira Code',monospace;
      font-size: 11.5px; color: rgba(124,58,237,.75);
      text-decoration: none; transition: color .2s;
    }
    .url-hint a:hover { color: var(--violet); }

    /* ---- Meta row ---- */
    .meta-row {
      display: flex; align-items: center; gap: 20px;
      padding: 18px 22px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      width: fit-content;
    }
    .meta-item { display: flex; flex-direction: column; gap: 3px; }
    .meta-label {
      font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-3);
    }
    .meta-val { font-size: 14px; font-weight: 700; color: var(--text-1); }
    .meta-sep { width: 1px; height: 28px; background: var(--border); }

    /* ---- QR panel ---- */
    .hero-right {
      display: flex; justify-content: center;
      animation: up .65s .1s cubic-bezier(.16,1,.3,1) both;
    }

    .qr-panel { width: 100%; max-width: 340px; }

    .qr-border {
      padding: 1.5px; border-radius: var(--r-xl);
      background: linear-gradient(140deg,
        rgba(124,58,237,.65) 0%,
        rgba(240,66,106,.55) 55%,
        rgba(124,58,237,.2) 100%);
      animation: shimmer 4s ease-in-out infinite;
    }
    @keyframes shimmer { 0%,100%{opacity:.8;} 50%{opacity:1;} }

    .qr-inner {
      background: var(--surface);
      border-radius: calc(var(--r-xl) - 1.5px);
      padding: 30px 26px;
      display: flex; flex-direction: column;
      align-items: center; gap: 20px;
    }

    .qr-label { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .qr-label strong { font-size: 13px; font-weight: 700; color: var(--text-1); }
    .qr-label span   { font-size: 12px; color: var(--text-3); }

    .qr-img-wrap { position: relative; }

    .qr-glow {
      position: absolute; inset: -10px; border-radius: 20px;
      background: linear-gradient(135deg, rgba(124,58,237,.35), rgba(240,66,106,.3));
      filter: blur(16px);
      animation: glow 3s ease-in-out infinite;
    }
    @keyframes glow { 0%,100%{opacity:.5;transform:scale(1);} 50%{opacity:.85;transform:scale(1.03);} }

    .qr-bg {
      position: relative; z-index: 1;
      background: #080712; border-radius: 13px; padding: 16px;
    }
    .qr-bg svg { display: block; border-radius: 4px; }

    .qr-empty {
      position: relative; z-index: 1;
      width: 220px; height: 220px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px;
      background: rgba(255,255,255,.03);
      border-radius: 13px;
      border: 1px dashed rgba(255,255,255,.1);
      color: var(--text-3);
    }
    .qr-empty p {
      font-size: 11.5px; color: var(--text-3);
      text-align: center; line-height: 1.6;
    }
    .qr-empty code {
      font-family: 'SF Mono','Cascadia Code','Fira Code',monospace;
      font-size: 11px; color: rgba(124,58,237,.6);
    }

    .url-bar {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 9px 13px;
      background: rgba(255,255,255,.04);
      border: 1px solid var(--border); border-radius: 10px;
    }
    .url-bar-icon { flex-shrink: 0; color: var(--text-3); }
    .url-bar-text {
      font-family: 'SF Mono','Cascadia Code','Fira Code',monospace;
      font-size: 11px; color: var(--text-2);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* ---- Steps ---- */
    .steps-section {
      padding: 52px 0 68px;
      border-top: 1px solid var(--border);
      animation: up .65s .18s cubic-bezier(.16,1,.3,1) both;
    }
    .steps-section h2 {
      font-size: 24px; font-weight: 800;
      letter-spacing: -.5px; color: var(--text-1);
      margin-bottom: 28px;
    }
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(4,1fr);
      gap: 13px;
    }
    .step-card {
      position: relative;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 22px 18px;
      display: flex; flex-direction: column; gap: 11px;
      overflow: hidden;
      transition: border-color .25s ease, transform .25s cubic-bezier(.16,1,.3,1);
    }
    .step-card::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(124,58,237,.07), rgba(240,66,106,.04));
      opacity: 0; transition: opacity .25s; border-radius: inherit;
    }
    .step-card:hover { border-color: rgba(124,58,237,.3); transform: translateY(-3px); }
    .step-card:hover::after { opacity: 1; }

    .step-num {
      width: 32px; height: 32px; border-radius: 9px;
      background: linear-gradient(135deg, rgba(124,58,237,.18), rgba(240,66,106,.12));
      border: 1px solid rgba(124,58,237,.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; color: var(--violet);
      flex-shrink: 0; position: relative; z-index: 1;
    }
    .step-body { position: relative; z-index: 1; }
    .step-body h3 {
      font-size: 13px; font-weight: 700; color: var(--text-1);
      letter-spacing: -.15px; margin-bottom: 7px;
    }
    .step-body p { font-size: 12.5px; line-height: 1.6; color: var(--text-2); }
    .step-body strong { color: var(--text-1); font-weight: 600; }

    /* ---- Footer ---- */
    footer {
      display: flex; align-items: center;
      justify-content: space-between;
      padding: 18px 0 26px;
      border-top: 1px solid rgba(255,255,255,.04);
      font-size: 12px; color: var(--text-3);
    }
    .footer-l { display: flex; align-items: center; gap: 7px; }
    .footer-r {
      font-family: 'SF Mono','Cascadia Code','Fira Code',monospace;
      font-size: 11px;
    }

    /* ---- Entrance ---- */
    @keyframes up {
      from { opacity:0; transform:translateY(22px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* ---- Responsive ---- */
    @media (max-width: 900px) {
      .hero {
        grid-template-columns: 1fr;
        min-height: auto; gap: 44px;
        padding: 36px 0 52px;
      }
      .hero-right { order: -1; }
      .qr-panel { max-width: 300px; }
      .meta-row { flex-wrap: wrap; }
      .steps-grid { grid-template-columns: 1fr 1fr; }
      .headline h1 { letter-spacing: -2.5px; }
    }
    @media (max-width: 520px) {
      .page { padding: 0 18px; }
      .steps-grid { grid-template-columns: 1fr; }
      .qr-inner { padding: 22px 18px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .orb-a,.orb-b,.orb-c,.qr-glow,.live-dot,.qr-border { animation: none; }
      .hero-left,.hero-right,.steps-section { animation: none; }
      .btn-dl:hover,.step-card:hover { transform: none; }
    }
  </style>
</head>
<body>

  <div class="canvas" aria-hidden="true">
    <div class="orb orb-a"></div>
    <div class="orb orb-b"></div>
    <div class="orb orb-c"></div>
  </div>

  <div class="page">

    <nav>
      <div class="brand">
        <div class="brand-mark">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="white" opacity=".9"/>
          </svg>
        </div>
        <span class="brand-name">Debuta</span>
      </div>
      <div class="android-pill">
        <span class="live-dot"></span>
        Android APK
      </div>
    </nav>

    <section class="hero">

      <div class="hero-left">

        <div class="eyebrow">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="6" cy="6" r="5"/><path d="M6 3v3.5l2 1"/>
          </svg>
          Disponible para Android
        </div>

        <div class="headline">
          <span class="kicker">Descarga</span>
          <h1>Debuta</h1>
        </div>

        <p class="tagline">
          Conecta, descubre y conoce personas cerca de ti.
          Escanea el codigo QR o descarga directamente.
        </p>

        <div class="cta-group">
          ${apkAvailable
            ? `<a href="/download" class="btn-dl">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7.5 1v8M7.5 9 4.5 6.2M7.5 9l3-2.8M1.5 13h12"/>
                </svg>
                Descargar APK
              </a>`
            : `<span class="btn-off">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7.5 1v8M7.5 9 4.5 6.2M7.5 9l3-2.8M1.5 13h12"/>
                </svg>
                APK no disponible aun
              </span>`
          }
          <div class="url-hint">
            <span>O abre</span>
            <a href="${downloadURL}">${downloadURL}</a>
            <span>desde tu Android</span>
          </div>
        </div>

        <div class="meta-row">
          <div class="meta-item">
            <span class="meta-label">Tamano</span>
            <span class="meta-val">${apkSize}</span>
          </div>
          <div class="meta-sep"></div>
          <div class="meta-item">
            <span class="meta-label">Actualizado</span>
            <span class="meta-val">${apkDate}</span>
          </div>
          <div class="meta-sep"></div>
          <div class="meta-item">
            <span class="meta-label">Plataforma</span>
            <span class="meta-val">Android</span>
          </div>
        </div>

      </div>

      <div class="hero-right">
        <div class="qr-panel">
          <div class="qr-border">
            <div class="qr-inner">

              <div class="qr-label">
                <strong>Escanea para descargar</strong>
                <span>Apunta la camara al codigo</span>
              </div>

              <div class="qr-img-wrap">
                ${apkAvailable
                  ? `<div class="qr-glow"></div>
                     <div class="qr-bg">${qrSVG}</div>`
                  : `<div class="qr-empty">
                      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <path d="M14 14h2v2h-2zM18 14h3M14 18h2v3h-2zM18 18h3v3h-3z"/>
                      </svg>
                      <p>Coloca el .apk en<br/><code>apk-server/apks/</code></p>
                    </div>`
                }
              </div>

              <div class="url-bar">
                <svg class="url-bar-icon" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                  <circle cx="6.5" cy="6.5" r="5.5"/>
                  <path d="M1 6.5h11M6.5 1S4.5 4 4.5 6.5 6.5 12 6.5 12M6.5 1S8.5 4 8.5 6.5 6.5 12 6.5 12"/>
                </svg>
                <span class="url-bar-text">${downloadURL}</span>
              </div>

            </div>
          </div>
        </div>
      </div>

    </section>

    <section class="steps-section">
      <h2>Como instalar</h2>
      <div class="steps-grid">
        <div class="step-card">
          <div class="step-num">1</div>
          <div class="step-body">
            <h3>Descarga el APK</h3>
            <p>Escanea el QR o toca el boton de descarga. El archivo llegara a tus descargas.</p>
          </div>
        </div>
        <div class="step-card">
          <div class="step-num">2</div>
          <div class="step-body">
            <h3>Habilita fuentes externas</h3>
            <p>Ve a <strong>Ajustes &rarr; Seguridad</strong> y activa <strong>Instalar apps desconocidas</strong> en tu navegador.</p>
          </div>
        </div>
        <div class="step-card">
          <div class="step-num">3</div>
          <div class="step-body">
            <h3>Instala la app</h3>
            <p>Abre el APK desde tus notificaciones o carpeta de descargas y toca <strong>Instalar</strong>.</p>
          </div>
        </div>
        <div class="step-card">
          <div class="step-num">4</div>
          <div class="step-body">
            <h3>Crea tu cuenta</h3>
            <p>Abre <strong>Debuta</strong>, registrate y empieza a conectar con personas cerca de ti.</p>
          </div>
        </div>
      </div>
    </section>

    <footer>
      <div class="footer-l">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".5">
          <circle cx="6.5" cy="6.5" r="5.5"/><path d="M6.5 3.5v3.5l2 1"/>
        </svg>
        ${BASE_URL ? 'Disponible en ' + BASE_URL : 'Solo disponible en tu red WiFi'}
      </div>
      <div class="footer-r">${BASE_URL || localIP + ':' + PORT}</div>
    </footer>

  </div>
</body>
</html>`;

  res.send(html);
});

const localIP = getLocalIP();

function getAllLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║        DEBUTA — Servidor APK           ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Local:   http://localhost:${PORT}        ║`);
  console.log(`║  QR/Red:  http://${localIP}:${PORT}  ║`);
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Coloca el .apk en apk-server/apks/   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const allIPs = getAllLocalIPs();
  if (allIPs.length > 1) {
    console.log('Todas las interfaces de red:');
    allIPs.forEach(i => console.log(`   ${i.name}: http://${i.address}:${PORT}`));
    console.log();
  }

  const apkInfo = getAPKInfo();
  if (apkInfo) {
    console.log(`APK detectado: ${apkInfo.name} (${apkInfo.sizeMB} MB)`);
  } else {
    console.log('No hay APK en la carpeta apks/ todavia.');
    console.log('   -> Coloca tu .apk en: apk-server/apks/');
  }

  console.log(`\nComparte este enlace: http://${localIP}:${PORT}`);
  console.log('Abre esa URL en el navegador para ver el QR\n');
});
