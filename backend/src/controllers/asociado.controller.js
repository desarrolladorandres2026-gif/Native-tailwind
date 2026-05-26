const Restaurante = require('../models/restaurante.model');
const Match = require('../models/match.model');
const { uploadImage, deleteImage } = require('../helpers/cloudinary');

// ── GET /api/asociado/restaurante ─────────────────────────────────────
const obtenerRestaurante = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;
    let restaurante = await Restaurante.findOne({ asociadoId });

    // Si no existe, crear uno vacío
    if (!restaurante) {
      restaurante = await Restaurante.create({ asociadoId });
    }

    res.json({ restaurante });
  } catch (err) {
    console.error('obtenerRestaurante:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── PUT /api/asociado/restaurante ─────────────────────────────────────
const actualizarRestaurante = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;
    const campos = [
      'nombre', 'descripcion', 'categoria', 'ambiente', 'direccion',
      'ciudad', 'telefono', 'horario', 'precio_promedio', 'website',
      'instagram', 'latitude', 'longitude',
    ];

    const update = {};
    for (const c of campos) {
      if (req.body[c] !== undefined) update[c] = req.body[c];
    }

    const restaurante = await Restaurante.findOneAndUpdate(
      { asociadoId },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ restaurante });
  } catch (err) {
    console.error('actualizarRestaurante:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/asociado/restaurante/fotos ───────────────────────────────
const subirFotos = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;
    const { fotos, esPortada } = req.body; // fotos: [{ base64 }] o base64 string

    let restaurante = await Restaurante.findOne({ asociadoId });
    if (!restaurante) {
      restaurante = await Restaurante.create({ asociadoId });
    }

    // Si es una sola foto en base64
    const fotosArray = Array.isArray(fotos) ? fotos : [fotos];

    const resultados = [];
    for (const foto of fotosArray) {
      const base64 = typeof foto === 'string' ? foto : foto.base64;
      if (!base64) continue;

      const result = await uploadImage(base64, `restaurantes/${asociadoId}`);
      const nuevaFoto = { url: result.secure_url, public_id: result.public_id };
      resultados.push(nuevaFoto);

      if (esPortada && resultados.length === 1) {
        // Si había portada anterior, eliminar de Cloudinary
        if (restaurante.foto_portada?.public_id) {
          await deleteImage(restaurante.foto_portada.public_id).catch(() => {});
        }
        restaurante.foto_portada = nuevaFoto;
      } else {
        if (restaurante.fotos.length >= 10) {
          return res.status(400).json({ message: 'Máximo 10 fotos permitidas' });
        }
        restaurante.fotos.push(nuevaFoto);
      }
    }

    await restaurante.save();
    res.json({ restaurante, fotosSubidas: resultados });
  } catch (err) {
    console.error('subirFotos:', err);
    res.status(500).json({ message: 'Error al subir fotos' });
  }
};

// ── DELETE /api/asociado/restaurante/fotos/:publicId ────────────────────
const eliminarFoto = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;
    const publicId = decodeURIComponent(req.params.publicId);

    const restaurante = await Restaurante.findOne({ asociadoId });
    if (!restaurante) {
      return res.status(404).json({ message: 'Restaurante no encontrado' });
    }

    // Verificar si es la portada
    if (restaurante.foto_portada?.public_id === publicId) {
      await deleteImage(publicId).catch(() => {});
      restaurante.foto_portada = null;
    } else {
      // Buscar en galería
      const index = restaurante.fotos.findIndex(f => f.public_id === publicId);
      if (index === -1) {
        return res.status(404).json({ message: 'Foto no encontrada' });
      }
      await deleteImage(publicId).catch(() => {});
      restaurante.fotos.splice(index, 1);
    }

    await restaurante.save();
    res.json({ restaurante });
  } catch (err) {
    console.error('eliminarFoto:', err);
    res.status(500).json({ message: 'Error al eliminar foto' });
  }
};

// ── PUT /api/asociado/restaurante/menu ──────────────────────────────────
const actualizarMenu = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;
    const { menu } = req.body; // array de platos

    if (!Array.isArray(menu)) {
      return res.status(400).json({ message: 'El menú debe ser un array' });
    }

    const restaurante = await Restaurante.findOneAndUpdate(
      { asociadoId },
      { $set: { menu } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ restaurante });
  } catch (err) {
    console.error('actualizarMenu:', err);
    res.status(500).json({ message: 'Error al actualizar menú' });
  }
};

// ── POST /api/asociado/restaurante/menu/plato ───────────────────────────
const agregarPlato = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;
    const { nombre, descripcion, precio, fotoBase64 } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ message: 'El nombre del plato es obligatorio' });
    }

    let restaurante = await Restaurante.findOne({ asociadoId });
    if (!restaurante) {
      restaurante = await Restaurante.create({ asociadoId });
    }

    if (restaurante.menu.length >= 30) {
      return res.status(400).json({ message: 'Máximo 30 platos en el menú' });
    }

    let foto = null;
    if (fotoBase64) {
      const result = await uploadImage(fotoBase64, `restaurantes/${asociadoId}/menu`);
      foto = { url: result.secure_url, public_id: result.public_id };
    }

    restaurante.menu.push({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
      precio: precio || '',
      foto,
    });

    await restaurante.save();
    res.json({ restaurante });
  } catch (err) {
    console.error('agregarPlato:', err);
    res.status(500).json({ message: 'Error al agregar plato' });
  }
};

// ── DELETE /api/asociado/restaurante/menu/:platoId ───────────────────────
const eliminarPlato = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;
    const { platoId } = req.params;

    const restaurante = await Restaurante.findOne({ asociadoId });
    if (!restaurante) {
      return res.status(404).json({ message: 'Restaurante no encontrado' });
    }

    const plato = restaurante.menu.id(platoId);
    if (!plato) {
      return res.status(404).json({ message: 'Plato no encontrado' });
    }

    // Si tiene foto, eliminar de Cloudinary
    if (plato.foto?.public_id) {
      await deleteImage(plato.foto.public_id).catch(() => {});
    }

    restaurante.menu.pull(platoId);
    await restaurante.save();
    res.json({ restaurante });
  } catch (err) {
    console.error('eliminarPlato:', err);
    res.status(500).json({ message: 'Error al eliminar plato' });
  }
};

// ── GET /api/asociado/citas ────────────────────────────────────────────
const obtenerCitas = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;

    const citas = await Match.find({
      'recomendacion.asociadoId': asociadoId,
      'recomendacion.estado': 'aceptada'
    })
      .populate('usuarios', 'first_name last_name username profile_picture')
      .sort({ updatedAt: -1 })
      .lean();

    const resultado = citas.map(m => ({
      matchId: m._id,
      pareja: m.usuarios,
      fechaSugerida: m.recomendacion.fechaSugerida || '',
      fechaAceptacion: m.updatedAt,
      estado: m.recomendacion.estado,
    }));

    res.json({ citas: resultado });
  } catch (err) {
    console.error('obtenerCitas:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/asociado/estadisticas ─────────────────────────────────────
const obtenerEstadisticas = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;

    // Total citas confirmadas
    const totalCitas = await Match.countDocuments({
      'recomendacion.asociadoId': asociadoId,
      'recomendacion.estado': 'aceptada',
    });

    // Citas del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const citasMes = await Match.countDocuments({
      'recomendacion.asociadoId': asociadoId,
      'recomendacion.estado': 'aceptada',
      updatedAt: { $gte: inicioMes },
    });

    // Citas pendientes (sugeridas pero no aceptadas por ambos)
    const citasPendientes = await Match.countDocuments({
      'recomendacion.asociadoId': asociadoId,
      'recomendacion.estado': 'pendiente',
    });

    res.json({
      estadisticas: {
        totalCitas,
        citasMes,
        citasPendientes,
      },
    });
  } catch (err) {
    console.error('obtenerEstadisticas:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  obtenerRestaurante,
  actualizarRestaurante,
  subirFotos,
  eliminarFoto,
  actualizarMenu,
  agregarPlato,
  eliminarPlato,
  obtenerCitas,
  obtenerEstadisticas,
};
