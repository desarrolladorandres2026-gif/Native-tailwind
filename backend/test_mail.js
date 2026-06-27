/**
 * test_mail.js
 * Prueba el envío de correo con la configuración actual del mailer (Resend → SMTP → Gmail).
 *
 * Uso:
 *   node test_mail.js                 → envía a EMAIL_USER (.env)
 *   node test_mail.js correo@dominio  → envía al correo indicado
 *
 * Nota: con Resend SIN dominio verificado, el destinatario debe ser el correo
 * dueño de la cuenta de Resend; de lo contrario la API devuelve un error 403.
 */

require('dotenv').config({ path: './.env' });
const { enviarCorreo } = require('./src/helpers/mailer');

const destino = process.argv[2] || process.env.EMAIL_USER;

async function main() {
  if (!destino) {
    console.error('❌ No hay destinatario. Pásalo como argumento o define EMAIL_USER en .env');
    process.exit(1);
  }

  const proveedor = process.env.RESEND_API_KEY
    ? 'Resend'
    : process.env.SMTP_HOST
      ? `SMTP (${process.env.SMTP_HOST})`
      : 'Gmail (legacy)';

  console.log(`📤 Enviando correo de prueba vía ${proveedor} a: ${destino}`);

  try {
    await enviarCorreo({
      to: destino,
      subject: 'Prueba de correo — Debuta ✅',
      text: 'Si recibes esto, el mailer está funcionando correctamente.',
      html: '<p>Si recibes esto, el <strong>mailer de Debuta</strong> está funcionando correctamente. ✅</p>',
    });
    console.log('✅ Correo enviado. Revisa la bandeja de entrada (y la carpeta de spam).');
  } catch (err) {
    console.error('❌ Error al enviar el correo:', err.message);
    process.exit(1);
  }
}

main();
