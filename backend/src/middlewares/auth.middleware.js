const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');
const Usuario  = require('../models/usuario.model');

const verificarToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    // Fallar rápido si la BD no está disponible (evita que requests se cuelguen)
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Servicio no disponible, reintenta en un momento' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // maxTimeMS evita que la query se cuelgue si Atlas tarda más de 8s
    const usuario = await Usuario.findById(decoded.id)
      .select('+social_friend_ids interests ciudad birth_date settings rol activo latitude longitude')
      .maxTimeMS(8000);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    if (err?.name === 'MongoServerError' || err?.name === 'MongoNetworkError' || err?.code === 50) {
      return res.status(503).json({ message: 'Error de base de datos, reintenta en un momento' });
    }
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({ message: 'Acceso solo para administradores' });
  }
  next();
};

const soloAsociado = (req, res, next) => {
  if (req.usuario?.rol !== 'asociado') {
    return res.status(403).json({ message: 'Acceso solo para asociados/restaurantes' });
  }
  next();
};

module.exports = { verificarToken, soloAdmin, soloAsociado };
