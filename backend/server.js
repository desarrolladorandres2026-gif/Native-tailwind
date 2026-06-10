require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Google DNS – el router local no resuelve SRV
const http = require('http');
const app = require('./src/app');
const mongoose = require('mongoose');
const { initSocket } = require('./src/socket');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
initSocket(server);

// ── Conexión a MongoDB con reintentos ────────────────────────────────────────
const MAX_RETRIES = 5;
const BASE_DELAY = 3000; // 3 segundos

async function connectWithRetry(attempt = 1) {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // falla en 10s si Atlas no responde
      socketTimeoutMS: 20000,          // cierra socket inactivo en 20s
    });
    console.log('✅ MongoDB conectado');
    server.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`)
    );
  } catch (err) {
    console.error(`❌ Intento ${attempt}/${MAX_RETRIES} - Error conectando MongoDB:`, err.message);
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY * attempt; // backoff lineal: 3s, 6s, 9s, 12s, 15s
      console.log(`⏳ Reintentando en ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
      return connectWithRetry(attempt + 1);
    }
    console.error('💀 Se agotaron los reintentos. Cerrando...');
    process.exit(1);
  }
}

connectWithRetry();
