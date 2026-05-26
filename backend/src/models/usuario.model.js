const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Sub-schema de interés (ProfileScreen usa { name, icon })
const interestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    icon: { type: String, default: '' },
  },
  { _id: false }
);

// Sub-schema de foto (Cloudinary)
const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },   // URL pública de Cloudinary
    public_id: { type: String, required: true },   // Para eliminar en Cloudinary
  },
  { _id: false }
);

// Sub-schema de configuración (SettingsScreen)
const settingsSchema = new mongoose.Schema(
  {
    // Filtros de descubrimiento
    max_distance: { type: Number, default: 50 },   // km
    min_age: { type: Number, default: 18 },
    max_age: { type: Number, default: 100 },
    show_me: { type: String, enum: ['M', 'F', 'ALL'], default: 'ALL' },

    // Filtros avanzados
    verified_only: { type: Boolean, default: false },
    has_bio_only: { type: Boolean, default: false },
    min_photos: { type: Number, default: 0 },
    looking_for: { type: String, enum: ['amistad', 'citas', 'serio', 'casual', 'no_lo_se', 'ALL', ''], default: 'ALL' },
    interests_filter: { type: [String], default: [] },

    // Notificaciones
    notif_matches: { type: Boolean, default: true },
    notif_messages: { type: Boolean, default: true },
    notif_recomend: { type: Boolean, default: false },

    // Privacidad
    show_distance: { type: Boolean, default: true },
    show_age: { type: Boolean, default: true },
    profile_visible: { type: Boolean, default: true },
    // Control de visibilidad de info personal
    privacy: {
      show_job: { type: Boolean, default: true },
      show_education: { type: Boolean, default: true },
      show_relationship: { type: Boolean, default: true },
      show_buscando: { type: Boolean, default: true },
      show_personal_info: { type: Boolean, default: true }, // General toggle for religion, smoke, etc.
    },
  },
  { _id: false }
);

const usuarioSchema = new mongoose.Schema(
  {
    // ── Datos de autenticación ──────────────────────────────
    username: {
      type: String,
      required: [true, 'El username es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    correo: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,           // Opcional para usuarios con auth social
      minlength: [6, 'Mínimo 6 caracteres'],
      select: false,
    },

    // ── Autenticación social ─────────────────────────────────
    googleId: { type: String, default: null, sparse: true },
    facebookId: { type: String, default: null, sparse: true },
    auth_provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    // IDs de amigos de Facebook que también usan Debuta
    social_friend_ids: { type: [String], default: [] },
    // Flag: usuario social que aún no completó su perfil
    needs_profile_completion: { type: Boolean, default: false },

    // ── Datos personales (register.tsx) ─────────────────────
    // "nombre" del form de registro se mapea a first_name
    first_name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    last_name: {
      type: String,
      default: '',
      trim: true,
    },
    telefono: {
      type: String,
      required: false,           // Opcional para usuarios con auth social
      match: [/^\d{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos'],
      default: '',
    },
    gender: {
      type: String,
      enum: ['masculino', 'femenino', 'no_binario', 'otro', 'prefiero_no_decir'],
      required: [true, 'El género es obligatorio'],
    },
    birth_date: {
      type: Date,
      required: [true, 'La fecha de nacimiento es obligatoria'],
    },

    // ── Perfil (ProfileScreen.tsx) ───────────────────────────────────────────────
    bio: { type: String, default: '', maxlength: 500 },
    // Foto principal: { url, public_id } de Cloudinary
    profile_picture: { type: photoSchema, default: null },
    // Foto de portada (tipo Facebook cover photo)
    cover_photo: { type: photoSchema, default: null },
    // Galería adicional: hasta 6 fotos
    photos: { type: [photoSchema], default: [] },
    interests: [interestSchema],                   // [{ name, icon }]
    is_verified: { type: Boolean, default: false },

    // ── Información personal extendida ───────────────────────────────────────
    job_title: { type: String, default: '', maxlength: 100 },   // Ej: "Diseñador UX"
    company: { type: String, default: '', maxlength: 100 },   // Ej: "Google"
    education: { type: String, default: '', maxlength: 150 },   // Ej: "Universidad UNAM"
    relationship_status: {
      type: String,
      enum: ['single', 'in_relationship', 'married', 'complicated', 'prefer_not_say', ''],
      default: '',
    },
    website: { type: String, default: '', maxlength: 200 },   // URL personal
    buscando: {
      type: String,
      enum: ['amistad', 'citas', 'serio', 'casual', 'no_lo_se', ''],
      default: '',
    },
    // Nuevos campos de info personal
    religion: { type: String, default: '' },
    zodiac: { type: String, default: '' },
    smoke: { type: String, enum: ['si', 'no', 'socialmente', 'ocasionalmente', ''], default: '' },
    drink: { type: String, enum: ['si', 'no', 'socialmente', 'ocasionalmente', ''], default: '' },
    languages: { type: [String], default: [] },
    height: { type: Number, default: null }, // en cm
    exercise: { type: String, enum: ['siempre', 'a_veces', 'nunca', ''], default: '' },

    // ── Ubicación (SwipeCard.tsx usa latitude/longitude) ─────
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    ciudad: { type: String, default: '' },
    pais: { type: String, default: '' },
    location_label: { type: String, default: '' }, // Ej: "CDMX, México"

    // ── Configuración (SettingsScreen.tsx) ───────────────────
    settings: { type: settingsSchema, default: () => ({}) },

    // ── Sistema ──────────────────────────────────────────────
    rol: { type: String, enum: ['user', 'admin', 'asociado'], default: 'user' },
    activo: { type: Boolean, default: true },

    // ── Recuperación de contraseña ────────────────────────────
    resetPasswordCode: { type: String, default: null, select: false },  // código 6 dígitos (hasheado)
    resetPasswordExpires: { type: Date, default: null, select: false },  // expira en 15 min
  },
  { timestamps: true }
);

// ── Hash password antes de guardar ────────────────────────
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Comparar contraseña ───────────────────────────────────
usuarioSchema.methods.compararPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ── Sincronizar location con lat/lng ──────────────────────
usuarioSchema.pre('save', function (next) {
  if (this.isModified('latitude') || this.isModified('longitude')) {
    if (this.latitude != null && this.longitude != null) {
      this.location = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude], // [lng, lat]
      };
    }
  }
  next();
});

usuarioSchema.index({ location: '2dsphere' });

// ── Virtual: edad ─────────────────────────────────────────
usuarioSchema.virtual('age').get(function () {
  if (!this.birth_date) return null;
  const hoy = new Date();
  const edad = hoy.getFullYear() - this.birth_date.getFullYear();
  const m = hoy.getMonth() - this.birth_date.getMonth();
  return m < 0 || (m === 0 && hoy.getDate() < this.birth_date.getDate())
    ? edad - 1
    : edad;
});

usuarioSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
