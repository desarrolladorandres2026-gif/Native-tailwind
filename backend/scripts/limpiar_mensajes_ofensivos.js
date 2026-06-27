/**
 * Script de limpieza de mensajes históricos con contenido inapropiado.
 * Uso: node scripts/limpiar_mensajes_ofensivos.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Mensaje  = require('../src/models/mensaje.model');
const { contienePalabraOfensiva } = require('../src/helpers/moderador');

const BATCH = 200;

async function limpiar() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB');

    let total = 0;
    let eliminados = 0;
    let offset = 0;

    while (true) {
        const mensajes = await Mensaje.find({}, { _id: 1, content: 1 })
            .skip(offset)
            .limit(BATCH)
            .lean();

        if (mensajes.length === 0) break;
        total += mensajes.length;

        const ids = mensajes
            .filter(m => contienePalabraOfensiva(m.content))
            .map(m => m._id);

        if (ids.length > 0) {
            await Mensaje.deleteMany({ _id: { $in: ids } });
            eliminados += ids.length;
            console.log(`Lote ${offset}–${offset + BATCH}: eliminados ${ids.length}`);
        }

        offset += BATCH;
    }

    console.log(`\nTotal revisados: ${total} | Eliminados: ${eliminados}`);
    await mongoose.disconnect();
}

limpiar().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
