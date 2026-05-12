/**
 * post.controller.js
 * CRUD de publicaciones del muro de perfil.
 */

const mongoose = require('mongoose');
const Post    = require('../models/post.model');
const { uploadPostImage, deleteImage } = require('../helpers/cloudinary');

// ── POST /api/posts ───────────────────────────────────────────────────────────
const crearPost = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text && !req.file) {
      return res.status(400).json({ message: 'El post debe tener texto o imagen' });
    }

    let image = undefined;
    if (req.file) {
      console.log('crearPost: archivo recibido:', {
        fieldname:    req.file.fieldname,
        mimetype:     req.file.mimetype,
        size:         req.file.size,
        bufferLength: req.file.buffer?.length,
      });
      try {
        const { url, public_id } = await uploadPostImage(
          req.file.buffer,
          req.usuario._id.toString()
        );
        image = { url, public_id };
        console.log('crearPost: imagen subida OK →', url);
      } catch (cloudErr) {
        console.error('crearPost: ERROR en Cloudinary →', cloudErr.message, cloudErr.http_code);
        return res.status(500).json({
          message: 'Error al subir la imagen',
          detail:  cloudErr.message,
        });
      }
    }

    const post = await Post.create({
      author: req.usuario._id,
      text:   text?.trim() ?? '',
      image,
    });

    await post.populate('author', 'first_name last_name username profile_picture is_verified');

    res.status(201).json({ message: 'Publicación creada', post });
  } catch (err) {
    console.error('crearPost: error inesperado →', err.message, err.stack);
    res.status(500).json({ message: 'Error interno del servidor', detail: err.message });
  }
};

// ── GET /api/posts/me ─────────────────────────────────────────────────────────
const misPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const posts = await Post.find({ author: req.usuario._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate('author', 'first_name last_name username profile_picture is_verified');
    res.json({ posts });
  } catch (err) {
    console.error('misPosts:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── GET /api/posts/user/:id ───────────────────────────────────────────────────
const postsPorUsuario = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const { page = 1, limit = 20 } = req.query;
    const posts = await Post.find({ author: req.params.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate('author', 'first_name last_name username profile_picture is_verified');
    res.json({ posts });
  } catch (err) {
    console.error('postsPorUsuario:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── POST /api/posts/:id/like ──────────────────────────────────────────────────
const toggleLikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    const userId = req.usuario._id;
    const idx    = post.likes.indexOf(userId);

    if (idx === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(idx, 1);
    }
    await post.save();

    res.json({ likes: post.likes.length, liked: idx === -1 });
  } catch (err) {
    console.error('toggleLikePost:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ── DELETE /api/posts/:id ─────────────────────────────────────────────────────
const eliminarPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });
    if (!post.author.equals(req.usuario._id)) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (post.image?.public_id) {
      await deleteImage(post.image.public_id);
    }
    await post.deleteOne();

    res.json({ message: 'Publicación eliminada' });
  } catch (err) {
    console.error('eliminarPost:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { crearPost, misPosts, postsPorUsuario, toggleLikePost, eliminarPost };
