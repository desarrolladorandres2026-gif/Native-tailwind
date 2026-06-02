const jwt      = require('jsonwebtoken');
const Usuario  = require('../models/usuario.model');
const { serializarUsuario } = require('../helpers/serializer');

const generarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── POST /api/login ──────────────────────────────────────────────────
// login.tsx envía: { correo, password }
// Retorna: { access_token, usuario }
const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
    }

    const usuario = await Usuario.findOne({ correo }).select('+password');
    if (!usuario || !(await usuario.compararPassword(password))) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }

    // Usuario registrado con Google/Facebook no puede hacer login con contraseña
    if (usuario.auth_provider && usuario.auth_provider !== 'local') {
      return res.status(401).json({
        message: `Esta cuenta usa ${usuario.auth_provider === 'google' ? 'Google' : 'Facebook'} para iniciar sesión`,
      });
    }

    if (!usuario.activo) {
      return res.status(401).json({ message: 'Cuenta desactivada' });
    }

    const access_token = generarToken(usuario._id);

    res.json({
      access_token,                          // SplashScreen lee "access_token"
      usuario: serializarUsuario(usuario),
    });
  } catch (err) {
    console.error('login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/me ──────────────────────────────────────────────────────
const me = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);
    res.json({ usuario: serializarUsuario(usuario) });
  } catch (err) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { login, me };
