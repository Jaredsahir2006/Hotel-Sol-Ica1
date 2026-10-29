import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { guardarSesion } from './services/authSession';

const modulosAdmin = [
  'CLIENTES',
  'RECEPCION',
  'HABITACIONES',
  'VENTAS',
  'CAJA',
  'USUARIOS',
  'REPORTES',
];

const crearSesion = (modulos = modulosAdmin) =>
  guardarSesion({
    usuario: { logeo: 'admin', id_usuario: 1, id_tipousuario: 1 },
    roles: ['ADMINISTRADOR'],
    modulos,
    token: 'token-de-prueba',
    expiraEn: Date.now() + 60 * 60 * 1000,
  });

const mockOk = () =>
  jest.fn(async () => ({
    ok: true,
    json: async () => ({
      usuario: { logeo: 'admin', id_usuario: 1, id_tipousuario: 1 },
      roles: ['ADMINISTRADOR'],
      modulos: modulosAdmin,
      token: 'token-de-prueba',
      expiraEn: Date.now() + 60 * 60 * 1000,
      success: true,
    }),
  }));

const mockFail = () =>
  jest.fn(async () => ({
    ok: false,
    json: async () => ({ message: 'Credenciales incorrectas' }),
  }));

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  global.fetch = jest.fn(async () => {
    const sesion = JSON.parse(
      sessionStorage.getItem('hotel-sol-ica:sesion') || 'null'
    );

    return {
      ok: Boolean(sesion),
      json: async () => ({
        success: Boolean(sesion),
        usuario: sesion?.usuario,
        roles: sesion?.roles,
        modulos: sesion?.modulos,
        expiraEn: sesion?.expiraEn,
      }),
    };
  });
  window.history.pushState({}, '', '/login');
});

test('flujo completo: validacion -> error general -> login -> dashboard -> logout -> login', async () => {
  global.fetch = mockFail();
  render(<App />);

  // 1) submit vacio -> aparecen errores por campo
  await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
  await screen.findByText('El usuario es obligatorio.');
  await screen.findByText('La contraseña es obligatoria.');

  // 2) escribir -> los errores se eliminan del DOM
  await userEvent.type(screen.getByPlaceholderText('Ingresa tu usuario'), 'a');
  await userEvent.type(screen.getByPlaceholderText('Ingresa tu contraseña'), 'b');

  // 3) submit con backend rejectando -> error general
  await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
  await screen.findByText('Credenciales incorrectas');

  // 4) toggle password -> insercion/eliminacion del boton
  await userEvent.click(screen.getByRole('button', { name: /mostrar contraseña/i }));
  await screen.findByRole('button', { name: /ocultar contraseña/i });

  // 5) login correcto -> dashboard
  global.fetch = mockOk();
  await userEvent.click(screen.getByLabelText('Recordarme'));
  await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
  await screen.findByText('Sesión activa');
  expect(localStorage.getItem('hotel-sol-ica:sesion')).not.toBeNull();

  // 6) logout -> vuelve al login
  await userEvent.click(screen.getAllByRole('button', { name: /cerrar sesión/i })[0]);
  await screen.findByText('Bienvenido');

  // 7) login de nuevo -> dashboard (segunda navegacion, la sospechosa)
  global.fetch = mockOk();
  await userEvent.type(screen.getByPlaceholderText('Ingresa tu usuario'), 'admin');
  await userEvent.type(screen.getByPlaceholderText('Ingresa tu contraseña'), '123456');
  await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
  await screen.findByText('Sesión activa');

  // 8) abrir/cerrar sidebar movil
  await userEvent.click(screen.getByRole('button', { name: /abrir menú/i }));

  await waitFor(() => expect(document.body).toBeInTheDocument());
});

test('el menú lateral permite contraer y expandir las categorías', async () => {
  crearSesion();
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  const categoriaPrincipal = await screen.findByRole('button', { name: /recepción y reservas/i });
  expect(categoriaPrincipal).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: 'Reservas' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Registro de consumo' })).toBeInTheDocument();

  await userEvent.click(categoriaPrincipal);
  expect(screen.getByRole('button', { name: /recepción y reservas/i })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  expect(screen.queryByRole('button', { name: 'Reservas' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /recepción y reservas/i }));
  expect(screen.getByRole('button', { name: 'Reservas' })).toBeInTheDocument();
});

test('el sidebar organiza los módulos y tablas en categorías del hotel', async () => {
  crearSesion();
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  expect(await screen.findByRole('button', { name: /habitaciones y servicios/i })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /finanzas y caja/i })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /ventas y comprobantes/i })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /reportes/i })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /personal y organización/i })).toBeInTheDocument();

  await userEvent.click(
    await screen.findByRole('button', { name: /administración del sistema/i })
  );

  expect(screen.getByRole('button', { name: 'Departamentos' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Permisos por rol' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Usuarios' })).toBeInTheDocument();
});

test('el usuario solo ve módulos habilitados por el servidor', async () => {
  crearSesion(['CAJA']);
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  expect(await screen.findByRole('button', { name: /finanzas y caja/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /administración del sistema/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Usuarios' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Huéspedes' })).not.toBeInTheDocument();
});

test('los módulos administrativos se reservan al rol ADMINISTRADOR', async () => {
  const sesionGerente = {
    usuario: { logeo: 'gerente', id_usuario: 2 },
    roles: ['GERENTE'],
    modulos: ['USUARIOS'],
    expiraEn: Date.now() + 60 * 60 * 1000,
  };
  guardarSesion({
    ...sesionGerente,
    token: 'token-de-prueba',
  });
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, ...sesionGerente }),
  }));
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  await screen.findByText('Sesión activa');
  expect(screen.queryByRole('button', { name: /administración del sistema/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Usuarios' })).not.toBeInTheDocument();
});

test('redirige al login si no existe una sesión con token y vencimiento válidos', async () => {
  sessionStorage.setItem('usuario', JSON.stringify({
    logeo: 'admin',
    id_usuario: 1,
  }));
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  expect(await screen.findByText('Bienvenido')).toBeInTheDocument();
});