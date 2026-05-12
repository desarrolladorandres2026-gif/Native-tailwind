require('dotenv').config();
const http      = require('http');
const app       = require('./src/app');
const mongoose  = require('mongoose');
const { initSocket } = require('./src/socket');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
initSocket(server);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    server.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌ Error conectando MongoDB:', err.message);
    process.exit(1);
  });
