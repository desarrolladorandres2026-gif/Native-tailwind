
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Usuario = require('./src/models/usuario.model');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado a MongoDB');
    
    const email = 'felipemartinez101203@gmail.com';
    const user = await Usuario.findOne({ correo: email });
    
    if (user) {
      console.log('Usuario encontrado:', user.correo);
    } else {
      console.log('Usuario no encontrado. Creando uno para pruebas...');
      const newUser = new Usuario({
        username: 'testuser_verify',
        correo: email,
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        gender: 'masculino',
        birth_date: new Date(1990, 0, 1),
        rol: 'admin'
      });
      await newUser.save();
      console.log('Usuario de prueba creado');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkUser();
