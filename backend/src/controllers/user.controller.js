/**
 * user_controller.js
 * Gestión de perfil de usuario con soporte Cloudinary para:
 *  - Foto de perfil principal
 *  - Galería de fotos (hasta 6)
 *  - Ubicación GPS / manual
 *  - Stats reales (matches, likes)
 */

const mongoose = require('mongoose');
const Usuario = require('../models/usuario.model');
const Match = require('../models/match.model');
const { serializarUsuario } = require('../helpers/serializer');
const {
  uploadProfilePicture,
  uploadCoverPhoto,
  uploadGalleryPhoto,
  deleteImage,
} = require('../helpers/cloudinary');
const { enviarCodigoVerificacionRegistro } = require('../helpers/mailer');

// Almacén temporal en memoria para códigos de verificación de correo
// key: correo, value: { code, expiresAt, intentos, verified }
const verificationCodes = new Map();

// ── POST /api/users/send-verification-code ────────────────────────────────────
const enviarCodigoVerif = async (req, res) => {
  try {
    const { correo, nombre } = req.body;
    if (!correo) return res.status(400).json({ message: 'El correo es obligatorio' });

    const correoNorm = correo.trim().toLowerCase();

    if (await Usuario.findOne({ correo: correoNorm })) {
      return res.status(400).json({ message: 'Este correo ya está registrado' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

    verificationCodes.set(correoNorm, { code, expiresAt, intentos: 0, verified: false });

    await enviarCodigoVerificacionRegistro(correoNorm, nombre?.trim() || 'Usuario', code);

    res.json({ message: 'Código enviado correctamente' });
  } catch (err) {
    console.error('enviarCodigoVerif:', err);
    res.status(500).json({ message: 'Error al enviar el código de verificación' });
  }
};

// ── POST /api/users/verify-email-code ─────────────────────────────────────────
const verificarCodigoEmail = async (req, res) => {
  try {
    const { correo, codigo } = req.body;
    if (!correo || !codigo) {
      return res.status(400).json({ message: 'Correo y código son obligatorios' });
    }

    const correoNorm = correo.trim().toLowerCase();
    const entry = verificationCodes.get(correoNorm);

    if (!entry) {
      return res.status(400).json({ message: 'No hay un código activo para este correo. Solicita uno nuevo.' });
    }

    if (Date.now() > entry.expiresAt) {
      verificationCodes.delete(correoNorm);
      return res.status(400).json({ message: 'El código ha expirado. Solicita uno nuevo.' });
    }

    entry.intentos += 1;
    if (entry.intentos > 5) {
      verificationCodes.delete(correoNorm);
      return res.status(429).json({ message: 'Demasiados intentos fallidos. Solicita un nuevo código.' });
    }

    if (entry.code !== codigo.trim()) {
      return res.status(400).json({ message: 'Código incorrecto. Verifica e intenta de nuevo.' });
    }

    entry.verified = true;
    verificationCodes.set(correoNorm, entry);

    res.json({ message: 'Correo verificado correctamente' });
  } catch (err) {
    console.error('verificarCodigoEmail:', err);
    res.status(500).json({ message: 'Error al verificar el código' });
  }
};

// ── POST /api/users/register ──────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const {
      nombre, apellido, correo, telefono, password,
      genero, fechaNacimiento, ciudad, pais, bio, intereses,
      buscando, facePhoto,
    } = req.body;

    const errores = [];
    if (!nombre) errores.push('El nombre es obligatorio');
    if (!correo) errores.push('El correo es obligatorio');
    if (!telefono) errores.push('El teléfono es obligatorio');
    if (!password || password.length < 6)
      errores.push('La contraseña debe tener mínimo 6 caracteres');
    if (!genero) errores.push('El género es obligatorio');
    if (!fechaNacimiento) errores.push('La fecha de nacimiento es obligatoria');

    if (errores.length) return res.status(400).json({ errores });

    const correoNorm = correo.trim().toLowerCase();
    if (await Usuario.findOne({ correo: correoNorm })) {
      return res.status(400).json({ errores: ['Este correo ya está registrado'] });
    }

    const codeEntry = verificationCodes.get(correoNorm);
    if (!codeEntry || !codeEntry.verified) {
      return res.status(400).json({ errores: ['El correo no ha sido verificado. Por favor verifica tu correo antes de continuar.'] });
    }
    verificationCodes.delete(correoNorm);

    const usernameBase = nombre.trim().toLowerCase().replace(/\s+/g, '_');
    let username;
    for (let intentos = 0; intentos < 5; intentos++) {
      const suffix = Math.floor(Math.random() * 90000) + 10000;
      const candidato = `${usernameBase}${suffix}`;
      if (!(await Usuario.exists({ username: candidato }))) {
        username = candidato;
        break;
      }
    }
    if (!username) {
      return res.status(500).json({ message: 'No se pudo generar un username único. Intenta de nuevo.' });
    }

    // Normalizar intereses: el frontend puede enviar strings o {name, icon}
    const interesesNorm = (intereses ?? []).map((i) =>
      typeof i === 'string' ? { name: i, icon: '' } : i
    );

    // Crear usuario primero para obtener el ID
    const usuario = await Usuario.create({
      first_name: nombre.trim(),
      last_name: apellido?.trim() ?? '',
      username,
      correo: correoNorm,
      telefono,
      password,
      gender: genero,
      birth_date: new Date(fechaNacimiento),
      ciudad: ciudad?.trim() ?? '',
      pais: pais?.trim() ?? '',
      bio: bio?.trim() ?? '',
      interests: interesesNorm,
      buscando: buscando ?? '',
      is_verified: false,
    });

    // Si viene facePhoto (base64), subirla a Cloudinary como foto de perfil
    if (facePhoto && typeof facePhoto === 'string' && facePhoto.length > 1000) {
      try {
        const base64Data = facePhoto.startsWith('data:')
          ? facePhoto.split(',')[1]
          : facePhoto;
        const buffer = Buffer.from(base64Data, 'base64');
        const { url, public_id } = await uploadProfilePicture(buffer, usuario._id.toString());
        usuario.profile_picture = { url, public_id };
        usuario.is_verified = true;
        await usuario.save();
      } catch (cloudErr) {
        console.warn('register: no se pudo subir facePhoto a Cloudinary:', cloudErr.message);
      }
    }

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      usuario: serializarUsuario(usuario),
    });
  } catch (err) {
    console.error('register:', err);
    if (err.code === 11000) {
      return res.status(400).json({ errores: ['Correo o username ya registrado'] });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/users/discover ───────────────────────────────────────────────────
const discover = async (req, res) => {
  try {
    const yo = req.usuario;
    const settings = yo.settings || {};
    const { pagina = 1, limite = 10 } = req.query;

    const matchesExistentes = await Match.find({ usuarios: yo._id }).select('likes usuarios');

    const idsVistos = new Set();
    matchesExistentes.forEach(m => {
      // Si YO ya interactué (like o dislike), no lo vuelvo a ver
      const yoInteractue = (m.likes || []).some(l => l.de && l.de.equals(yo._id));
      if (yoInteractue && m.usuarios) {
        const otroId = m.usuarios.find(uid => uid && !uid.equals(yo._id));
        if (otroId) idsVistos.add(otroId.toString());
      }
    });

    const filtro = {
      _id: { $ne: yo._id, $nin: [...idsVistos].map(id => new mongoose.Types.ObjectId(id)) },
      activo: true,
      rol: 'user',
      'settings.profile_visible': { $ne: false },
    };

    if (settings.show_me && settings.show_me !== 'ALL') {
      filtro.gender = settings.show_me === 'M' ? 'masculino' : 'femenino';
    }

    const minAge = settings.min_age ?? 18;
    const maxAge = settings.max_age ?? 100;
    const hoy = new Date();
    filtro.birth_date = {
      $gte: new Date(hoy.getFullYear() - maxAge, hoy.getMonth(), hoy.getDate()),
      $lte: new Date(hoy.getFullYear() - minAge, hoy.getMonth(), hoy.getDate()),
    };

    // ── Filtro por distancia ──
    if (yo.latitude != null && yo.longitude != null && settings.max_distance) {
      // Incluir usuarios dentro del radio O usuarios que no han definido su ubicación (lat/lng null)
      filtro.$or = [
        {
          location: {
            $geoWithin: {
              $centerSphere: [
                [yo.longitude, yo.latitude],
                settings.max_distance / 6378.1 // Radio de la tierra en km
              ]
            }
          }
        },
        { latitude: null },
        { longitude: null }
      ];
    }

    // ── Filtros avanzados ──
    if (settings.verified_only) {
      filtro.is_verified = true;
    }
    if (settings.has_bio_only) {
      filtro.bio = { $ne: '', $exists: true };
    }
    if (settings.min_photos > 0) {
      // Verifica que el array de fotos tenga al menos N elementos
      filtro[`photos.${settings.min_photos - 1}`] = { $exists: true };
    }
    // Filtro por qué busca el usuario (buscando)
    if (settings.looking_for && settings.looking_for !== 'ALL' && settings.looking_for !== '') {
      filtro.buscando = settings.looking_for;
    }
    // Filtro por intereses compartidos (al menos uno de los seleccionados)
    if (settings.interests_filter && settings.interests_filter.length > 0) {
      filtro['interests.name'] = { $in: settings.interests_filter };
    }

    const usuarios = await Usuario.find(filtro)
      .select('first_name last_name username bio profile_picture photos interests gender birth_date latitude longitude is_verified ciudad pais location_label social_friend_ids buscando')
      .skip((pagina - 1) * Number(limite))
      .limit(Number(limite))
      .lean();

    // ── Calcular conexiones en común para cada perfil ──────────────────────
    const misAmigos = yo.social_friend_ids || [];
    const misIntereses = (yo.interests || []).map((i) => i.name);
    const miCiudad = (yo.ciudad || '').toLowerCase();
    const miEdad = yo.birth_date
      ? Math.floor((Date.now() - new Date(yo.birth_date)) / (365.25 * 24 * 3600 * 1000))
      : null;

    const usuariosMapped = usuarios.map(u => {
      u.id = u._id.toString();

      // Amigos FB en común
      const susAmigos = u.social_friend_ids || [];
      const susSet = new Set(susAmigos);
      const amigosFB = misAmigos.filter(id => susSet.has(id)).length;

      // Intereses en común
      const susIntereses = (u.interests || []).map(i => i.name);
      const interesesComun = misIntereses.filter(i => susIntereses.includes(i)).length;

      // Ciudad en común
      const ciudadComun = miCiudad && u.ciudad && miCiudad === u.ciudad.toLowerCase();

      // Edad similar (±5 años)
      let edadSimilar = false;
      if (miEdad !== null && u.birth_date) {
        const suEdad = Math.floor((Date.now() - new Date(u.birth_date)) / (365.25 * 24 * 3600 * 1000));
        edadSimilar = Math.abs(miEdad - suEdad) <= 5;
      }

      // Score de afinidad
      const score = amigosFB * 3 + interesesComun * 2 + (ciudadComun ? 2 : 0) + (edadSimilar ? 1 : 0);

      // Resumen para mostrar en UI
      const partes = [];
      if (amigosFB > 0) partes.push(`${amigosFB} amigo${amigosFB > 1 ? 's' : ''} en común`);
      if (interesesComun > 0) partes.push(`${interesesComun} interés${interesesComun > 1 ? 'es' : ''} en común`);
      if (ciudadComun) partes.push('misma ciudad');

      // Limpiar campos que no deben exponerse
      delete u.social_friend_ids;

      return {
        ...u,
        afinidad: {
          score,
          amigosFB,
          interesesComun,
          ciudadComun: !!ciudadComun,
          edadSimilar,
          resumen: partes.join(' · ') || null,
        },
      };
    });

    // Ordenar: más afinidad primero, luego aleatorio el resto
    usuariosMapped.sort((a, b) => b.afinidad.score - a.afinidad.score);

    res.json({ usuarios: usuariosMapped });
  } catch (err) {
    console.error('discover:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/users/me/stats ───────────────────────────────────────────────────
const obtenerStats = async (req, res) => {
  try {
    const userId = req.usuario._id;

    // Matches completados (ambos lados dieron like)
    const totalMatches = await Match.countDocuments({
      usuarios: userId,
      esMatch: true,
    });

    // Likes que yo le di a otros
    const matchesConLikes = await Match.find({ 'likes.de': userId }).select('likes');
    let likesGiven = 0;
    matchesConLikes.forEach(m => {
      m.likes.forEach(l => {
        if (l.de.equals(userId)) likesGiven++;
      });
    });

    res.json({ matches: totalMatches, likesGiven });
  } catch (err) {
    console.error('obtenerStats:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/users/:id ────────────────────────────────────────────────────────
const obtenerPerfil = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const usuario = await Usuario.findById(req.params.id)
      .select('first_name last_name username bio profile_picture photos interests gender birth_date latitude longitude is_verified ciudad pais location_label buscando');
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ usuario: usuario.toJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── PUT /api/users/profile ────────────────────────────────────────────────────
// Actualiza campos de texto / ubicación (SIN foto)
const actualizarPerfil = async (req, res) => {
  try {
    const permitidos = [
      'bio', 'interests',
      'first_name', 'last_name',
      'latitude', 'longitude',
      'ciudad', 'pais', 'location_label',
      // Nuevos campos de perfil extendido
      'job_title', 'company', 'education',
      'relationship_status', 'website', 'buscando',
      // Nuevos campos de info personal
      'religion', 'zodiac', 'smoke', 'drink',
      'languages', 'height', 'exercise',
      // Configuración y privacidad
      'settings',
    ];
    const update = {};
    permitidos.forEach(k => {
      if (req.body[k] !== undefined) {
        // Si es settings, hacemos un merge o reemplazo controlado
        if (k === 'settings' && typeof req.body[k] === 'object') {
          const currentSettings = req.usuario.settings?.toObject
            ? req.usuario.settings.toObject()
            : (req.usuario.settings || {});
          update[k] = { ...currentSettings, ...req.body[k] };
          // Manejar privacidad anidada si viene
          if (req.body[k].privacy) {
            update[k].privacy = { ...(currentSettings.privacy || {}), ...req.body[k].privacy };
          }
        } else {
          update[k] = req.body[k];
        }
      }
    });

    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario._id, update, { new: true, runValidators: true }
    );
    res.json({ message: 'Perfil actualizado', usuario: serializarUsuario(usuario) });
  } catch (err) {
    console.error('actualizarPerfil:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/users/profile/avatar ───────────────────────────────────────────
// Sube / reemplaza la foto de perfil principal en Cloudinary
const subirAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ninguna imagen' });
    }

    const usuario = await Usuario.findById(req.usuario._id);
    const oldPhoto = usuario.profile_picture;

    // Subir nueva imagen
    const { url, public_id } = await uploadProfilePicture(
      req.file.buffer,
      req.usuario._id.toString()
    );

    // Eliminar la anterior si existía (y no es la misma)
    if (oldPhoto?.public_id && oldPhoto.public_id !== public_id) {
      await deleteImage(oldPhoto.public_id);
    }

    usuario.profile_picture = { url, public_id };
    await usuario.save();

    res.json({
      message: 'Foto de perfil actualizada',
      profile_picture: { url, public_id },
      usuario: serializarUsuario(usuario),
    });
  } catch (err) {
    console.error('subirAvatar:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/users/profile/cover ────────────────────────────────────────────────
// Sube / reemplaza la foto de portada
const subirCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ninguna imagen' });
    }

    const usuario = await Usuario.findById(req.usuario._id);
    const oldCover = usuario.cover_photo;

    const { url, public_id } = await uploadCoverPhoto(
      req.file.buffer,
      req.usuario._id.toString()
    );

    if (oldCover?.public_id && oldCover.public_id !== public_id) {
      await deleteImage(oldCover.public_id);
    }

    usuario.cover_photo = { url, public_id };
    await usuario.save();

    res.json({
      message: 'Foto de portada actualizada',
      cover_photo: { url, public_id },
      usuario: serializarUsuario(usuario),
    });
  } catch (err) {
    console.error('subirCoverPhoto:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── DELETE /api/users/profile/avatar ────────────────────────────────────────
const eliminarAvatar = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);
    if (usuario.profile_picture?.public_id) {
      await deleteImage(usuario.profile_picture.public_id);
    }
    usuario.profile_picture = null;
    await usuario.save();
    res.json({ message: 'Foto de perfil eliminada', usuario: serializarUsuario(usuario) });
  } catch (err) {
    console.error('eliminarAvatar:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── DELETE /api/users/profile/cover ──────────────────────────────────────────
const eliminarCoverPhoto = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);
    if (usuario.cover_photo?.public_id) {
      await deleteImage(usuario.cover_photo.public_id);
    }
    usuario.cover_photo = null;
    await usuario.save();
    res.json({ message: 'Foto de portada eliminada', usuario: serializarUsuario(usuario) });
  } catch (err) {
    console.error('eliminarCoverPhoto:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/users/profile/photos ───────────────────────────────────────────
// Agrega fotos a la galería (máx 6 en total)
const agregarFotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No se recibieron imágenes' });
    }

    const usuario = await Usuario.findById(req.usuario._id);
    const espacioLibre = 6 - (usuario.photos?.length ?? 0);

    if (espacioLibre <= 0) {
      return res.status(400).json({ message: 'Ya tienes el máximo de 6 fotos en la galería' });
    }

    const archivos = req.files.slice(0, espacioLibre);
    const nuevasFotos = await Promise.all(
      archivos.map(f => uploadGalleryPhoto(f.buffer, req.usuario._id.toString()))
    );

    usuario.photos.push(...nuevasFotos.map(f => ({ url: f.url, public_id: f.public_id })));
    await usuario.save();

    res.json({
      message: `${nuevasFotos.length} foto(s) agregada(s)`,
      photos: usuario.photos,
      usuario: serializarUsuario(usuario),
    });
  } catch (err) {
    console.error('agregarFotos:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── DELETE /api/users/profile/photos/:public_id ──────────────────────────────
// Elimina una foto de galería por su public_id (codificado en base64url)
const eliminarFoto = async (req, res) => {
  try {
    const publicId = Buffer.from(req.params.encodedId, 'base64url').toString();
    const usuario = await Usuario.findById(req.usuario._id);

    const index = usuario.photos.findIndex(p => p.public_id === publicId);
    if (index === -1) {
      return res.status(404).json({ message: 'Foto no encontrada' });
    }

    await deleteImage(publicId);
    usuario.photos.splice(index, 1);
    await usuario.save();

    res.json({
      message: 'Foto eliminada',
      photos: usuario.photos,
    });
  } catch (err) {
    console.error('eliminarFoto:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── DELETE /api/users/me ──────────────────────────────────────────────────────
// Elimina permanentemente el usuario y todas sus imágenes de Cloudinary
const eliminarCuenta = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Recolectar todos los public_ids de Cloudinary para limpiar
    const publicIdsAEliminar = [];

    if (usuario.profile_picture?.public_id) {
      publicIdsAEliminar.push(usuario.profile_picture.public_id);
    }
    if (usuario.cover_photo?.public_id) {
      publicIdsAEliminar.push(usuario.cover_photo.public_id);
    }
    if (usuario.photos?.length > 0) {
      usuario.photos.forEach(p => {
        if (p.public_id) publicIdsAEliminar.push(p.public_id);
      });
    }

    // Eliminar imágenes de Cloudinary (sin bloquear si falla alguna)
    if (publicIdsAEliminar.length > 0) {
      await Promise.allSettled(publicIdsAEliminar.map(id => deleteImage(id)));
    }

    // Eliminar el documento del usuario de MongoDB de forma permanente
    await Usuario.findByIdAndDelete(req.usuario._id);

    res.json({ message: 'Cuenta eliminada correctamente' });
  } catch (err) {
    console.error('eliminarCuenta:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  enviarCodigoVerif,
  verificarCodigoEmail,
  register,
  discover,
  obtenerPerfil,
  obtenerStats,
  actualizarPerfil,
  subirAvatar,
  eliminarAvatar,
  subirCoverPhoto,
  eliminarCoverPhoto,
  agregarFotos,
  eliminarFoto,
  eliminarCuenta,
};