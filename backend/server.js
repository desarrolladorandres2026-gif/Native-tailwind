require('dotenv').config();
const dns       = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Google DNS – el router local no resuelve SRV
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
