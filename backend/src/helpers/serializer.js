/**
 * Devuelve un objeto plano del usuario sin password,
 * con el campo "id" en lugar de "_id".
 */
const serializarUsuario = (usuario) => {
  const obj = usuario.toJSON ? usuario.toJSON() : { ...usuario };
  delete obj.password;
  delete obj.__v;
  // Garantizar que "id" siempre exista (Mongoose lo agrega vía virtual)
  if (!obj.id) obj.id = obj._id?.toString();
  return obj;
};

module.exports = { serializarUsuario };
