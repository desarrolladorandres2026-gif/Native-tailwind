const mongoose = require('mongoose');

// Sub-schema de foto (Cloudinary)
const fotoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  { _id: false }
);

// Sub-schema de plato del menú
const platoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '', trim: true },
    precio: { type: String, default: '' },
    foto: { type: fotoSchema, default: null },
  },
  { _id: true }
);

const restauranteSchema = new mongoose.Schema(
  {
    // ── Vinculación con el asociado ────────────────────────────
    asociadoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      unique: true,
    },

    // ── Datos del establecimiento ──────────────────────────────
    nombre: { type: String, default: '', trim: true, maxlength: 150 },
    descripcion: { type: String, default: '', trim: true, maxlength: 500 },
    categoria: {
      type: String,
      enum: [
        'italiano', 'mexicano', 'japonés', 'chino', 'colombiano',
        'peruano', 'francés', 'americano', 'bar', 'café',
        'pizzería', 'mariscos', 'parrilla', 'vegetariano',
        'fusión', 'postres', 'otro', '',
      ],
      default: '',
    },
    ambiente: {
      type: String,
      enum: ['romántico', 'casual', 'elegante', 'familiar', 'fiesta', 'terraza', 'íntimo', ''],
      default: '',
    },
    direccion: { type: String, default: '', trim: true, maxlength: 300 },
    ciudad: { type: String, default: '', trim: true },
    telefono: { type: String, default: '', trim: true },
    horario: { type: String, default: '', trim: true, maxlength: 200 },
    precio_promedio: {
      type: String,
      enum: ['$', '$$', '$$$', '$$$$', ''],
      default: '',
    },
    website: { type: String, default: '', trim: true },
    instagram: { type: String, default: '', trim: true },

    // ── Fotos del lugar ─────────────────────────────────────────
    foto_portada: { type: fotoSchema, default: null },
    fotos: { type: [fotoSchema], default: [], validate: [v => v.length <= 10, 'Máximo 10 fotos'] },

    // ── Menú destacado ──────────────────────────────────────────
    menu: { type: [platoSchema], default: [], validate: [v => v.length <= 30, 'Máximo 30 platos'] },

    // ── Ubicación ───────────────────────────────────────────────
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    // ── Estado ──────────────────────────────────────────────────
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Sincronizar location con lat/lng
restauranteSchema.pre('save', function (next) {
  if (this.isModified('latitude') || this.isModified('longitude')) {
    if (this.latitude != null && this.longitude != null) {
      this.location = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude],
      };
    }
  }
  next();
});

restauranteSchema.index({ location: '2dsphere' });
restauranteSchema.index({ activo: 1 });

restauranteSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Restaurante', restauranteSchema);
