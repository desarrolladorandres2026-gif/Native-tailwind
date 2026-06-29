/**
 * mailer.js
 * Helper para enviar correos transaccionales.
 *
 * Orden de preferencia del proveedor (el primero disponible gana):
 *   1. Resend  → si está definida RESEND_API_KEY (API HTTP, recomendado: no
 *      depende de puertos SMTP que muchos hosts bloquean y firma DKIM solo).
 *   2. SMTP    → si está definido SMTP_HOST (Brevo, SES, Resend-SMTP, etc.).
 *   3. Gmail   → fallback legacy con EMAIL_USER/EMAIL_PASS (tiende a ir a spam).
 *
 * Para que los correos NO caigan en spam hay que verificar el dominio propio
 * (debuta.online) en el proveedor y publicar SPF + DKIM + DMARC en el DNS.
 * Mientras el dominio no esté verificado en Resend, solo se puede enviar desde
 * "onboarding@resend.dev" y únicamente al correo dueño de la cuenta (modo test).
 */

const nodemailer = require('nodemailer');

// ── Cliente Resend (preferente) ───────────────────────────────────────────────
let resendClient = null;
if (process.env.RESEND_API_KEY) {
  try {
    const { Resend } = require('resend');
    resendClient = new Resend(process.env.RESEND_API_KEY);
  } catch (err) {
    console.error('mailer — no se pudo inicializar Resend, se usará SMTP/Gmail:', err.message);
  }
}

// ── Transporters Nodemailer (SMTP y Gmail), perezosos y cacheados por tipo ────
const transporters = {};
function getTransporter(type) {
  if (transporters[type]) return transporters[type];
  if (type === 'smtp') {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporters[type] = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // true solo para 465; 587 usa STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    // Gmail: funciona para cualquier destinatario, pero tiende a ir a spam.
    transporters[type] = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporters[type];
}

// Remitente. Con Resend debe ser un dominio verificado ("Debuta" <noreply@debuta.online>)
// o "Debuta <onboarding@resend.dev>" mientras verificas tu dominio.
const MAIL_FROM =
  process.env.MAIL_FROM ||
  (resendClient
    ? 'Debuta <onboarding@resend.dev>'
    : `"Debuta" <${process.env.EMAIL_USER}>`);
// Buzón real para respuestas (opcional)
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || undefined;

/**
 * Envío centralizado: usa Resend si está configurado; si no, Nodemailer.
 * @param {{ to: string, subject: string, html: string, text: string }} msg
 */
const enviarCorreo = async ({ to, subject, html, text }) => {
  const errores = [];

  // 1) Resend (si hay API key)
  if (resendClient) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: MAIL_FROM,
        to,
        subject,
        html,
        text,
        ...(MAIL_REPLY_TO ? { replyTo: MAIL_REPLY_TO } : {}),
      });
      // El SDK de Resend no lanza: devuelve { error }. Lo normalizamos a throw.
      if (error) throw new Error(error.message || JSON.stringify(error));
      return data;
    } catch (err) {
      errores.push(`Resend: ${err.message}`);
      console.error('mailer — Resend falló, probando siguiente proveedor:', err.message);
    }
  }

  // 2) SMTP transaccional (si está configurado)
  if (process.env.SMTP_HOST) {
    try {
      return await getTransporter('smtp').sendMail({
        from: MAIL_FROM, replyTo: MAIL_REPLY_TO, to, subject, text, html,
      });
    } catch (err) {
      errores.push(`SMTP: ${err.message}`);
      console.error('mailer — SMTP falló, probando siguiente proveedor:', err.message);
    }
  }

  // 3) Gmail (fallback legacy). El "from" debe ser la propia cuenta de Gmail.
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      return await getTransporter('gmail').sendMail({
        from: `"Debuta" <${process.env.EMAIL_USER}>`, replyTo: MAIL_REPLY_TO, to, subject, text, html,
      });
    } catch (err) {
      errores.push(`Gmail: ${err.message}`);
      console.error('mailer — Gmail falló:', err.message);
    }
  }

  throw new Error(
    `No se pudo enviar el correo con ningún proveedor configurado. ${errores.join(' | ') || 'No hay proveedores de correo configurados (RESEND_API_KEY, SMTP_HOST o EMAIL_USER/EMAIL_PASS).'}`
  );
};

/**
 * Envía un correo de recuperación de contraseña
 * @param {string} toEmail  - Correo destinatario
 * @param {string} nombre   - Nombre del usuario
 * @param {string} code     - Código de 6 dígitos
 */
const enviarCorreoReset = async (toEmail, nombre, code) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Recuperar contraseña — Debuta</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:24px;overflow:hidden;
                      box-shadow:0 8px 40px rgba(253,41,123,0.12);">

          <!-- Header degradado -->
          <tr>
            <td align="center"
                style="background:linear-gradient(135deg,#FF5864 0%,#FD297B 100%);
                       padding:40px 32px 32px;">
              <div style="width:72px;height:72px;background:rgba(255,255,255,0.15);
                          border-radius:50%;display:inline-flex;align-items:center;
                          justify-content:center;margin-bottom:16px;">
                <span style="font-size:36px;">❤️</span>
              </div>
              <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900;
                         letter-spacing:1px;">Debuta</h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">
                Recuperación de contraseña
              </p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="color:#424242;font-size:16px;margin:0 0 8px;">
                Hola, <strong>${nombre}</strong> 👋
              </p>
              <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 28px;">
                Recibimos una solicitud para restablecer tu contraseña. 
                Usa el siguiente código de verificación. 
                <strong>Expira en 15 minutos.</strong>
              </p>

              <!-- Código -->
              <div style="background:linear-gradient(135deg,#fff5f8,#fff);
                          border:2px solid rgba(253,41,123,0.2);border-radius:16px;
                          padding:28px;text-align:center;margin-bottom:28px;">
                <p style="color:#999;font-size:12px;letter-spacing:2px;
                           text-transform:uppercase;margin:0 0 12px;">
                  Código de verificación
                </p>
                <span style="font-size:48px;font-weight:900;letter-spacing:10px;
                              color:#FD297B;font-family:monospace;">
                  ${code}
                </span>
              </div>

              <p style="color:#999;font-size:13px;margin:0 0 4px;">
                ⚠️ Si no solicitaste este código, ignora este correo.
                Tu cuenta permanece segura.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;">
              <p style="color:#bbb;font-size:12px;margin:0;text-align:center;">
                © ${new Date().getFullYear()} Debuta · Todos los derechos reservados
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text =
`Hola ${nombre},

Recibimos una solicitud para restablecer tu contraseña en Debuta.

Tu código de verificación es: ${code}
Expira en 15 minutos.

Si no solicitaste este código, ignora este correo. Tu cuenta permanece segura.

— Equipo Debuta`;

  await enviarCorreo({
    to: toEmail,
    subject: `Tu código para restablecer la contraseña es ${code}`,
    text,
    html,
  });
};

/**
 * Envía un correo de verificación de correo para el registro
 * @param {string} toEmail  - Correo destinatario
 * @param {string} nombre   - Nombre del usuario
 * @param {string} code     - Código de 6 dígitos
 */
const enviarCodigoVerificacionRegistro = async (toEmail, nombre, code) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verificación de correo — Debuta</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:24px;overflow:hidden;
                      box-shadow:0 8px 40px rgba(139,92,246,0.12);">

          <!-- Header degradado -->
          <tr>
            <td align="center"
                style="background:linear-gradient(135deg,#8B5CF6 0%,#D946EF 100%);
                       padding:40px 32px 32px;">
              <div style="width:72px;height:72px;background:rgba(255,255,255,0.15);
                          border-radius:50%;display:inline-flex;align-items:center;
                          justify-content:center;margin-bottom:16px;">
                <span style="font-size:36px;">💎</span>
              </div>
              <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900;
                         letter-spacing:1px;">Debuta</h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">
                Verificación de correo electrónico
              </p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="color:#424242;font-size:16px;margin:0 0 8px;">
                Hola, <strong>${nombre}</strong> 👋
              </p>
              <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 28px;">
                Estás a un paso de unirte a Debuta. Usa el siguiente código para
                verificar tu correo electrónico.
                <strong>Expira en 10 minutos.</strong>
              </p>

              <!-- Código -->
              <div style="background:linear-gradient(135deg,#f9f5ff,#fff);
                          border:2px solid rgba(139,92,246,0.2);border-radius:16px;
                          padding:28px;text-align:center;margin-bottom:28px;">
                <p style="color:#999;font-size:12px;letter-spacing:2px;
                           text-transform:uppercase;margin:0 0 12px;">
                  Código de verificación
                </p>
                <span style="font-size:48px;font-weight:900;letter-spacing:10px;
                              color:#8B5CF6;font-family:monospace;">
                  ${code}
                </span>
              </div>

              <p style="color:#999;font-size:13px;margin:0 0 4px;">
                ⚠️ Si no creaste una cuenta en Debuta, ignora este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;">
              <p style="color:#bbb;font-size:12px;margin:0;text-align:center;">
                © ${new Date().getFullYear()} Debuta · Todos los derechos reservados
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text =
`Hola ${nombre},

Estás a un paso de unirte a Debuta. Usa este código para verificar tu correo electrónico:

Código: ${code}
Expira en 10 minutos.

Si no creaste una cuenta en Debuta, ignora este correo.

— Equipo Debuta`;

  await enviarCorreo({
    to: toEmail,
    subject: `Tu código de verificación es ${code}`,
    text,
    html,
  });
};

/**
 * Envía un correo con código de verificación para eliminar la cuenta
 * @param {string} toEmail
 * @param {string} nombre
 * @param {string} code
 */
const enviarCodigoEliminacion = async (toEmail, nombre, code) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Eliminar cuenta — Debuta</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:24px;overflow:hidden;
                      box-shadow:0 8px 40px rgba(239,68,68,0.12);">
          <tr>
            <td align="center"
                style="background:linear-gradient(135deg,#dc2626 0%,#ef4444 100%);
                       padding:40px 32px 32px;">
              <div style="width:72px;height:72px;background:rgba(255,255,255,0.15);
                          border-radius:50%;display:inline-flex;align-items:center;
                          justify-content:center;margin-bottom:16px;">
                <span style="font-size:36px;">⚠️</span>
              </div>
              <h1 style="color:#fff;margin:0;font-size:28px;font-weight:900;letter-spacing:1px;">Debuta</h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Eliminación de cuenta</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="color:#424242;font-size:16px;margin:0 0 8px;">Hola, <strong>${nombre}</strong></p>
              <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 28px;">
                Recibimos una solicitud para <strong>eliminar permanentemente</strong> tu cuenta de Debuta.
                Usa el siguiente código de verificación para confirmar. <strong>Expira en 15 minutos.</strong>
              </p>
              <div style="background:linear-gradient(135deg,#fff5f5,#fff);
                          border:2px solid rgba(239,68,68,0.2);border-radius:16px;
                          padding:28px;text-align:center;margin-bottom:28px;">
                <p style="color:#999;font-size:12px;letter-spacing:2px;
                           text-transform:uppercase;margin:0 0 12px;">Código de verificación</p>
                <span style="font-size:48px;font-weight:900;letter-spacing:10px;
                              color:#dc2626;font-family:monospace;">${code}</span>
              </div>
              <p style="color:#dc2626;font-size:13px;margin:0 0 4px;font-weight:600;">
                ⚠️ Esta acción es irreversible. Si no solicitaste esto, ignora este correo y cambia tu contraseña.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;">
              <p style="color:#bbb;font-size:12px;margin:0;text-align:center;">
                © ${new Date().getFullYear()} Debuta · Todos los derechos reservados
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text =
`Hola ${nombre},

Recibimos una solicitud para eliminar permanentemente tu cuenta de Debuta.

Tu código de verificación es: ${code}
Expira en 15 minutos.

Esta acción es irreversible. Si no solicitaste esto, ignora este correo y cambia tu contraseña.

— Equipo Debuta`;

  await enviarCorreo({
    to: toEmail,
    subject: `Código para eliminar tu cuenta de Debuta: ${code}`,
    text,
    html,
  });
};

module.exports = {
  enviarCorreo,
  enviarCorreoReset,
  enviarCodigoVerificacionRegistro,
  enviarCodigoEliminacion,
};
