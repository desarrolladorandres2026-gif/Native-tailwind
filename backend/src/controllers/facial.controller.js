/**
 * facial_controller.js
 *
 * POST /api/facial/verify        → público, verifica que hay rostro en base64
 * POST /api/facial/register      → público con userId en body, guarda foto en registro
 * POST /api/facial/login-verify  → público, compara rostro enviado con el guardado
 */

const Usuario = require('../models/usuario.model');
const { uploadProfilePicture } = require('../helpers/cloudinary');
const { detectFace, getFaceDescriptor, compareFaces } = require('../helpers/faceRecognition');

// ── Helpers ───────────────────────────────────────────────────────────────────

const esBase64Valido = (str) => {
  if (!str || typeof str !== 'string') return false;
  const raw = str.startsWith('data:') ? str.split(',')[1] : str;
  if (!raw || raw.length < 1000) return false;
  return /^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''));
};

const rawBase64 = (str) =>
  str.startsWith('data:') ? str.split(',')[1] : str;

// ── POST /api/facial/verify ───────────────────────────────────────────────────
// Body: { image: string }  ← base64 con o sin prefijo
const verificarRostro = async (req, res) => {
  try {
    const { image } = req.body;

    if (!esBase64Valido(image)) {
      return res.status(400).json({
        ok: false,
        message: 'Imagen inválida. Envía un base64 de al menos 1 KB.',
      });
    }

    const hasFace = await detectFace(image);

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
// Body: { image: string, userId?: string }
const guardarFotoFacial = async (req, res) => {
  try {
    const { image, userId } = req.body;

    if (!esBase64Valido(image)) {
      return res.status(400).json({
        ok: false,
        message: 'Imagen requerida en base64 (mín. 1 KB)',
      });
    }

    const base64Data = rawBase64(image);
    if (base64Data.length > 14_000_000) {
      return res.status(400).json({
        ok: false,
        message: 'La imagen es demasiado grande. Máximo 10 MB.',
      });
    }

    const uid = req.usuario?._id || userId;
    if (!uid) {
      return res.status(400).json({
        ok: false,
        message: 'Se requiere userId o token de autenticación',
      });
    }

    // Detectar rostro ANTES de subir a Cloudinary
    const hasFace = await detectFace(image);
    if (!hasFace) {
      return res.status(422).json({
        ok: false,
        message: 'No se detectó un rostro en la imagen. Asegúrate de que tu cara esté bien iluminada y centrada.',
      });
    }

    // Extraer descriptor facial para comparaciones futuras
    const descriptor = await getFaceDescriptor(image);
    if (!descriptor) {
      return res.status(422).json({
        ok: false,
        message: 'No se pudo procesar el rostro. Intenta con mejor iluminación.',
      });
    }

    // Subir a Cloudinary
    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`[facial] Subiendo foto para usuario ${uid} (${buffer.length} bytes)`);

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
        faceDescriptor: descriptor,
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

    // Seleccionar faceDescriptor explícitamente (tiene select: false)
    const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() })
      .select('+faceDescriptor');

    if (!usuario) {
      return res.json({ ok: false, message: 'No se pudo verificar el rostro' });
    }

    // Sin foto facial registrada → acceso permitido
    if (!usuario.profile_picture || !usuario.faceDescriptor?.length) {
      return res.json({
        ok: true,
        message: 'Usuario sin foto facial registrada, acceso permitido',
        hasFacialPhoto: false,
      });
    }

    // Extraer descriptor del rostro entrante
    const incomingDescriptor = await getFaceDescriptor(image);
    if (!incomingDescriptor) {
      return res.json({
        ok: false,
        message: 'No se detectó un rostro en la imagen enviada. Asegúrate de buena iluminación.',
      });
    }

    // Comparar descriptores
    const { match, distance } = compareFaces(usuario.faceDescriptor, incomingDescriptor);
    console.log(`[facial] Login ${correo} → distancia=${distance.toFixed(3)}, match=${match}`);

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
