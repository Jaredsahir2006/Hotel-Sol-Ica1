// Modelo temporal de autenticación.
// Más adelante será reemplazado por la conexión con Supabase.

const usuarioDemo = {
  email: "admin@hotelsolica.com",
  password: "123456",
  nombre: "Administrador",
};

export const verificarCredenciales = (email, password) => {
  if (
    email === usuarioDemo.email &&
    password === usuarioDemo.password
  ) {
    return {
      success: true,
      user: {
        nombre: usuarioDemo.nombre,
        email: usuarioDemo.email,
      },
    };
  }

  return {
    success: false,
    message: "El correo electrónico o la contraseña son incorrectos.",
  };
};