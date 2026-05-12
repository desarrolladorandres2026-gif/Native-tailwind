const jwt     = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

/**
 * Verifica el Bearer token.
 * SplashScreen guarda la clave como "access_token".
 */
const verificarToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Incluir campos necesarios para el algoritmo de afinidad en discover
    const usuario = await Usuario.findById(decoded.id)
      .select('+social_friend_ids interests ciudad birth_date settings rol activo latitude longitude');
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    req.usuario = usuario;
    next();
  } catch {
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
