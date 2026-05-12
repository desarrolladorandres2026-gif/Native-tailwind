/**
 * post.model.js
 * Publicaciones del muro de perfil.
 */
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author:  { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    text:    { type: String, default: '', maxlength: 500 },
    image:   {
      url:       { type: String },
      public_id: { type: String },
    },
    likes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
