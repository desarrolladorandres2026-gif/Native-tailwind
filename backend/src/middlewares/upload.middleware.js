/**
 * upload.middleware.js
 * Middleware Multer que guarda los archivos en memoria (como Buffer)
 * para luego pasarlos a Cloudinary sin tocar el disco.
 *
 * Límites:
 *   - Tamaño máximo por archivo: 10 MB
 *   - Solo imágenes (jpeg, png, webp, heic)
 */

const multer = require('multer');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_SIZE_MB  = 10;

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

// ── Upload de UN solo archivo (campo "photo") ─────────────────────────────────
const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
}).single('photo');

// ── Upload de MÚLTIPLES archivos (campo "photos", máx 6) ─────────────────────
const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
}).array('photos', 6);

// ── Wrapper que convierte errores de Multer en respuestas JSON ────────────────
const wrapMulter = (fn) => (req, res, next) => {
  fn(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Error de carga: ${err.message}` });
    }
    return res.status(400).json({ message: err.message || 'Error al procesar el archivo' });
  });
};

module.exports = {
  uploadSingle:   wrapMulter(uploadSingle),
  uploadMultiple: wrapMulter(uploadMultiple),
};
