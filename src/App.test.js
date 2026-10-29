import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const mockOk = () =>
  jest.fn(async () => ({
    ok: true,
    json: async () => ({
      usuario: { logeo: 'admin', id_usuario: 1, id_tipousuario: 1 },
    }),
  }));

const mockFail = () =>
  jest.fn(async () => ({
    ok: false,
    json: async () => ({ message: 'Credenciales incorrectas' }),
  }));

beforeEach(() => {
  sessionStorage.clear();
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
  await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
  await screen.findByText('Sesión activa');

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
  sessionStorage.setItem(
    'usuario',
    JSON.stringify({ logeo: 'admin', id_usuario: 1, id_tipousuario: 1 })
  );
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  const categoriaPrincipal = screen.getByRole('button', { name: /recepción y reservas/i });
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
  sessionStorage.setItem(
    'usuario',
    JSON.stringify({ logeo: 'admin', id_usuario: 1, id_tipousuario: 1 })
  );
  window.history.pushState({}, '', '/dashboard');
  render(<App />);

  expect(screen.getByRole('button', { name: /habitaciones y servicios/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /finanzas y caja/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /ventas y comprobantes/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /reportes/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /personal y organización/i })).toBeInTheDocument();

  await userEvent.click(
    screen.getByRole('button', { name: /administración del sistema/i })
  );

  expect(screen.getByRole('button', { name: 'Departamentos' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Permisos por rol' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Usuarios' })).toBeInTheDocument();
});