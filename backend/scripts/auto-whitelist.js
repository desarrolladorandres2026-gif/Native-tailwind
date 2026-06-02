/**
 * auto-whitelist.js
 * ─────────────────
 * Detecta la IP pública actual y la agrega al Access List de MongoDB Atlas
 * usando la Atlas Administration API con HTTP Digest Authentication.
 *
 * NO requiere dependencias externas (usa solo módulos nativos de Node.js).
 *
 * Variables de entorno requeridas (en .env):
 *   ATLAS_PUBLIC_KEY   – API key pública de Atlas
 *   ATLAS_PRIVATE_KEY  – API key privada de Atlas
 *   ATLAS_PROJECT_ID   – ID del proyecto en Atlas
 */

require('dotenv').config();
const https  = require('https');
const http   = require('http');
const crypto = require('crypto');
const { URL } = require('url');

const {
  ATLAS_PUBLIC_KEY,
  ATLAS_PRIVATE_KEY,
  ATLAS_PROJECT_ID,
} = process.env;

// ── Digest Auth helpers ──────────────────────────────────────────────────────

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/** Parsea el header WWW-Authenticate de tipo Digest */
function parseDigestChallenge(header) {
  const params = {};
  const regex = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
  let m;
  while ((m = regex.exec(header))) {
    params[m[1]] = m[2] || m[3];
  }
  return params;
}

/** Construye el header Authorization para Digest Auth */
function buildDigestHeader(method, uri, challenge, username, password) {
  const nc     = '00000001';
  const cnonce = crypto.randomBytes(16).toString('hex');
  const ha1    = md5(`${username}:${challenge.realm}:${password}`);
  const ha2    = md5(`${method}:${uri}`);

  let response;
  if (challenge.qop) {
    response = md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${challenge.qop}:${ha2}`);
  } else {
    response = md5(`${ha1}:${challenge.nonce}:${ha2}`);
  }

  let header = `Digest username="${username}", realm="${challenge.realm}", ` +
    `nonce="${challenge.nonce}", uri="${uri}", response="${response}"`;

  if (challenge.qop) {
    header += `, qop=${challenge.qop}, nc=${nc}, cnonce="${cnonce}"`;
  }
  if (challenge.opaque) {
    header += `, opaque="${challenge.opaque}"`;
  }
  return header;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

/** Hace una petición HTTPS y devuelve { statusCode, headers, body } */
function httpsRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOpts = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data,
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/** Petición HTTP simple (para ipify) */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
}

/**
 * Hace una petición a la Atlas Admin API con Digest Authentication.
 * 1. Envía la petición sin auth → Atlas responde 401 con el challenge
 * 2. Parsea el challenge y construye el header Digest
 * 3. Re-envía la petición autenticada
 */
async function atlasRequest(method, path, bodyObj = null) {
  const baseUrl = 'https://cloud.mongodb.com/api/atlas/v2';
  const url     = `${baseUrl}${path}`;
  const parsedUrl = new URL(url);
  const uri     = parsedUrl.pathname + parsedUrl.search;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.atlas.2023-01-01+json',
  };
  const bodyStr = bodyObj ? JSON.stringify(bodyObj) : null;

  // Paso 1: petición sin auth → 401 con WWW-Authenticate
  const firstRes = await httpsRequest(url, { method, headers }, bodyStr);

  if (firstRes.statusCode === 200 || firstRes.statusCode === 201) {
    return { statusCode: firstRes.statusCode, body: JSON.parse(firstRes.body) };
  }

  if (firstRes.statusCode !== 401 || !firstRes.headers['www-authenticate']) {
    throw new Error(`Atlas API respondió ${firstRes.statusCode}: ${firstRes.body}`);
  }

  // Paso 2: parsear el challenge y construir auth header
  const challenge  = parseDigestChallenge(firstRes.headers['www-authenticate']);
  const authHeader = buildDigestHeader(method, uri, challenge, ATLAS_PUBLIC_KEY, ATLAS_PRIVATE_KEY);

  // Paso 3: re-enviar con Authorization
  const authHeaders = { ...headers, 'Authorization': authHeader };
  const secondRes = await httpsRequest(url, { method, headers: authHeaders }, bodyStr);

  if (secondRes.statusCode >= 200 && secondRes.statusCode < 300) {
    return { statusCode: secondRes.statusCode, body: secondRes.body ? JSON.parse(secondRes.body) : null };
  }

  // 409 = IP ya existe (conflicto), lo tratamos como éxito
  if (secondRes.statusCode === 409) {
    return { statusCode: 200, body: { alreadyExists: true } };
  }

  throw new Error(`Atlas API respondió ${secondRes.statusCode}: ${secondRes.body}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Validar variables de entorno
  if (!ATLAS_PUBLIC_KEY || !ATLAS_PRIVATE_KEY || !ATLAS_PROJECT_ID) {
    console.log('⚠️  Auto-whitelist desactivado: Faltan variables ATLAS_PUBLIC_KEY, ATLAS_PRIVATE_KEY o ATLAS_PROJECT_ID en .env');
    console.log('   → Configúralas una vez y nunca más tendrás problemas de IP.');
    console.log('   → El servidor intentará conectarse sin auto-whitelist...');
    process.exit(0);
  }

  try {
    // 1. Obtener IP pública actual
    let ip;
    try {
      ip = await httpGet('http://api.ipify.org');
    } catch {
      ip = await httpGet('http://checkip.amazonaws.com');
    }
    console.log(`🌐 IP pública detectada: ${ip}`);

    // 2. Verificar si la IP ya está en el Access List
    try {
      const res = await atlasRequest('GET', `/groups/${ATLAS_PROJECT_ID}/accessList/${encodeURIComponent(ip)}%2F32`);
      if (res.statusCode === 200) {
        console.log(`✅ IP ${ip} ya está en el Access List de Atlas`);
        process.exit(0);
      }
    } catch (err) {
      // 404 = IP no está en la lista, seguimos para agregarla
      if (!err.message.includes('404')) {
        // Si es otro error, lo mostramos pero no bloqueamos
        console.log(`⚠️  No se pudo verificar IP existente: ${err.message}`);
      }
    }

    // 3. Agregar la IP al Access List
    console.log(`📝 Agregando ${ip}/32 al Access List de Atlas...`);
    const addRes = await atlasRequest('POST', `/groups/${ATLAS_PROJECT_ID}/accessList`, [
      {
        ipAddress: `${ip}/32`,
        comment: `Auto-dev ${new Date().toISOString().slice(0, 16)}`,
      },
    ]);

    if (addRes.body?.alreadyExists) {
      console.log(`✅ IP ${ip} ya existía en el Access List`);
    } else {
      console.log(`✅ IP ${ip} agregada al Access List exitosamente`);
    }

    // 4. Esperar para que Atlas propague el cambio
    console.log('⏳ Esperando 5s para propagación en Atlas...');
    await new Promise((r) => setTimeout(r, 5000));

    console.log('🚀 Listo — iniciando servidor...');
  } catch (err) {
    console.error('⚠️  Auto-whitelist falló:', err.message);
    console.log('   El servidor intentará conectarse de todos modos...');
  }

  process.exit(0);
}

main();
