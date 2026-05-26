/**
 * cloudinary.js
 * Helper para subir, eliminar y obtener URLs de imágenes en Cloudinary.
 * Usa las variables de entorno CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
 * CLOUDINARY_API_SECRET definidas en .env
 */

const cloudinary = require('cloudinary').v2;

// ── Configuración automática desde .env ───────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ── Subir imagen desde buffer (Multer memoryStorage) ─────────────────────────
/**
 * @param {Buffer} buffer  — buffer del archivo
 * @param {object} options — opciones de Cloudinary (folder, transformation, etc.)
 * @returns {Promise<{ url: string, public_id: string }>}
 */
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? 'debuta/general',
        transformation: options.transformation,
        resource_type: 'image',
        timeout: 60000, // 60s máximo por upload
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

// ── Subir imagen de perfil ────────────────────────────────────────────────────
/**
 * @param {Buffer} buffer
 * @param {string} userId
 */
const uploadProfilePicture = (buffer, userId) =>
  uploadBuffer(buffer, {
    folder: `debuta/profiles/${userId}`,
    public_id: 'avatar',
    overwrite: true,
    transformation: [{ width: 600, height: 600, crop: 'fill', gravity: 'face', quality: 'auto:low' }],
  });

// ── Subir foto de galería ─────────────────────────────────────────────────────
/**
 * @param {Buffer} buffer
 * @param {string} userId
 */
const uploadGalleryPhoto = (buffer, userId) =>
  uploadBuffer(buffer, {
    folder: `debuta/profiles/${userId}/gallery`,
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:low' }],
  });

// ── Subir foto de portada (cover photo 16:9) ────────────────────────────────
/**
 * @param {Buffer} buffer
 * @param {string} userId
 */
const uploadCoverPhoto = (buffer, userId) =>
  uploadBuffer(buffer, {
    folder: `debuta/profiles/${userId}`,
    public_id: 'cover',
    overwrite: true,
    transformation: [{ width: 1200, height: 450, crop: 'fill', gravity: 'auto', quality: 'auto:low' }],
  });

// ── Subir imagen de publicación (muro) ───────────────────────────────────────
/**
 * @param {Buffer} buffer
 * @param {string} userId
 */
const uploadPostImage = (buffer, userId) =>
  uploadBuffer(buffer, {
    folder: `debuta/posts/${userId}`,
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
  });

// ── Subir imagen desde base64 string ─────────────────────────────────────────
/**
 * @param {string} base64 — string base64 de la imagen (con o sin prefijo data:image/...)
 * @param {string} folder — carpeta en Cloudinary (ej: 'restaurantes/userId')
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
const uploadImage = async (base64, folder = 'debuta/general') => {
  const dataUri = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto:low' }],
    timeout: 60000,
  });
  return result;
};

// ── Eliminar imagen por public_id ─────────────────────────────────────────────
/**
 * @param {string} publicId
 */
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('cloudinary.deleteImage:', err.message);
  }
};

module.exports = {
  cloudinary,
  uploadBuffer,
  uploadProfilePicture,
  uploadGalleryPhoto,
  uploadCoverPhoto,
  uploadPostImage,
  uploadImage,
  deleteImage,
};
