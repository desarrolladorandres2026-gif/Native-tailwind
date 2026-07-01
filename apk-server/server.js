const path       = require('path');

// Guardar PORT del sistema antes de cargar el .env del backend (que tiene PORT=3000)
const _sysPort = process.env.PORT;
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
if (_sysPort === undefined) delete process.env.PORT;

const express    = require('express');
const QRCode     = require('qrcode');
const os         = require('os');
const fs         = require('fs');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const nodemailer = require('nodemailer');

const app      = express();
const PORT     = process.env.PORT || 3030;
const BASE_URL = process.env.BASE_URL || null;

app.use(express.json());

// ── MongoDB ───────────────────────────────────────────────────────────────────
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB conectado (apk-server)'))
    .catch(err => console.error('MongoDB error:', err.message));
}

// ── Modelo de usuario (mínimo necesario) ─────────────────────────────────────
const usuarioSchema = new mongoose.Schema({
  correo:               { type: String },
  password:             { type: String, select: false },
  first_name:           { type: String },
  activo:               { type: Boolean, default: true },
  auth_provider:        { type: String, default: 'local' },
  profile_picture:      { type: { url: String, public_id: String }, default: null },
  cover_photo:          { type: { url: String, public_id: String }, default: null },
  photos:               { type: [{ url: String, public_id: String }], default: [] },
  deleteAccountCode:    { type: String, default: null, select: false },
  deleteAccountExpires: { type: Date,   default: null, select: false },
}, { collection: 'usuarios', strict: false });

usuarioSchema.methods.compararPassword = async function (plain) {
  if (!this.password) return false;
  return bcrypt.compare(plain, this.password);
};

const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);

// ── Mailer ────────────────────────────────────────────────────────────────────
function crearTransporter() {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

const mailer   = crearTransporter();
const MAIL_FROM = process.env.MAIL_FROM || `"Debuta" <${process.env.EMAIL_USER}>`;

async function enviarCodigoEliminacion(toEmail, nombre, code) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0"
       style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(239,68,68,.12);">
<tr><td align="center" style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:40px 32px 32px;">
  <span style="font-size:40px;">⚠️</span>
  <h1 style="color:#fff;margin:8px 0 0;font-size:28px;font-weight:900;">Debuta</h1>
  <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:15px;">Eliminación de cuenta</p>
</td></tr>
<tr><td style="padding:36px 40px 32px;">
  <p style="color:#424242;font-size:16px;margin:0 0 8px;">Hola, <strong>${nombre}</strong></p>
  <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 28px;">
    Recibimos una solicitud para <strong>eliminar permanentemente</strong> tu cuenta.
    Usa este código. <strong>Expira en 15 minutos.</strong>
  </p>
  <div style="background:#fff5f5;border:2px solid rgba(239,68,68,.2);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
    <p style="color:#999;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Código de verificación</p>
    <span style="font-size:48px;font-weight:900;letter-spacing:10px;color:#dc2626;font-family:monospace;">${code}</span>
  </div>
  <p style="color:#dc2626;font-size:13px;font-weight:600;">⚠️ Esta acción es irreversible. Si no solicitaste esto, cambia tu contraseña.</p>
</td></tr>
<tr><td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;">
  <p style="color:#bbb;font-size:12px;margin:0;text-align:center;">© ${new Date().getFullYear()} Debuta · Todos los derechos reservados</p>
</td></tr>
</table></td></tr></table></body></html>`;

  await mailer.sendMail({
    from: MAIL_FROM,
    to: toEmail,
    subject: `Código para eliminar tu cuenta de Debuta: ${code}`,
    text: `Hola ${nombre},\n\nCódigo: ${code}\nExpira en 15 minutos.\n\nSi no solicitaste esto, cambia tu contraseña.\n\n— Equipo Debuta`,
    html,
  });
}

// ── API: Solicitar eliminación ────────────────────────────────────────────────
app.post('/api/delete-account/request', async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password)
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });

    const correoNorm = correo.trim().toLowerCase();
    const usuario = await Usuario.findOne({ correo: correoNorm })
      .select('+password +deleteAccountCode +deleteAccountExpires');

    if (!usuario || !(await usuario.compararPassword(password)))
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });

    if (!usuario.activo)
      return res.status(401).json({ message: 'Cuenta desactivada' });

    const code    = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[DELETE-ACCOUNT] Código para ${correoNorm}: ${code}`);
    const hashed  = await bcrypt.hash(code, 10);
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    usuario.deleteAccountCode    = hashed;
    usuario.deleteAccountExpires = expires;
    await usuario.save({ validateBeforeSave: false });

    try { await enviarCodigoEliminacion(correoNorm, usuario.first_name, code); }
    catch (e) { console.error('Error enviando email:', e.message); }

    res.json({ message: 'Código enviado a tu correo. Expira en 15 minutos.' });
  } catch (err) {
    console.error('delete-account/request:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ── API: Confirmar eliminación ────────────────────────────────────────────────
app.post('/api/delete-account/confirm', async (req, res) => {
  try {
    const { correo, code } = req.body;
    if (!correo || !code)
      return res.status(400).json({ message: 'Correo y código son obligatorios' });

    const correoNorm = correo.trim().toLowerCase();
    const usuario = await Usuario.findOne({
      correo: correoNorm,
      deleteAccountExpires: { $gt: new Date() },
    }).select('+deleteAccountCode +deleteAccountExpires');

    if (!usuario || !usuario.deleteAccountCode)
      return res.status(400).json({ message: 'Código inválido o expirado' });

    const valido = await bcrypt.compare(code.trim(), usuario.deleteAccountCode);
    if (!valido)
      return res.status(400).json({ message: 'Código incorrecto' });

    // Eliminar imágenes de Cloudinary si están configuradas
    try {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const ids = [];
      if (usuario.profile_picture?.public_id) ids.push(usuario.profile_picture.public_id);
      if (usuario.cover_photo?.public_id)      ids.push(usuario.cover_photo.public_id);
      if (usuario.photos?.length)              usuario.photos.forEach(p => ids.push(p.public_id));
      await Promise.all(ids.map(id => cloudinary.uploader.destroy(id).catch(() => {})));
    } catch (_) {}

    await Usuario.deleteOne({ _id: usuario._id });
    res.json({ message: 'Tu cuenta ha sido eliminada permanentemente.' });
  } catch (err) {
    console.error('delete-account/confirm:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ── Panel de Administración ───────────────────────────────────────────────────
// El panel admin lo sirve el BACKEND (puerto 3000). En producción, nginx debe
// enrutar /admin y /api/admin al backend (ver nginx.conf). Este redirect solo
// aplica en acceso directo local (apk-server:3030 → backend:3000).
const ADMIN_PORT = process.env.ADMIN_PORT || 3000;
app.get(/^\/admin(\/.*)?$/, (req, res) => {
  const host = (req.headers.host || '').split(':')[0] || getLocalIP();
  res.redirect(302, `http://${host}:${ADMIN_PORT}${req.originalUrl}`);
});

// ── Política de Privacidad (requerida por Google Play) ────────────────────────
const publicDir = path.join(__dirname, 'public');
app.get(['/privacidad', '/privacy'], (_, res) =>
  res.sendFile(path.join(publicDir, 'privacidad.html'))
);

// ── Eliminación de cuenta (requerida por Google Play) ─────────────────────────
app.get(['/eliminarcuenta', '/delete-account'], (_, res) =>
  res.sendFile(path.join(publicDir, 'eliminarcuenta.html'))
);

// ── Estándares CSAE (requerida por Google Play) ───────────────────────────────
app.get(['/csae', '/proteccion-infantil'], (_, res) =>
  res.sendFile(path.join(publicDir, 'csae.html'))
);

// ── Verificación de Google Search Console ─────────────────────────────────────
app.get('/googlece10d5045ba4130d.html', (_, res) =>
  res.sendFile(path.join(publicDir, 'googlece10d5045ba4130d.html'))
);

// ── Favicon / icono del sitio (necesario para que Google muestre el logo) ─────
app.get(['/favicon.ico', '/favicon.png'], (_, res) => {
  res.type('image/png');
  res.set('Cache-Control', 'public, max-age=604800');
  res.sendFile(path.join(publicDir, 'favicon.png'));
});
app.get(['/apple-touch-icon.png', '/apple-touch-icon-precomposed.png'], (_, res) => {
  res.type('image/png');
  res.set('Cache-Control', 'public, max-age=604800');
  res.sendFile(path.join(publicDir, 'apple-touch-icon.png'));
});

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

  // El archivo físico puede llamarse app-release.apk, pero al usuario siempre
  // se le entrega como "Debuta.apk" (branding y claridad al instalar).
  res.setHeader('Content-Disposition', 'attachment; filename="Debuta.apk"');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.sendFile(filePath);
});

app.get('/', async (req, res) => {
  const localIP = getLocalIP();
  const downloadURL = BASE_URL ? `${BASE_URL}/download` : `http://${localIP}:${PORT}/download`;
  const apkInfo = getAPKInfo();

  const qrURL = 'https://debuta.online/';
  let qrSVG = '';
  try {
    qrSVG = await QRCode.toString(qrURL, {
      type: 'svg',
      width: 220,
      margin: 1,
      color: { dark: '#1A1A28', light: '#00000000' }
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
  <meta name="theme-color" content="#FD297B"/>
  <title>Debuta - Tu próxima historia empieza aquí</title>
  <meta name="description" content="Explora perfiles. Desliza y descubre personas cerca de ti con fotos e historias reales. Haz Match: cuando hay interés mutuo, la app te notifica al instante."/>
  <link rel="canonical" href="https://www.debuta.online/"/>
  <!-- Favicon / icono del sitio -->
  <link rel="icon" type="image/png" href="/favicon.png"/>
  <link rel="shortcut icon" href="/favicon.ico"/>
  <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
  <!-- Open Graph / redes sociales -->
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="Debuta"/>
  <meta property="og:title" content="Debuta - Tu próxima historia empieza aquí"/>
  <meta property="og:description" content="Desliza y descubre personas cerca de ti con fotos e historias reales. Cuando hay interés mutuo, la app te notifica al instante."/>
  <meta property="og:url" content="https://www.debuta.online/"/>
  <meta property="og:image" content="https://www.debuta.online/apple-touch-icon.png"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="Debuta - Tu próxima historia empieza aquí"/>
  <meta name="twitter:description" content="Desliza y descubre personas cerca de ti con fotos e historias reales."/>
  <meta name="twitter:image" content="https://www.debuta.online/apple-touch-icon.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <!-- Animatable conic-gradient para el QR -->
  <style>@property --angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }</style>
  <style>
    :root {
      --bg:           #FAFAFA;
      --surface:      #FFFFFF;
      --surface2:     #F4F4F8;
      --border:       #EEEEEE;
      --text-1:       #1A1A28;
      --text-2:       #424242;
      --text-3:       rgba(66,66,66,0.48);
      --primary:      #FD297B;
      --secondary:    #FF655B;
      --tertiary:     #FF8C42;
      --primary-glow: rgba(253,41,123,0.22);
      --primary-soft: rgba(253,41,123,0.08);
      --green:        #10B981;
      --green-soft:   rgba(16,185,129,0.10);
      --r:            12px;
      --r-lg:         20px;
      --r-xl:         28px;
    }

    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    /* ---- Base ---- */
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--text-1);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100dvh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* ---- Fondo degradado vivo ---- */
    body::before {
      content: '';
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 80% 50% at 10% 0%,   rgba(253,41,123,.07)  0%, transparent 60%),
        radial-gradient(ellipse 60% 60% at 90% 100%,  rgba(255,101,91,.06)  0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 50% 50%,   rgba(255,140,66,.04)  0%, transparent 55%),
        radial-gradient(ellipse 100% 80% at 50% -20%,rgba(253,41,123,.03)  0%, transparent 70%);
      animation: bgShift 20s ease-in-out infinite alternate;
    }
    @keyframes bgShift {
      0%   { opacity: 1;   background-position: 0% 0%; }
      50%  { opacity: .85; }
      100% { opacity: 1;   background-position: 2% 3%; }
    }

    /* ---- Ruido de textura ---- */
    .noise {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      opacity: .028;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 180px 180px;
    }

    /* ---- Canvas orbs ---- */
    .canvas {
      position: fixed; inset: 0; z-index: 0;
      pointer-events: none; overflow: hidden;
    }
    .orb { position: absolute; border-radius: 50%; filter: blur(110px); will-change: transform; }
    .orb-a {
      width: 800px; height: 800px;
      background: radial-gradient(circle, rgba(253,41,123,.13) 0%, transparent 65%);
      top: -300px; left: -200px;
      animation: da 26s ease-in-out infinite;
    }
    .orb-b {
      width: 640px; height: 640px;
      background: radial-gradient(circle, rgba(255,101,91,.10) 0%, transparent 65%);
      bottom: -200px; right: -100px;
      animation: db 32s ease-in-out infinite;
    }
    .orb-c {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(255,140,66,.07) 0%, transparent 65%);
      top: 40%; left: 50%; transform: translate(-50%,-50%);
      animation: dc 38s ease-in-out infinite;
    }
    .orb-d {
      width: 360px; height: 360px;
      background: radial-gradient(circle, rgba(253,41,123,.08) 0%, transparent 65%);
      top: 65%; left: 15%;
      animation: dd 30s ease-in-out infinite;
    }
    .orb-e {
      width: 280px; height: 280px;
      background: radial-gradient(circle, rgba(255,101,91,.07) 0%, transparent 65%);
      top: 20%; right: 8%;
      animation: de 24s ease-in-out infinite;
    }
    @keyframes da {
      0%,100% { transform: translate(0,0) scale(1); }
      33%     { transform: translate(60px,50px) scale(1.08); }
      66%     { transform: translate(-30px,75px) scale(.93); }
    }
    @keyframes db {
      0%,100% { transform: translate(0,0); }
      40%     { transform: translate(-70px,-50px) scale(1.12); }
      70%     { transform: translate(45px,-25px) scale(.91); }
    }
    @keyframes dc {
      0%,100% { transform: translate(-50%,-50%) scale(1);   opacity:.5; }
      50%     { transform: translate(-50%,-50%) scale(1.35); opacity:.2; }
    }
    @keyframes dd {
      0%,100% { transform: translate(0,0); opacity:.7; }
      50%     { transform: translate(40px,-60px) scale(1.1); opacity:.4; }
    }
    @keyframes de {
      0%,100% { transform: translate(0,0); opacity:.6; }
      50%     { transform: translate(-30px,50px) scale(1.15); opacity:.3; }
    }

    /* ---- Corazones flotantes ---- */
    .heart { position: absolute; opacity: 0; animation: floatHeart linear infinite; pointer-events: none; }
    .heart svg { display: block; }
    .h1 { left: 5%;  bottom:-16px; animation-duration:14s; animation-delay:0s;   }
    .h2 { left: 18%; bottom:-16px; animation-duration:19s; animation-delay:4s;   }
    .h3 { left: 33%; bottom:-16px; animation-duration:15s; animation-delay:8s;   }
    .h4 { left: 50%; bottom:-16px; animation-duration:21s; animation-delay:2s;   }
    .h5 { left: 64%; bottom:-16px; animation-duration:17s; animation-delay:10s;  }
    .h6 { left: 79%; bottom:-16px; animation-duration:20s; animation-delay:5s;   }
    .h7 { left: 92%; bottom:-16px; animation-duration:13s; animation-delay:7s;   }
    @keyframes floatHeart {
      0%   { opacity:0;    transform:translateY(0) translateX(0) rotate(0deg); }
      8%   { opacity:.09; }
      50%  {              transform:translateY(-240px) translateX(18px) rotate(12deg); }
      92%  { opacity:.05; }
      100% { opacity:0;   transform:translateY(-500px) translateX(-12px) rotate(-8deg); }
    }

    /* ---- Layout ---- */
    .wrap { position:relative; z-index:1; max-width:1160px; margin:0 auto; padding:0 28px; }

    /* ---- Nav sticky glass ---- */
    .nav-wrap {
      position: sticky; top: 0; z-index: 100;
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
      background: rgba(250,250,250,0.82);
      border-bottom: 1px solid rgba(253,41,123,0.10);
    }
    .nav-wrap::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(253,41,123,.25), rgba(255,101,91,.25), transparent);
    }
    nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 28px;
      max-width: 1160px; margin: 0 auto;
    }
    .brand { display: flex; align-items: center; gap: 11px; }
    .brand-mark {
      width: 36px; height: 36px; border-radius: 12px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      box-shadow: 0 4px 14px var(--primary-glow);
      transition: transform .2s, box-shadow .2s;
    }
    .brand-mark:hover { transform: scale(1.08); box-shadow: 0 6px 20px var(--primary-glow); }
    .brand-name { font-family:'DM Serif Display',serif; font-size:20px; font-style:italic; color:var(--text-1); }
    .nav-right { display:flex; align-items:center; gap:10px; }
    .nav-admin {
      display:flex; align-items:center; gap:6px;
      padding:5px 12px; border-radius:100px;
      background:rgba(0,0,0,0.04); border:1px solid var(--border);
      font-size:12px; font-weight:600; color:var(--text-2);
      text-decoration:none; transition:background .2s, color .2s;
    }
    .nav-admin:hover { background:rgba(0,0,0,0.07); color:var(--text-1); }
    .nav-delete {
      display:flex; align-items:center; gap:6px;
      padding:6px 14px; border-radius:100px;
      background:var(--primary-soft); border:1px solid rgba(253,41,123,0.25);
      font-size:12px; font-weight:700; color:var(--primary);
      text-decoration:none; transition:background .2s, box-shadow .2s;
    }
    .nav-delete:hover { background:rgba(253,41,123,.15); box-shadow:0 2px 12px var(--primary-glow); }
    .android-pill {
      display:flex; align-items:center; gap:7px;
      padding:5px 13px; border-radius:100px;
      background:var(--green-soft); border:1px solid rgba(16,185,129,.25);
      font-size:12px; font-weight:600; color:var(--green);
    }
    .live-dot { width:6px; height:6px; border-radius:50%; background:var(--green); animation:blink 2.4s ease-in-out infinite; }
    @keyframes blink { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(16,185,129,.4);} 50%{opacity:.4;box-shadow:0 0 0 4px rgba(16,185,129,.0);} }

    /* ---- Hero ---- */
    .hero {
      display:grid; grid-template-columns:1.1fr 1fr;
      gap:60px; align-items:center;
      padding:52px 0 68px;
      min-height: calc(100dvh - 65px);
    }
    .hero-left { display:flex; flex-direction:column; gap:26px; }

    /* ---- Reveal al scroll ---- */
    .reveal { opacity:0; transform:translateY(28px); transition:opacity .65s cubic-bezier(.16,1,.3,1), transform .65s cubic-bezier(.16,1,.3,1); }
    .reveal.visible { opacity:1; transform:translateY(0); }
    .reveal-delay-1 { transition-delay:.08s; }
    .reveal-delay-2 { transition-delay:.16s; }
    .reveal-delay-3 { transition-delay:.24s; }
    .reveal-delay-4 { transition-delay:.32s; }

    /* ---- Hero animaciones de entrada ---- */
    .hero-left > * { animation: slideUp .7s cubic-bezier(.16,1,.3,1) both; }
    .hero-left > *:nth-child(1) { animation-delay:.05s; }
    .hero-left > *:nth-child(2) { animation-delay:.15s; }
    .hero-left > *:nth-child(3) { animation-delay:.22s; }
    .hero-left > *:nth-child(4) { animation-delay:.30s; }
    .hero-left > *:nth-child(5) { animation-delay:.38s; }
    .hero-right { display:flex; justify-content:center; animation:slideUp .7s .2s cubic-bezier(.16,1,.3,1) both; }

    /* ---- Eyebrow pill ---- */
    .eyebrow {
      display:inline-flex; align-items:center; gap:7px;
      width:fit-content; padding:5px 14px; border-radius:100px;
      background:var(--surface);
      border:1px solid rgba(253,41,123,.2);
      font-size:11.5px; font-weight:600; color:var(--primary);
      box-shadow:0 2px 8px rgba(253,41,123,.08);
      position:relative; overflow:hidden;
    }
    .eyebrow::before {
      content:''; position:absolute; inset:0;
      background:linear-gradient(90deg, transparent 0%, rgba(253,41,123,.06) 50%, transparent 100%);
      transform:translateX(-100%); animation:eyebrowShine 3s ease-in-out infinite 1.5s;
    }
    @keyframes eyebrowShine { 0%{transform:translateX(-100%);} 100%{transform:translateX(200%);} }

    /* ---- H1 ---- */
    h1 {
      font-family:'DM Serif Display',serif;
      font-size:clamp(46px,6vw,76px);
      font-style:italic; letter-spacing:-1.5px; line-height:1.0;
      color:var(--text-1);
    }
    .accent {
      background:linear-gradient(135deg, var(--primary) 0%, var(--secondary) 50%, var(--tertiary) 100%);
      background-size:200% 200%;
      -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      background-clip:text;
      animation:accentShift 4s ease-in-out infinite alternate;
    }
    @keyframes accentShift {
      0%   { background-position: 0% 50%; }
      100% { background-position: 100% 50%; }
    }

    .tagline { font-size:16px; line-height:1.72; color:var(--text-2); max-width:390px; }

    /* ---- CTA ---- */
    .cta-group { display:flex; flex-direction:column; gap:12px; }
    .btn-primary {
      display:inline-flex; align-items:center; gap:9px;
      width:fit-content; padding:14px 28px; border-radius:var(--r);
      background:linear-gradient(135deg, var(--primary), var(--secondary));
      color:#fff; font-size:15px; font-weight:700;
      font-family:'Plus Jakarta Sans',sans-serif;
      text-decoration:none; letter-spacing:.1px;
      transition:transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s;
      box-shadow:0 8px 28px var(--primary-glow), 0 2px 6px rgba(0,0,0,.10);
      position:relative; overflow:hidden;
    }
    /* Anillo de pulso */
    .btn-primary::before {
      content:''; position:absolute; inset:-2px; border-radius:calc(var(--r) + 2px);
      border:2px solid rgba(253,41,123,.4);
      animation:btnPulse 2.5s ease-out infinite; opacity:0;
    }
    /* Shine sweep */
    .btn-primary::after {
      content:''; position:absolute; inset:0;
      background:linear-gradient(105deg, transparent 35%, rgba(255,255,255,.28) 50%, transparent 65%);
      transform:translateX(-100%); transition:transform .5s ease;
    }
    .btn-primary:hover { transform:translateY(-3px); box-shadow:0 18px 44px var(--primary-glow), 0 4px 12px rgba(0,0,0,.12); }
    .btn-primary:hover::after { transform:translateX(200%); }
    .btn-primary:active { transform:translateY(-1px) scale(.99); }
    @keyframes btnPulse {
      0%   { transform:scale(1);   opacity:.6; }
      100% { transform:scale(1.18); opacity:0; }
    }
    .btn-disabled {
      display:inline-flex; align-items:center; gap:9px;
      width:fit-content; padding:14px 28px; border-radius:var(--r);
      background:var(--surface2); border:1.5px solid var(--border);
      color:var(--text-3); font-size:15px; font-weight:600; cursor:not-allowed;
    }
    .url-hint { font-size:12px; color:var(--text-3); display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
    .url-hint a { font-family:'SF Mono','Cascadia Code','Fira Code',monospace; font-size:11.5px; color:var(--primary); text-decoration:none; font-weight:600; transition:opacity .2s; }
    .url-hint a:hover { opacity:.7; }

    /* ---- Meta row ---- */
    .meta-row {
      display:flex; align-items:center; gap:18px;
      padding:16px 20px; background:var(--surface);
      border:1px solid var(--border); border-radius:var(--r-lg);
      width:fit-content; box-shadow:0 2px 10px rgba(0,0,0,0.05);
      position:relative; overflow:hidden;
    }
    .meta-row::before {
      content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
      background:linear-gradient(180deg, var(--primary), var(--secondary));
      border-radius:0 2px 2px 0;
    }
    .meta-item { display:flex; flex-direction:column; gap:3px; }
    .meta-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:var(--text-3); }
    .meta-val { font-size:14px; font-weight:800; color:var(--text-1); }
    .meta-sep { width:1px; height:26px; background:var(--border); }

    /* ---- QR panel con borde rotativo ---- */
    .qr-panel { width:100%; max-width:340px; }
    .qr-border {
      padding:2px; border-radius:var(--r-xl);
      background:conic-gradient(from var(--angle), var(--primary), var(--secondary), var(--tertiary), var(--primary));
      animation:rotateBorder 4s linear infinite;
      box-shadow:0 0 40px rgba(253,41,123,.12);
    }
    @keyframes rotateBorder { to { --angle: 360deg; } }
    .qr-inner {
      background:var(--surface); border-radius:calc(var(--r-xl) - 2px);
      padding:28px 24px;
      display:flex; flex-direction:column; align-items:center; gap:20px;
    }
    .qr-header { display:flex; flex-direction:column; align-items:center; gap:3px; }
    .qr-title { font-size:13px; font-weight:700; color:var(--text-1); }
    .qr-sub   { font-size:11.5px; color:var(--text-3); }
    .qr-img-wrap { position:relative; }
    .qr-glow {
      position:absolute; inset:-12px; border-radius:22px;
      background:linear-gradient(135deg, rgba(253,41,123,.22), rgba(255,101,91,.18));
      filter:blur(18px);
      animation:glowPulse 3s ease-in-out infinite;
    }
    @keyframes glowPulse { 0%,100%{opacity:.45;transform:scale(1);} 50%{opacity:.9;transform:scale(1.04);} }
    .qr-bg { position:relative; z-index:1; background:#fff; border-radius:14px; padding:16px; border:1px solid var(--border); }
    .qr-bg svg { display:block; border-radius:4px; }
    .qr-empty {
      position:relative; z-index:1; width:220px; height:220px;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
      background:var(--surface2); border-radius:14px; border:1.5px dashed rgba(253,41,123,.2);
    }
    .qr-empty p { font-size:11.5px; color:var(--text-3); text-align:center; line-height:1.6; }
    .qr-empty code { font-family:'SF Mono','Cascadia Code','Fira Code',monospace; font-size:11px; color:var(--primary); }
    .url-bar {
      display:flex; align-items:center; gap:8px; width:100%;
      padding:9px 13px; background:var(--surface2);
      border:1px solid var(--border); border-radius:10px;
    }
    .url-bar-icon { flex-shrink:0; color:var(--text-3); }
    .url-bar-text { font-family:'SF Mono','Cascadia Code','Fira Code',monospace; font-size:11px; color:var(--text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

    /* ---- Separador degradado ---- */
    .section-divider {
      height:1px; width:100%;
      background:linear-gradient(90deg, transparent 0%, rgba(253,41,123,.22) 30%, rgba(255,101,91,.18) 70%, transparent 100%);
      margin:0;
    }

    /* ---- Sección heading con tag ---- */
    .section-head { display:flex; flex-direction:column; gap:10px; margin-bottom:32px; }
    .section-tag {
      display:inline-flex; align-items:center; gap:6px;
      font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;
      color:var(--primary);
    }
    .section-tag::before { content:''; width:20px; height:1.5px; background:linear-gradient(90deg,var(--primary),var(--secondary)); }
    .section-title {
      font-family:'DM Serif Display',serif;
      font-size:clamp(24px,3vw,32px); font-style:italic; letter-spacing:-.3px;
      background:linear-gradient(135deg,var(--text-1) 0%,rgba(26,26,40,.65) 100%);
      -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    }

    /* ---- Features ---- */
    .features-section { padding:64px 0; }
    .features-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
    .feature-card {
      background:var(--surface); border:1px solid var(--border);
      border-radius:var(--r-lg); padding:26px 22px;
      display:flex; flex-direction:column; gap:14px;
      position:relative; overflow:hidden;
      transition:border-color .3s, transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s;
      box-shadow:0 1px 4px rgba(0,0,0,0.04);
    }
    /* Barra izquierda de acento */
    .feature-card::before {
      content:''; position:absolute; left:0; top:16px; bottom:16px; width:2.5px;
      border-radius:0 2px 2px 0;
      background:linear-gradient(180deg, var(--primary), var(--secondary));
      opacity:0; transform:scaleY(.5); transition:opacity .3s, transform .3s;
    }
    /* Shine sweep */
    .feature-card::after {
      content:''; position:absolute; inset:0;
      background:linear-gradient(105deg, transparent 30%, rgba(253,41,123,.06) 50%, transparent 70%);
      transform:translateX(-100%); transition:transform .55s ease;
    }
    .feature-card:hover {
      border-color:rgba(253,41,123,.20);
      transform:translateY(-4px);
      box-shadow:0 12px 32px rgba(253,41,123,.09), 0 2px 8px rgba(0,0,0,.04);
    }
    .feature-card:hover::before { opacity:1; transform:scaleY(1); }
    .feature-card:hover::after  { transform:translateX(200%); }
    .feat-icon {
      width:40px; height:40px; border-radius:12px;
      display:flex; align-items:center; justify-content:center;
      position:relative; z-index:1;
      transition:transform .3s cubic-bezier(.16,1,.3,1);
    }
    .feature-card:hover .feat-icon { transform:scale(1.1) rotate(-3deg); }
    .fc-explore .feat-icon { background:rgba(253,41,123,.10); }
    .fc-match   .feat-icon { background:rgba(255,101,91,.10); }
    .fc-chat    .feat-icon { background:rgba(253,41,123,.08); }
    .fc-video   .feat-icon { background:rgba(255,140,66,.10); }
    .feature-card h3 { font-size:13.5px; font-weight:700; color:var(--text-1); position:relative; z-index:1; transition:color .2s; }
    .feature-card:hover h3 { color:var(--primary); }
    .feature-card p  { font-size:12.5px; line-height:1.65; color:var(--text-2); position:relative; z-index:1; }

    /* ---- Steps ---- */
    .steps-section { padding:64px 0; }
    .steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
    .step-card {
      background:var(--surface); border:1px solid var(--border);
      border-radius:var(--r-lg); padding:24px 20px;
      display:flex; flex-direction:column; gap:13px;
      position:relative; overflow:hidden;
      transition:border-color .3s, transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s;
      box-shadow:0 1px 4px rgba(0,0,0,0.04);
    }
    .step-card::after {
      content:''; position:absolute; inset:0;
      background:linear-gradient(105deg, transparent 30%, rgba(253,41,123,.05) 50%, transparent 70%);
      transform:translateX(-100%); transition:transform .55s ease;
    }
    .step-card:hover { border-color:rgba(253,41,123,.20); transform:translateY(-4px); box-shadow:0 12px 32px rgba(253,41,123,.09); }
    .step-card:hover::after { transform:translateX(200%); }
    .step-num {
      width:34px; height:34px; border-radius:10px;
      background:linear-gradient(135deg, var(--primary), var(--secondary));
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:800; color:#fff;
      flex-shrink:0; position:relative; z-index:1;
      box-shadow:0 4px 12px rgba(253,41,123,.25);
      transition:transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s;
    }
    .step-card:hover .step-num { transform:scale(1.12) rotate(-4deg); box-shadow:0 6px 18px rgba(253,41,123,.35); }
    .step-body { position:relative; z-index:1; }
    .step-body h3 { font-size:13px; font-weight:700; color:var(--text-1); letter-spacing:-.15px; margin-bottom:8px; transition:color .2s; }
    .step-card:hover .step-body h3 { color:var(--primary); }
    .step-body p  { font-size:12.5px; line-height:1.65; color:var(--text-2); }
    .step-body strong { color:var(--text-1); font-weight:700; }

    /* ---- Footer ---- */
    .footer-wrap {
      position:relative;
      border-top:0;
    }
    .footer-wrap::before {
      content:''; display:block; height:1px;
      background:linear-gradient(90deg, transparent, rgba(253,41,123,.22), rgba(255,101,91,.18), transparent);
    }
    footer {
      display:flex; align-items:center; justify-content:space-between;
      padding:20px 0 32px;
    }
    .footer-left { display:flex; flex-direction:column; gap:6px; }
    .footer-brand { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-3); }
    .footer-links { display:flex; align-items:center; gap:8px; font-size:12px; }
    .footer-links a { color:var(--text-3); text-decoration:none; transition:color .2s; font-weight:500; }
    .footer-links a:hover { color:var(--primary); }
    .footer-links span { color:var(--text-3); opacity:.4; }
    .footer-right { font-family:'SF Mono','Cascadia Code','Fira Code',monospace; font-size:11px; color:var(--text-3); }

    /* ---- Animaciones ---- */
    @keyframes slideUp {
      from { opacity:0; transform:translateY(24px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* ---- Responsive ---- */
    @media (max-width:960px) {
      .hero { grid-template-columns:1fr; min-height:auto; gap:44px; padding:40px 0 56px; }
      .hero-right { order:-1; }
      .qr-panel { max-width:300px; }
      .features-grid { grid-template-columns:1fr 1fr; }
      .steps-grid { grid-template-columns:1fr 1fr; }
    }
    @media (max-width:600px) {
      .wrap { padding:0 18px; }
      nav { padding-left:18px; padding-right:18px; }
      h1 { letter-spacing:-.5px; }
      .features-grid { grid-template-columns:1fr; }
      .steps-grid { grid-template-columns:1fr; }
      .meta-row { flex-wrap:wrap; }
      footer { flex-direction:column; align-items:flex-start; gap:14px; }
    }
    @media (prefers-reduced-motion:reduce) {
      *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
    }
  </style>
</head>
<body>

  <!-- Textura de ruido -->
  <div class="noise" aria-hidden="true"></div>

  <!-- Orbs de fondo animados -->
  <div class="canvas" aria-hidden="true">
    <div class="orb orb-a" id="orb-a"></div>
    <div class="orb orb-b" id="orb-b"></div>
    <div class="orb orb-c"></div>
    <div class="orb orb-d"></div>
    <div class="orb orb-e"></div>
    <div class="heart h1"><svg width="10" height="10" viewBox="0 0 18 18" fill="none"><path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="#FD297B"/></svg></div>
    <div class="heart h2"><svg width="8"  height="8"  viewBox="0 0 18 18" fill="none"><path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="#FF655B"/></svg></div>
    <div class="heart h3"><svg width="12" height="12" viewBox="0 0 18 18" fill="none"><path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="#FD297B"/></svg></div>
    <div class="heart h4"><svg width="9"  height="9"  viewBox="0 0 18 18" fill="none"><path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="#FF655B"/></svg></div>
    <div class="heart h5"><svg width="11" height="11" viewBox="0 0 18 18" fill="none"><path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="#FD297B"/></svg></div>
    <div class="heart h6"><svg width="7"  height="7"  viewBox="0 0 18 18" fill="none"><path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="#FF8C42"/></svg></div>
    <div class="heart h7"><svg width="9"  height="9"  viewBox="0 0 18 18" fill="none"><path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="#FD297B"/></svg></div>
  </div>

  <!-- Nav sticky glass -->
  <div class="nav-wrap">
    <nav>
      <div class="brand">
        <div class="brand-mark">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="white" opacity=".95"/>
          </svg>
        </div>
        <span class="brand-name">Debuta</span>
      </div>
      <div class="nav-right">
        <a href="/eliminarcuenta" class="nav-delete">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Eliminar cuenta
        </a>
        <a href="/admin" class="nav-admin">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Admin
        </a>
        <div class="android-pill">
          <span class="live-dot"></span>
          Android
        </div>
      </div>
    </nav>
  </div>

  <div class="wrap">

    <!-- ── Hero ── -->
    <section class="hero">

      <div class="hero-left">
        <div class="eyebrow">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="6" cy="6" r="5"/><path d="M6 3v3.5l2 1"/>
          </svg>
          Disponible para Android
        </div>

        <h1>Tu próxima<br><span class="accent">historia</span><br>empieza aquí</h1>

        <p class="tagline">Encuentra personas reales cerca de ti. Conecta, habla y conócete en persona.</p>

        <div class="cta-group">
          ${apkAvailable
            ? `<a href="/download" class="btn-primary">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7.5 1v8M7.5 9 4.5 6.2M7.5 9l3-2.8M1.5 13h12"/>
                </svg>
                Descargar APK
              </a>`
            : `<span class="btn-disabled">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M7.5 1v8M7.5 9 4.5 6.2M7.5 9l3-2.8M1.5 13h12"/>
                </svg>
                APK no disponible aún
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
            <span class="meta-label">Tamaño</span>
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
              <div class="qr-header">
                <span class="qr-title">Escanea para visitar Debuta</span>
                <span class="qr-sub">Te lleva a debuta.online</span>
              </div>
              <div class="qr-img-wrap">
                <div class="qr-glow"></div><div class="qr-bg">${qrSVG}</div>
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

    <!-- Separador degradado -->
    <div class="section-divider"></div>

    <!-- ── Features ── -->
    <section class="features-section">
      <div class="section-head reveal">
        <span class="section-tag">Funciones</span>
        <span class="section-title">Todo lo que necesitas para conectar</span>
      </div>
      <div class="features-grid">
        <div class="feature-card fc-explore reveal reveal-delay-1">
          <div class="feat-icon">
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="#FD297B" opacity=".9"/>
            </svg>
          </div>
          <h3>Explora perfiles</h3>
          <p>Desliza y descubre personas cerca de ti con fotos e historias reales.</p>
        </div>
        <div class="feature-card fc-match reveal reveal-delay-2">
          <div class="feat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF655B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <h3>Haz Match</h3>
          <p>Cuando hay interés mutuo, la app te notifica al instante.</p>
        </div>
        <div class="feature-card fc-chat reveal reveal-delay-3">
          <div class="feat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FD297B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3>Chatea sin límites</h3>
          <p>Mensajes, fotos y notas de voz. Exprésate como quieras.</p>
        </div>
        <div class="feature-card fc-video reveal reveal-delay-4">
          <div class="feat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF8C42" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
          <h3>Videollamadas</h3>
          <p>Conócete cara a cara desde la app antes de verse en persona.</p>
        </div>
      </div>
    </section>

    <!-- Separador degradado -->
    <div class="section-divider"></div>

    <!-- ── Steps ── -->
    <section class="steps-section">
      <div class="section-head reveal">
        <span class="section-tag">Instalación</span>
        <span class="section-title">Cómo instalar en 4 pasos</span>
      </div>
      <div class="steps-grid">
        <div class="step-card reveal reveal-delay-1">
          <div class="step-num">1</div>
          <div class="step-body">
            <h3>Descarga el APK</h3>
            <p>Escanea el QR o toca el botón de descarga. El archivo llegará a tus descargas.</p>
          </div>
        </div>
        <div class="step-card reveal reveal-delay-2">
          <div class="step-num">2</div>
          <div class="step-body">
            <h3>Activa fuentes externas</h3>
            <p>Ve a <strong>Ajustes &rarr; Seguridad</strong> y activa <strong>Instalar apps desconocidas</strong>.</p>
          </div>
        </div>
        <div class="step-card reveal reveal-delay-3">
          <div class="step-num">3</div>
          <div class="step-body">
            <h3>Instala la app</h3>
            <p>Abre el APK desde tus notificaciones o descargas y toca <strong>Instalar</strong>.</p>
          </div>
        </div>
        <div class="step-card reveal reveal-delay-4">
          <div class="step-num">4</div>
          <div class="step-body">
            <h3>Crea tu cuenta</h3>
            <p>Regístrate en <strong>Debuta</strong> y empieza a encontrar tu persona especial.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <div class="footer-wrap">
      <footer>
        <div class="footer-left">
          <div class="footer-brand">
            <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
              <path d="M9 15.5S2 11 2 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6.5c0 4.5-7 9-7 9z" fill="currentColor" opacity=".5"/>
            </svg>
            ${BASE_URL ? 'Disponible en ' + BASE_URL : 'Solo disponible en tu red WiFi'}
          </div>
          <div class="footer-links">
            <a href="/privacidad">Política de Privacidad</a>
            <span>·</span>
            <a href="/eliminarcuenta">Eliminar cuenta</a>
          </div>
        </div>
        <div class="footer-right">${BASE_URL || localIP + ':' + PORT}</div>
      </footer>
    </div>

  </div>

  <script>
    /* ---- Scroll reveal ---- */
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    /* ---- Parallax suave de orbs con el mouse ---- */
    let ticking = false;
    document.addEventListener('mousemove', (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const cx = (e.clientX / window.innerWidth  - 0.5) * 2;
        const cy = (e.clientY / window.innerHeight - 0.5) * 2;
        const a = document.getElementById('orb-a');
        const b = document.getElementById('orb-b');
        if (a) a.style.transform = \`translate(\${cx * 18}px, \${cy * 14}px)\`;
        if (b) b.style.transform = \`translate(\${cx * -12}px, \${cy * -9}px)\`;
        ticking = false;
      });
    });
  </script>

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
