const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    categoria: {
      type: String,
      enum: [
        'problema_tecnico',
        'cuenta',
        'pagos',
        'abuso',
        'sugerencia',
        'otro',
      ],
      required: true,
    },
    asunto: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    descripcion: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    estado: {
      type: String,
      enum: ['abierto', 'en_revision', 'resuelto', 'cerrado'],
      default: 'abierto',
    },
    respuesta_admin: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    leido_admin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
