const mongoose = require('mongoose');

const reporteSchema = new mongoose.Schema(
  {
    reportadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    reportado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    motivo: {
      type: String,
      enum: [
        'spam',
        'contenido_inapropiado',
        'comportamiento_ofensivo',
        'perfil_falso',
        'acoso',
        'otro',
      ],
      required: true,
    },
    descripcion: {
      type: String,
      maxlength: 500,
      default: '',
    },
    estado: {
      type: String,
      enum: ['pendiente', 'revisado', 'resuelto'],
      default: 'pendiente',
    },
  },
  { timestamps: true }
);

// Un usuario solo puede reportar a otro una vez
reporteSchema.index({ reportadoPor: 1, reportado: 1 }, { unique: true });

module.exports = mongoose.model('Reporte', reporteSchema);