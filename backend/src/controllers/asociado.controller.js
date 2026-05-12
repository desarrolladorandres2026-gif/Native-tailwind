const Match = require('../models/match.model');

const obtenerCitas = async (req, res) => {
  try {
    const asociadoId = req.usuario._id;

    // Buscar matches donde la recomendación es este asociado y fue aceptada por ambos
    const citas = await Match.find({
      'recomendacion.asociadoId': asociadoId,
      'recomendacion.estado': 'aceptada'
    })
      .populate('usuarios', 'first_name last_name username profile_picture')
      .sort({ updatedAt: -1 })
      .lean();

    // Formatear la respuesta
    const resultado = citas.map(m => ({
      matchId: m._id,
      pareja: m.usuarios,
      fechaAceptacion: m.updatedAt,
      estado: m.recomendacion.estado
    }));

    res.json({ citas: resultado });
  } catch (err) {
    console.error('obtenerCitas:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { obtenerCitas };
