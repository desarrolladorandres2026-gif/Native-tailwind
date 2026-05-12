const Ticket  = require('../models/ticket.model');

// ── POST /api/soporte  ────────────────────────────────────────────────────────
// Body: { categoria, asunto, descripcion }
const crearTicket = async (req, res) => {
  try {
    const { categoria, asunto, descripcion } = req.body;

    const categoriasValidas = [
      'problema_tecnico', 'cuenta', 'pagos', 'abuso', 'sugerencia', 'otro',
    ];
    if (!categoriasValidas.includes(categoria)) {
      return res.status(400).json({ message: 'Categoría inválida' });
    }
    if (!asunto?.trim()) {
      return res.status(400).json({ message: 'El asunto es requerido' });
    }
    if (!descripcion?.trim()) {
      return res.status(400).json({ message: 'La descripción es requerida' });
    }

    const ticket = await Ticket.create({
      usuario:     req.usuario._id,
      categoria,
      asunto:      asunto.trim().slice(0, 200),
      descripcion: descripcion.trim().slice(0, 2000),
    });

    res.status(201).json({
      message: 'Tu reporte fue enviado al equipo de soporte. Te responderemos pronto.',
      ticket: { _id: ticket._id, estado: ticket.estado, createdAt: ticket.createdAt },
    });
  } catch (err) {
    console.error('crearTicket:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/soporte/mis-tickets  ────────────────────────────────────────────
const misTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ usuario: req.usuario._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/admin/soporte  ──────────────────────────────────────────────────
const adminObtenerTickets = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;
    const estado = req.query.estado || '';

    const filtro = {};
    if (estado) filtro.estado = estado;

    const [tickets, total, noLeidos] = await Promise.all([
      Ticket.find(filtro)
        .populate('usuario', 'first_name last_name username correo profile_picture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ticket.countDocuments(filtro),
      Ticket.countDocuments({ leido_admin: false }),
    ]);

    res.json({ tickets, total, noLeidos, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('adminObtenerTickets:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── PUT /api/admin/soporte/:id  ──────────────────────────────────────────────
// Body: { estado?, respuesta_admin? }
const adminActualizarTicket = async (req, res) => {
  try {
    const { estado, respuesta_admin } = req.body;
    const estadosValidos = ['abierto', 'en_revision', 'resuelto', 'cerrado'];

    if (estado && !estadosValidos.includes(estado)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const update = { leido_admin: true };
    if (estado)           update.estado           = estado;
    if (respuesta_admin !== undefined) update.respuesta_admin = respuesta_admin.trim().slice(0, 2000);

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('usuario', 'first_name last_name username correo');

    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });
    res.json({ message: 'Ticket actualizado', ticket });
  } catch (err) {
    console.error('adminActualizarTicket:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/admin/soporte/stats  ───────────────────────────────────────────
const adminStatsTickets = async (req, res) => {
  try {
    const [total, abiertos, enRevision, resueltos, noLeidos] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ estado: 'abierto' }),
      Ticket.countDocuments({ estado: 'en_revision' }),
      Ticket.countDocuments({ estado: 'resuelto' }),
      Ticket.countDocuments({ leido_admin: false }),
    ]);
    res.json({ total, abiertos, enRevision, resueltos, noLeidos });
  } catch (err) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  crearTicket,
  misTickets,
  adminObtenerTickets,
  adminActualizarTicket,
  adminStatsTickets,
};
