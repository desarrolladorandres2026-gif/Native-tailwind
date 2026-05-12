const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    // sender_id / receiver_id — nombres que usa ChatScreen y MatchCard
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    // "content" — nombre que usa el frontend (no "texto")
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    // "is_read" — nombre que usa ChatScreen
    is_read: { type: Boolean, default: false },
  },
  {
    timestamps: true,   // genera createdAt → el frontend lo lee como created_at vía toJSON
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        ret.id = ret._id;
        ret.created_at = ret.createdAt;   // alias para el frontend
        delete ret._id;
        delete ret.__v;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
  }
);

mensajeSchema.index({ matchId: 1, createdAt: 1 });

module.exports = mongoose.model('Mensaje', mensajeSchema);
