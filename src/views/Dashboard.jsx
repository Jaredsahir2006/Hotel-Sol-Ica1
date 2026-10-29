import { useState } from "react";
import { useNavigate } from "react-router-dom";

import HotelLogo from "../components/HotelLogo";

import CrudModule from "../components/CrudModule";
import { ENTIDADES } from "../config/entidades";

import CheckInOut from "./CheckInOut";
import Reservas from "./Reservas";
import Pagos from "./Pagos";
import Facturacion from "./Facturacion";
import Reportes from "./Reportes";

const MENU_CATEGORIAS = [
    {
        clave: "principal",
        nombre: "Recepción y reservas",
        icono: "bi-calendar-check",
        opciones: [
            { clave: "checkinout", nombre: "Check-in / Check-out", icono: "bi-door-open" },
            { clave: "reservas", nombre: "Reservas", icono: "bi-calendar-check" },
            { clave: "reservas_lista", nombre: "Historial de reservas", icono: "bi-list-ul" },
            { clave: "huespedes", nombre: "Huéspedes", icono: "bi-people" },
        ],
    },
    {
        clave: "habitaciones",
        nombre: "Habitaciones y servicios",
        icono: "bi-building",
        opciones: [
            { clave: "habitaciones", nombre: "Habitaciones", icono: "bi-door-open" },
            { clave: "servicios", nombre: "Servicios", icono: "bi-cup-hot" },
            { clave: "limpieza", nombre: "Limpieza", icono: "bi-stars" },
            { clave: "cochera", nombre: "Cochera", icono: "bi-car-front" },
        ],
    },
    {
        clave: "finanzas",
        nombre: "Finanzas y caja",
        icono: "bi-cash-coin",
        opciones: [
            { clave: "pagos", nombre: "Pagos y caja", icono: "bi-cash-coin" },
            { clave: "apertura_caja", nombre: "Aperturas de caja", icono: "bi-box-arrow-in-right" },
            { clave: "movimiento_caja", nombre: "Movimientos de caja", icono: "bi-arrow-left-right" },
            { clave: "caja", nombre: "Cajas", icono: "bi-cash-stack" },
            { clave: "concepto_caja", nombre: "Conceptos de caja", icono: "bi-tags" },
            { clave: "tipo_movimiento_caja", nombre: "Tipos de movimiento", icono: "bi-arrow-left-right" },
        ],
    },
    {
        clave: "facturacion",
        nombre: "Ventas y comprobantes",
        icono: "bi-receipt",
        opciones: [
            { clave: "facturacion", nombre: "Facturación", icono: "bi-receipt" },
            { clave: "venta", nombre: "Ventas", icono: "bi-bag-check" },
            { clave: "detalle_venta", nombre: "Detalle de ventas", icono: "bi-list-check" },
            { clave: "factura", nombre: "Facturas", icono: "bi-file-earmark-text" },
            { clave: "boleta", nombre: "Boletas", icono: "bi-receipt" },
        ],
    },
    {
        clave: "reportes",
        nombre: "Reportes",
        icono: "bi-bar-chart",
        opciones: [
            { clave: "reportes", nombre: "Reportes", icono: "bi-bar-chart" },
            { clave: "auditoria", nombre: "Auditoría", icono: "bi-clock-history" },
        ],
    },
    {
        clave: "organizacion",
        nombre: "Personal y organización",
        icono: "bi-people",
        opciones: [
            { clave: "empleados", nombre: "Empleados", icono: "bi-person-badge" },
            { clave: "empresa", nombre: "Empresas", icono: "bi-building" },
        ],
    },
    {
        clave: "administracion",
        nombre: "Administración del sistema",
        icono: "bi-gear",
        opciones: [
            { clave: "departamento", nombre: "Departamentos", icono: "bi-geo-alt" },
            { clave: "provincia", nombre: "Provincias", icono: "bi-map" },
            { clave: "tipo_usuario", nombre: "Tipos de usuario", icono: "bi-person-vcard" },
            { clave: "modulo", nombre: "Módulos", icono: "bi-grid" },
            { clave: "rol", nombre: "Roles", icono: "bi-shield-lock" },
            { clave: "rol_permiso", nombre: "Permisos por rol", icono: "bi-key" },
            { clave: "usuario_rol", nombre: "Roles de usuarios", icono: "bi-person-check" },
            { clave: "usuarios", nombre: "Usuarios", icono: "bi-person-gear" },
        ],
    },
];

const Dashboard = () => {

    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [categoriasAbiertas, setCategoriasAbiertas] = useState({
        principal: true,
    });

    // Recuperar usuario autenticado
    const usuarioGuardado =
        sessionStorage.getItem("usuario");

    const usuario = usuarioGuardado
        ? JSON.parse(usuarioGuardado)
        : null;

    // Vista actual: "dashboard" o la clave de un CRUD (ver config/entidades.js)
    const [vista, setVista] = useState("dashboard");

    const abrirVista = (clave) => {
        setVista(clave);
        setSidebarOpen(false);

        const categoria = MENU_CATEGORIAS.find((grupo) =>
            grupo.opciones.some((opcion) => opcion.clave === clave)
        );
        if (categoria) {
            setCategoriasAbiertas((abiertas) => ({
                ...abiertas,
                [categoria.clave]: true,
            }));
        }
    };

    const claseItem = (clave) =>
        vista === clave
            ? "sidebar-item bg-blue-800 text-white"
            : "sidebar-item";


    // Si no existe sesión, volver al Login
    if (!usuario) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">

                <div className="text-center">

                    <i className="bi bi-shield-lock text-5xl text-blue-800"></i>

                    <h2 className="mt-4 text-xl font-semibold text-slate-800">
                       <span>
                           Sesión no encontrada
                       </span>
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                       <span>
                           Debes iniciar sesión para acceder al sistema.
                       </span>
                    </p>

                    <button
                        onClick={() => navigate("/login")}
                        className="mt-5 rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900"
                    >
                       <span>
                           Ir al inicio de sesión
                       </span>
                    </button>

                </div>

            </div>
        );
    }


    const cerrarSesion = () => {

        sessionStorage.removeItem("usuario");

        navigate("/login", {
            replace: true
        });
    };


    const modulos = [
        {
            clave: "reservas",
            nombre: "Reservas",
            icono: "bi-calendar-check",
            descripcion: "Gestiona las reservas y recepciones del hotel.",
            color: "blue"
        },
        {
            clave: "huespedes",
            nombre: "Huéspedes",
            icono: "bi-people",
            descripcion: "Administra la información de los huéspedes.",
            color: "emerald"
        },
        {
            clave: "habitaciones",
            nombre: "Habitaciones",
            icono: "bi-door-open",
            descripcion: "Consulta y administra las habitaciones.",
            color: "amber"
        },
        {
            clave: "empleados",
            nombre: "Empleados",
            icono: "bi-person-badge",
            descripcion: "Gestiona el personal, cargos y contratos.",
            color: "indigo"
        },
        {
            clave: "servicios",
            nombre: "Servicios",
            icono: "bi-cup-hot",
            descripcion: "Administra productos y servicios adicionales.",
            color: "green"
        },
        {
            clave: "limpieza",
            nombre: "Limpieza",
            icono: "bi-stars",
            descripcion: "Gestiona las tareas de limpieza.",
            color: "purple"
        },
        {
            clave: "cochera",
            nombre: "Cochera",
            icono: "bi-car-front",
            descripcion: "Administra espacios y vehículos.",
            color: "rose"
        },
        {
            clave: "facturacion",
            nombre: "Facturación",
            icono: "bi-receipt",
            descripcion: "Gestiona documentos y pagos.",
            color: "cyan"
        }
    ];


    return (

        <div className="min-h-screen bg-slate-100">


            {/* =========================================
                SIDEBAR
            ========================================== */}

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}


            <aside
                className={`
                    fixed
                    left-0
                    top-0
                    z-40
                    flex
                    h-screen
                    w-72
                    flex-col
                    bg-slate-950
                    text-white
                    transition-transform
                    duration-300
                    lg:translate-x-0
                    ${sidebarOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                    }
                `}
            >

                {/* Logo */}

                <div className="border-b border-white/10 p-6">

                    <HotelLogo light />

                </div>


                {/* Menú */}

                <div className="flex-1 overflow-y-auto px-4 py-6">

                    <nav aria-label="Menú lateral" className="space-y-2">
                        <button
                            type="button"
                            onClick={() => abrirVista("dashboard")}
                            className={claseItem("dashboard")}
                            aria-current={vista === "dashboard" ? "page" : undefined}
                        >
                            <i className="bi bi-grid-1x2-fill" aria-hidden="true"></i>
                            <span>Dashboard</span>
                        </button>

                        {MENU_CATEGORIAS.map((categoria) => {
                            const abierta = Boolean(categoriasAbiertas[categoria.clave]);
                            const contenidoId = `menu-${categoria.clave}`;

                            return (
                                <section key={categoria.clave} className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCategoriasAbiertas((abiertasActuales) => ({
                                                ...abiertasActuales,
                                                [categoria.clave]: !abierta,
                                            }))
                                        }
                                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:bg-white/5 hover:text-white"
                                        aria-expanded={abierta}
                                        aria-controls={contenidoId}
                                    >
                                        <i className={`bi ${categoria.icono}`} aria-hidden="true"></i>
                                        <span className="flex-1">{categoria.nombre}</span>
                                        <i
                                            className={`bi bi-chevron-down transition-transform duration-200 ${
                                                abierta ? "rotate-180" : ""
                                            }`}
                                            aria-hidden="true"
                                        ></i>
                                    </button>

                                    {abierta && (
                                        <nav
                                            id={contenidoId}
                                            aria-label={categoria.nombre}
                                            className="ml-3 mt-1 space-y-1 border-l border-white/10 pl-2"
                                        >
                                            {categoria.opciones.map((opcion) => (
                                                <button
                                                    key={opcion.clave}
                                                    type="button"
                                                    onClick={() => abrirVista(opcion.clave)}
                                                    className={claseItem(opcion.clave)}
                                                    aria-current={
                                                        vista === opcion.clave ? "page" : undefined
                                                    }
                                                >
                                                    <i
                                                        className={`bi ${opcion.icono}`}
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>{opcion.nombre}</span>
                                                </button>
                                            ))}
                                        </nav>
                                    )}
                                </section>
                            );
                        })}

                    </nav>

                </div>


                {/* Usuario / Logout */}

                <div className="border-t border-white/10 p-4">

                    <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-hotel-gold text-slate-900">

                            <i className="bi bi-person-fill"></i>

                        </div>


                        <div className="min-w-0">

                            <p className="truncate text-sm font-semibold text-white">
                                <span>
                                    {usuario.logeo}
                                </span>
                            </p>

                            <p className="text-xs text-slate-400">
                               <span>
                                   Usuario tipo
                               </span> 
                               <span>
                                   {usuario.id_tipousuario}
                               </span>
                            </p>

                        </div>

                    </div>


                    <button
                        onClick={cerrarSesion}
                        className="
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-4
                            py-3
                            text-sm
                            text-slate-300
                            transition
                            hover:bg-red-500/10
                            hover:text-red-400
                        "
                    >

                        <i className="bi bi-box-arrow-left"></i>

                      <span>
                          Cerrar sesión
                      </span>
                    </button>

                </div>

            </aside>



            {/* =========================================
                CONTENIDO PRINCIPAL
            ========================================== */}

            <div className="lg:ml-72">


                {/* NAVBAR */}

                <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-gray-200 bg-white/95 px-5 shadow-sm backdrop-blur sm:px-8">

                    <div className="flex items-center gap-4">

                        <button
                            onClick={() =>
                                setSidebarOpen(true)
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
                        >
                            <i className="bi bi-list text-2xl" aria-hidden="true"></i>
                            <span className="sr-only">Abrir menú</span>
                        </button>


                        <div>

                            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                               <span>
                                   Sistema de Gestión Hotelera
                               </span>
                            </p>

                            <h1 className="font-['Playfair_Display'] text-xl font-bold text-slate-900 sm:text-2xl">
                               <span>
                                   Hotel Sol Ica
                               </span>
                            </h1>

                        </div>

                    </div>


                    <div className="flex items-center gap-3">

                        <button
                            className="
                                hidden
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-xl
                                text-gray-500
                                hover:bg-gray-100
                                sm:flex
                            "
                            title="Notificaciones"
                        >

                            <i className="bi bi-bell"></i>

                        </button>


                        <div className="hidden h-8 w-px bg-gray-200 sm:block"></div>


                        <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-800">

                                <i className="bi bi-person-fill"></i>

                            </div>


                            <div className="hidden sm:block">

                                <p className="text-sm font-semibold text-slate-800">
                                    <span>
                                        {usuario.logeo}
                                    </span>
                                </p>

                                <p className="text-xs text-gray-400">
                                   <span>
                                       Usuario autenticado
                                   </span>
                                </p>

                            </div>

                        </div>

                    </div>

                </header>



                {/* CONTENIDO */}

                <main className="p-5 sm:p-8">

                    {vista === "checkinout" && <CheckInOut />}

                    {vista === "reservas" && <Reservas onVerReservas={() => abrirVista("reservas_lista")} />}

                    {vista === "pagos" && <Pagos />}

                    {vista === "facturacion" && <Facturacion />}

                    {vista === "reportes" && <Reportes />}

                    {vista !== "dashboard" && ENTIDADES[vista] && (
                        <CrudModule key={vista} entidadKey={vista} />
                    )}

                    {vista === "reservas_lista" && (
                        <CrudModule key="reservas" entidadKey="reservas" />
                    )}

                    {vista === "dashboard" && (
                    <>


                    {/* HERO */}

                    <section
                        className="
                            relative
                            overflow-hidden
                            rounded-3xl
                            bg-gradient-to-br
                            from-slate-950
                            via-blue-950
                            to-blue-900
                            p-7
                            shadow-xl
                            sm:p-10
                        "
                    >

                        {/* Decoraciones */}

                        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"></div>

                        <div className="absolute -bottom-24 right-40 h-64 w-64 rounded-full bg-hotel-gold/10 blur-3xl"></div>


                        <div className="relative z-10 max-w-3xl">

                            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-medium text-blue-100">

                                <i className="bi bi-sun-fill text-hotel-gold"></i>

                              <span>
                                  Panel principal
                              </span>
                            </div>


                            <h2 className="font-['Playfair_Display'] text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">

                              <span>
                                  Bienvenido,
                              </span>
                                <span className="block text-hotel-gold">
                                    {usuario.logeo}
                                </span>

                            </h2>


                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">

                              <span>
                                  Administra las operaciones de
                                  Hotel Sol Ica desde una única
                                  plataforma. Consulta reservas,
                                  huéspedes, habitaciones, empleados, 
                                  servicios, y en general los
                                  principales servicios del hotel.
                              </span>
                            </p>


                            <div className="mt-7 flex flex-wrap gap-3">

                                <button
                                    onClick={() => abrirVista("reservas")}
                                    className="
                                        rounded-xl
                                        bg-hotel-gold
                                        px-5
                                        py-3
                                        text-sm
                                        font-semibold
                                        text-slate-950
                                        transition
                                        hover:-translate-y-0.5
                                        hover:bg-yellow-400
                                    "
                                >

                                    <i className="bi bi-calendar-plus mr-2"></i>

                                  <span>
                                      Nueva reserva
                                  </span>
                                </button>


                                <button
                                    onClick={() => abrirVista("habitaciones")}
                                    className="
                                        rounded-xl
                                        border
                                        border-white/20
                                        bg-white/10
                                        px-5
                                        py-3
                                        text-sm
                                        font-medium
                                        text-white
                                        backdrop-blur
                                        transition
                                        hover:bg-white/20
                                    "
                                >

                                    <i className="bi bi-bar-chart mr-2"></i>

                                  <span>
                                      Ver habitaciones
                                  </span>
                                </button>

                            </div>

                        </div>

                    </section>



                    {/* INDICADORES */}

                    <section className="mt-8">

                        <div className="mb-5">

                            <h2 className="text-lg font-bold text-slate-900">
                               <span>
                                   Resumen del sistema
                               </span>
                            </h2>

                            <p className="text-sm text-gray-500">
                               <span>
                                   Información general de la operación hotelera.
                               </span>
                            </p>

                        </div>


                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">


                            {/* Card 1 */}

                            <div className="dashboard-card">

                                <div className="flex items-start justify-between">

                                    <div>

                                        <p className="text-sm text-gray-500">
                                           <span>
                                               Reservas
                                           </span>
                                        </p>

                                        <p className="mt-2 text-3xl font-bold text-slate-900">
                                           <span>
                                               24
                                           </span>
                                        </p>

                                    </div>


                                    <div className="dashboard-icon bg-blue-100 text-blue-700">

                                        <i className="bi bi-calendar-check"></i>

                                    </div>

                                </div>


                                <div className="mt-4 flex items-center gap-2 text-xs">

                                    <span className="font-semibold text-emerald-600">
                                        +12%
                                    </span>

                                    <span className="text-gray-400">
                                        este mes
                                    </span>

                                </div>

                            </div>



                            {/* Card 2 */}

                            <div className="dashboard-card">

                                <div className="flex items-start justify-between">

                                    <div>

                                        <p className="text-sm text-gray-500">
                                           <span>
                                               Huéspedes
                                           </span>
                                        </p>

                                        <p className="mt-2 text-3xl font-bold text-slate-900">
                                           <span>
                                               48
                                           </span>
                                        </p>

                                    </div>


                                    <div className="dashboard-icon bg-emerald-100 text-emerald-700">

                                        <i className="bi bi-people"></i>

                                    </div>

                                </div>


                                <div className="mt-4 flex items-center gap-2 text-xs">

                                    <span className="font-semibold text-emerald-600">
                                        +8%
                                    </span>

                                    <span className="text-gray-400">
                                        este mes
                                    </span>

                                </div>

                            </div>



                            {/* Card 3 */}

                            <div className="dashboard-card">

                                <div className="flex items-start justify-between">

                                    <div>

                                        <p className="text-sm text-gray-500">
                                           <span>
                                               Habitaciones
                                           </span>
                                        </p>

                                        <p className="mt-2 text-3xl font-bold text-slate-900">
                                           <span>
                                               32
                                           </span>
                                        </p>

                                    </div>


                                    <div className="dashboard-icon bg-amber-100 text-amber-700">

                                        <i className="bi bi-door-open"></i>

                                    </div>

                                </div>


                                <div className="mt-4 flex items-center gap-2 text-xs">

                                    <span className="font-semibold text-amber-600">
                                        75%
                                    </span>

                                    <span className="text-gray-400">
                                        ocupación
                                    </span>

                                </div>

                            </div>



                            {/* Card 4 */}

                            <div className="dashboard-card">

                                <div className="flex items-start justify-between">

                                    <div>

                                        <p className="text-sm text-gray-500">
                                           <span>
                                               Disponibilidad
                                           </span>
                                        </p>

                                        <p className="mt-2 text-3xl font-bold text-slate-900">
                                           <span>
                                               8
                                           </span>
                                        </p>

                                    </div>


                                    <div className="dashboard-icon bg-purple-100 text-purple-700">

                                        <i className="bi bi-check-circle"></i>

                                    </div>

                                </div>


                                <div className="mt-4 flex items-center gap-2 text-xs">

                                    <span className="font-semibold text-emerald-600">
                                        Disponible
                                    </span>

                                    <span className="text-gray-400">
                                        ahora
                                    </span>

                                </div>

                            </div>

                        </div>

                    </section>



                    {/* MÓDULOS */}

                    <section className="mt-10">

                        <div className="mb-5">

                            <h2 className="text-lg font-bold text-slate-900">
                               <span>
                                   Módulos principales
                               </span>
                            </h2>

                            <p className="text-sm text-gray-500">
                               <span>
                                   Accede rápidamente a las áreas del sistema.
                               </span>
                            </p>

                        </div>


                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

                            {modulos.map((modulo) => (

                                <button
                                    key={modulo.nombre}
                                    onClick={() => modulo.clave && abrirVista(modulo.clave)}
                                    className="module-card text-left"
                                >

                                    <div className="flex items-start justify-between">

                                        <div className="module-icon">

                                            <i
                                                className={`bi ${modulo.icono}`}
                                            ></i>

                                        </div>


                                        <i
                                            className="
                                                bi
                                                bi-arrow-up-right
                                                module-arrow
                                            "
                                        ></i>

                                    </div>


                                    <h3 className="mt-5 font-semibold text-slate-900">
                                        <span>
                                            {modulo.nombre}
                                        </span>
                                    </h3>


                                    <p className="mt-2 text-sm leading-6 text-gray-500">
                                        <span>
                                            {modulo.descripcion}
                                        </span>
                                    </p>

                                </button>

                            ))}

                        </div>

                    </section>



                    {/* ACTIVIDAD */}

                    <section className="mt-10 grid gap-6 xl:grid-cols-3">


                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm xl:col-span-2">

                            <div className="flex items-center justify-between">

                                <div>

                                    <h2 className="font-bold text-slate-900">
                                       <span>
                                           Actividad reciente
                                       </span>
                                    </h2>

                                    <p className="mt-1 text-xs text-gray-400">
                                       <span>
                                           Resumen de las últimas operaciones.
                                       </span>
                                    </p>

                                </div>


                                <button onClick={() => abrirVista("reservas")} className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                                   <span>
                                       Ver reservas
                                   </span>
                                </button>

                            </div>


                            <div className="mt-6 space-y-4">


                                <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">

                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">

                                        <i className="bi bi-calendar-check"></i>

                                    </div>


                                    <div className="min-w-0 flex-1">

                                        <p className="text-sm font-medium text-slate-800">
                                           <span>
                                               Nueva reserva registrada
                                           </span>
                                        </p>

                                        <p className="mt-1 text-xs text-gray-400">
                                           <span>
                                               Hace 15 minutos
                                           </span>
                                        </p>

                                    </div>

                                    <span className="hidden rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 sm:block">
                                        Completado
                                    </span>

                                </div>



                                <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">

                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">

                                        <i className="bi bi-stars"></i>

                                    </div>


                                    <div className="min-w-0 flex-1">

                                        <p className="text-sm font-medium text-slate-800">
                                           <span>
                                               Tarea de limpieza actualizada
                                           </span>
                                        </p>

                                        <p className="mt-1 text-xs text-gray-400">
                                           <span>
                                               Hace 32 minutos
                                           </span>
                                        </p>

                                    </div>

                                    <span className="hidden rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 sm:block">
                                        Actualizado
                                    </span>

                                </div>



                                <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">

                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">

                                        <i className="bi bi-car-front"></i>

                                    </div>


                                    <div className="min-w-0 flex-1">

                                        <p className="text-sm font-medium text-slate-800">
                                           <span>
                                               Vehículo registrado en cochera
                                           </span>
                                        </p>

                                        <p className="mt-1 text-xs text-gray-400">
                                           <span>
                                               Hace 1 hora
                                           </span>
                                        </p>

                                    </div>

                                    <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 sm:block">
                                        En proceso
                                    </span>

                                </div>

                            </div>

                        </div>



                        {/* TARJETA USUARIO */}

                        <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-slate-950 p-6 text-white shadow-lg">

                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">

                                <i className="bi bi-person-check text-xl"></i>

                            </div>


                            <h2 className="mt-6 font-['Playfair_Display'] text-2xl font-bold">
                               <span>
                                   Sesión activa
                               </span>
                            </h2>


                            <p className="mt-2 text-sm leading-6 text-slate-300">
                               <span>
                                   Actualmente estás conectado al
                                   sistema como:
                               </span>
                            </p>


                            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">

                                <p className="text-lg font-semibold">
                                    <span>
                                        {usuario.logeo}
                                    </span>
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                   <span>
                                       ID de usuario:
                                   </span> 
                                   <span>
                                       {usuario.id_usuario}
                                   </span>
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                   <span>
                                       Tipo de usuario:
                                   </span> 
                                   <span>
                                       {usuario.id_tipousuario}
                                   </span>
                                </p>

                            </div>


                            <button
                                onClick={cerrarSesion}
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium transition hover:bg-white/20"
                            >

                                <i className="bi bi-box-arrow-left"></i>

                              <span>
                                  Cerrar sesión
                              </span>
                            </button>

                        </div>

                    </section>

                    </>
                    )}
                </main>

            </div>

        </div>
    );
};

export default Dashboard;