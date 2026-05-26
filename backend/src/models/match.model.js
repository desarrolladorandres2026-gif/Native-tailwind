const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    // Los dos usuarios del match
    usuarios: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
    ],

    // Registro de likes individuales
    // ✅ FIX Bug 2: se agrega createdAt al subdocumento para que
    // like?.createdAt funcione correctamente en likes_controller.
    likes: [
      {
        de: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
        para: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
        tipo: { type: String, enum: ['like', 'dislike'], default: 'like' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Recomendación de cita
    recomendacion: {
      restauranteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurante' },
      asociadoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
      estado: { type: String, enum: ['pendiente', 'aceptada', 'rechazada'], default: 'pendiente' },
      user1Acepta: { type: Boolean, default: false },
      user2Acepta: { type: Boolean, default: false },
      fechaSugerida: { type: String, default: '' },
      sugeridaEn: { type: Date, default: null },
    },

    // true cuando ambos se dieron like
    esMatch: { type: Boolean, default: false },
    fechaMatch: { type: Date },
  },
  { timestamps: true }
);

matchSchema.index({ usuarios: 1 });
matchSchema.index({ esMatch: 1 });

module.exports = mongoose.model('Match', matchSchema);