const express = require('express');
const cors    = require('cors');
const path    = require('path');
const app     = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS bloqueado: ${origin}`));
    },
    credentials: true,
  }));
} else {
  app.use(cors());
}

// Límite aumentado para múltiples fotos (Cloudinary uploads vía multipart)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ─── Panel de Administración (archivos estáticos) ─────────────────────────────
const adminDir = path.join(__dirname, '../../admin');
app.use('/admin', express.static(adminDir));
app.get('/admin', (_, res) => res.sendFile(path.join(adminDir, 'index.html')));
app.get('/admin/*', (_, res) => res.sendFile(path.join(adminDir, 'index.html')));

// ─── Rutas existentes ─────────────────────────────────────────────────────────
app.use('/api',          require('./routes/auth.routes'));
app.use('/api/users',    require('./routes/user.routes'));
app.use('/api/matches',  require('./routes/match.routes'));
app.use('/api/chat',     require('./routes/chat.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

// ─── Rutas nuevas ─────────────────────────────────────────────────────────────
app.use('/api/likes',    require('./routes/likes.routes'));    // Quién me dio like
app.use('/api/report',   require('./routes/report.routes'));   // Reportar usuario
app.use('/api/facial',   require('./routes/facial.routes'));   // Reconocimiento facial
app.use('/api/posts',    require('./routes/post.routes'));     // Muro de publicaciones
app.use('/api/admin',    require('./routes/admin.routes'));    // Administrador
app.use('/api/asociado', require('./routes/asociado.routes')); // Asociado / Restaurante
app.use('/api/auth',     require('./routes/social.routes'));   // Auth social Google/Facebook
app.use('/api/password', require('./routes/password.routes')); // Recuperación de contraseña
app.use('/api/soporte', require('./routes/soporte.routes'));   // Tickets de soporte

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

module.exports = app;