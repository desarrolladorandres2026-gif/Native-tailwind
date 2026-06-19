module.exports = function (api) {
  // La caché depende del entorno para que el plugin de producción se aplique correctamente.
  api.cache.using(() => process.env.NODE_ENV);

  const plugins = [
    ['@babel/plugin-transform-typescript', { isTSX: true, allExtensions: true }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
  ];

  // En builds de producción elimina los console.log/info/debug ruidosos,
  // pero conserva console.error y console.warn para diagnóstico en logcat.
  if (process.env.NODE_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
