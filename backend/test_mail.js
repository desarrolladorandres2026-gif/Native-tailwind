
const nodemailer = require('nodemailer');
require('dotenv').config({ path: './.env' });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function testMail() {
  try {
    console.log('Probando conexión con Gmail...');
    await transporter.verify();
    console.log('Conexión exitosa con Gmail');
    
    /* Descomenta para enviar un correo real de prueba
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Prueba de Mailer Debuta',
      text: 'Si recibes esto, el mailer está funcionando correctamente.'
    });
    console.log('Correo de prueba enviado a ' + process.env.EMAIL_USER);
    */
  } catch (err) {
    console.error('Error al conectar con Gmail:', err);
  }
}

testMail();
