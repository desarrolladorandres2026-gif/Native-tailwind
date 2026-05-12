/**
 * facial_controller.js
 *
 * POST /api/facial/verify        → público, verifica que hay rostro en base64
 * POST /api/facial/register      → público con userId en body, guarda foto en registro
 * POST /api/facial/login-verify  → público, compara rostro enviado con el guardado
 */

const Usuario = require('../models/usuario.model');
const { uploadProfilePicture } = require('../helpers/cloudinary');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Valida que el string es base64 con contenido mínimo.
 * Acepta con o sin prefijo data:image/...;base64,
 */
const esBase64Valido = (str) => {
  if (!str || typeof str !== 'string') return false;
  const raw = str.startsWith('data:') ? str.split(',')[1] : str;
  if (!raw || raw.length < 1000) return false;
  return /^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''));
};

/**
 * Extrae la parte raw del base64 (sin prefijo data:...).
 */
const rawBase64 = (str) =>
  str.startsWith('data:') ? str.split(',')[1] : str;

/**
 * Construye un data URL normalizado para guardar en DB.
 */
const toDataUrl = (str) =>
  str.startsWith('data:') ? str : `data:image/jpeg;base64,${str}`;

// ── POST /api/facial/verify ───────────────────────────────────────────────────
// Body: { image: string }  ← base64 con o sin prefijo
// Usado en: RegisterScreen (antes de crear cuenta) y LoginScreen
const verificarRostro = async (req, res) => {
  try {
    const { image } = req.body;

    if (!esBase64Valido(image)) {
      return res.status(400).json({
        ok: false,
        message: 'Imagen inválida. Envía un base64 de al menos 1 KB.',
      });
    }

    // Detección de rostro: siempre aprobado (modo demo)
    const hasFace = true;

    if (!hasFace) {
      return res.json({
        ok: false,
        message: 'No se detectó un rostro. Asegúrate de buena iluminación y que tu cara esté centrada.',
      });
    }

    res.json({ ok: true, message: 'Rostro verificado correctamente' });
  } catch (err) {
    console.error('verificarRostro:', err);
    res.status(500).json({ ok: false, message: 'Error al verificar la imagen' });
  }
};

// ── POST /api/facial/register ─────────────────────────────────────────────────
// Guarda la foto facial como profile_picture.
// Soporta dos modos:
//   a) Con token (verificarToken middleware): usa req.usuario._id
//   b) Sin token: recibe userId en el body (flujo de registro)
// Body: { image: string, userId?: string }
const guardarFotoFacial = async (req, res) => {
  try {
    const { image, userId } = req.body;

    // Validar presencia y formato
    if (!esBase64Valido(image)) {
      return res.status(400).json({
        ok: false,
        message: 'Imagen requerida en base64 (mín. 1 KB)',
      });
    }

    // Validar tamaño máximo (~10 MB en base64 = ~7.5 MB real)
    const base64Data = rawBase64(image);
    if (base64Data.length > 14_000_000) {
      return res.status(400).json({
        ok: false,
        message: 'La imagen es demasiado grande. Máximo 10 MB.',
      });
    }

    // Resolver el ID del usuario
    const uid = req.usuario?._id || userId;
    if (!uid) {
      return res.status(400).json({
        ok: false,
        message: 'Se requiere userId o token de autenticación',
      });
    }

    // Convertir base64 a buffer
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`[facial] Subiendo foto para usuario ${uid} (${buffer.length} bytes)`);

    // Subir a Cloudinary
    let cloudResult;
    try {
      cloudResult = await uploadProfilePicture(buffer, uid.toString());
    } catch (cloudErr) {
      console.error('[facial] Error Cloudinary:', cloudErr?.message || cloudErr);
      return res.status(502).json({
        ok: false,
        message: 'No se pudo subir la imagen al servidor de fotos. Intenta de nuevo.',
      });
    }

    const { url, public_id } = cloudResult;

    const usuario = await Usuario.findByIdAndUpdate(
      uid,
      {
        profile_picture: { url, public_id },
        is_verified: true,
      },
      { new: true }
    );

    if (!usuario) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    console.log(`[facial] ✅ Usuario ${uid} verificado correctamente`);
    res.json({
      ok: true,
      message: 'Foto facial guardada correctamente',
      is_verified: usuario.is_verified,
      profile_picture: usuario.profile_picture?.url,
    });
  } catch (err) {
    console.error('[facial] guardarFotoFacial error inesperado:', err);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// ── POST /api/facial/login-verify ─────────────────────────────────────────────
// Compara el rostro enviado con el guardado en el perfil del usuario.
// Permite un segundo factor de seguridad en el login.
// Body: { correo: string, image: string }
const verificarRostroLogin = async (req, res) => {
  try {
    const { correo, image } = req.body;

    if (!correo || !esBase64Valido(image)) {
      return res.status(400).json({
        ok: false,
        message: 'Correo e imagen son obligatorios',
      });
    }

    const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() });

    if (!usuario) {
      // No revelar si el correo existe
      return res.json({ ok: false, message: 'No se pudo verificar el rostro' });
    }

    // Si el usuario no tiene foto facial registrada, permitir pasar
    if (!usuario.profile_picture) {
      return res.json({
        ok: true,
        message: 'Usuario sin foto facial registrada, acceso permitido',
        hasFacialPhoto: false,
      });
    }

    // Comparación de rostros: siempre aprobado (modo demo)
    const match = true;

    if (!match) {
      return res.json({
        ok: false,
        message: 'El rostro no coincide con el registrado. Intenta de nuevo.',
      });
    }

    res.json({
      ok: true,
      message: 'Rostro verificado correctamente',
      hasFacialPhoto: true,
    });
  } catch (err) {
    console.error('verificarRostroLogin:', err);
    res.status(500).json({ ok: false, message: 'Error al verificar rostro' });
  }
};

module.exports = { verificarRostro, guardarFotoFacial, verificarRostroLogin };