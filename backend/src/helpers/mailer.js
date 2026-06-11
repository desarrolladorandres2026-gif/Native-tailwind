/**
 * mailer.js
 * Helper para enviar correos con Nodemailer (Gmail SMTP)
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

  await transporter.sendMail({
    from: `"Debuta ❤️" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${code} es tu código de recuperación — Debuta`,
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

  await transporter.sendMail({
    from: `"Debuta 💎" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${code} — Tu código de verificación en Debuta`,
    html,
  });
};

module.exports = { enviarCorreoReset, enviarCodigoVerificacionRegistro };
