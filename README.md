# Getting Started with Create React App

## Configuración de la API

El frontend usa `http://localhost:5000/api` durante el desarrollo local. En
producción usa `/api` en el mismo dominio que sirve el frontend, por lo que el
servidor web debe reenviar esa ruta al backend. Si el backend tiene otro dominio,
define `REACT_APP_API_URL` con la URL completa, por ejemplo
`https://api.ejemplo.com/api`.

Create React App incorpora las variables `REACT_APP_*` al compilar. Configura
`REACT_APP_API_URL` en el entorno de compilación y vuelve a generar y publicar
el frontend después de cambiarla. No uses `localhost` para el backend de una
aplicación publicada: desde el navegador de cada visitante apuntaría a su propio
equipo.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Starts both the backend API (`http://localhost:5000`) and the frontend
(`http://localhost:3000`). Open [http://localhost:3000](http://localhost:3000)
in your browser. Both services use this terminal; press Ctrl+C to stop them.

The backend requires `backend/.env` with valid Supabase settings. To run only
one service, use `npm run start:backend` or `npm run start:frontend` in the
project directory.

The backend signs login sessions for eight hours. In production,
`backend/.env` must define a long, random `SESSION_SECRET` that is stable across
backend restarts and instances. The login loads each user's active roles and
granted modules from the existing RBAC tables; “Remember me” stores the
session persistently only for its remaining eight-hour lifetime.

The login and application navigation use the active roles and module grants
stored in the existing RBAC tables. Supabase data queries continue using the
project's existing publishable-key connection so the current hotel workflows
keep working without a new server secret. This protects the application
interface, but does not stop someone from calling Supabase directly if the
current anonymous/RLS policies allow it. Database-level protection requires
reviewing those policies; no Supabase tables or columns are added here.

Factiliza is used to look up DNI and RUC data when creating a person or company,
and when entering a new person or company in a reservation. Configure
`FACTILIZA_TOKEN` in `backend/.env` (see `backend/.env.example`); keep this token
on the backend and do not add it to frontend `REACT_APP_*` variables. The lookup
only fills the form: review the returned information and save the record
separately.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
