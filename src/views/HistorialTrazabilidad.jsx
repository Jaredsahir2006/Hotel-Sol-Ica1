import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import Paginacion from "../components/Paginacion";
import { listarHistorial, listarUsuariosHistorial } from "../services/historialService";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const fechaLocal = (fecha) => {
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime())
        ? String(fecha || "-")
        : valor.toLocaleString("es-PE", {
              dateStyle: "medium",
              timeStyle: "short",
          });
};

const valorDetalle = (valor) => {
    if (valor == null || valor === "") return "Sin información registrada";
    if (typeof valor !== "string") return JSON.stringify(valor, null, 2);
    try {
        return JSON.stringify(JSON.parse(valor), null, 2);
    } catch {
        return valor;
    }
};

const fechaISO = (fecha) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
        fecha.getDate()
    ).padStart(2, "0")}`;

const fechaPorDefecto = () => {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - 29);
    return { desde: fechaISO(inicio), hasta: fechaISO(hoy) };
};

const HistorialTrazabilidad = () => {
    const rangoInicial = useMemo(fechaPorDefecto, []);
    const [filtros, setFiltros] = useState({
        ...rangoInicial,
        usuario: "",
        accion: "",
        tabla: "",
        busqueda: "",
    });
    const [filtrosAplicados, setFiltrosAplicados] = useState(filtros);
    const [usuarios, setUsuarios] = useState([]);
    const [eventos, setEventos] = useState([]);
    const [pagina, setPagina] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [errorUsuarios, setErrorUsuarios] = useState("");
    const [idExpandido, setIdExpandido] = useState(null);
    const solicitudActual = useRef(0);

    const cargar = useCallback(async () => {
        const solicitud = ++solicitudActual.current;
        setCargando(true);
        setError("");
        try {
            const resultado = await listarHistorial({
                ...filtrosAplicados,
                pagina,
                pageSize,
            });
            if (solicitud !== solicitudActual.current) return;
            if (pagina > resultado.totalPaginas) {
                setPagina(resultado.totalPaginas);
                return;
            }
            setEventos(resultado.data);
            setTotal(resultado.total);
            setTotalPaginas(resultado.totalPaginas);
            setIdExpandido(null);
        } catch (errorCarga) {
            if (solicitud === solicitudActual.current) {
                setEventos([]);
                setTotal(0);
                setTotalPaginas(1);
                setError(`No se pudo cargar el historial: ${errorCarga.message}`);
            }
        } finally {
            if (solicitud === solicitudActual.current) setCargando(false);
        }
    }, [filtrosAplicados, pagina, pageSize]);

    useEffect(() => {
        let vigente = true;
        listarUsuariosHistorial()
            .then((filas) => {
                if (vigente) setUsuarios(filas);
            })
            .catch((errorCarga) => {
                if (vigente) {
                    setErrorUsuarios(`No se pudieron cargar los usuarios para filtrar: ${errorCarga.message}`);
                }
            });
        return () => {
            vigente = false;
        };
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const usuariosPorId = useMemo(
        () => new Map(usuarios.map((usuario) => [String(usuario.id_usuario), usuario.logeo])),
        [usuarios]
    );
    const tablas = useMemo(
        () =>
            [...new Set(eventos.map((evento) => evento.n_tabla).filter(Boolean))].sort((a, b) =>
                String(a).localeCompare(String(b), "es")
            ),
        [eventos]
    );

    const cambiarFiltro = (evento) => {
        setFiltros((actuales) => ({
            ...actuales,
            [evento.target.name]: evento.target.value,
        }));
    };

    const aplicarFiltros = (evento) => {
        evento.preventDefault();
        if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
            setError("La fecha inicial no puede ser posterior a la fecha final.");
            return;
        }
        setError("");
        setPagina(1);
        setFiltrosAplicados({ ...filtros });
    };

    const limpiarFiltros = () => {
        const iniciales = {
            ...rangoInicial,
            usuario: "",
            accion: "",
            tabla: "",
            busqueda: "",
        };
        setFiltros(iniciales);
        setFiltrosAplicados(iniciales);
        setPagina(1);
        setError("");
    };

    const inicio = (pagina - 1) * pageSize;
    const fin = Math.min(inicio + eventos.length, total);

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                        <i className="bi bi-shield-check" aria-hidden="true"></i>
                        Trazabilidad del sistema
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Historial y trazabilidad</h2>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">
                        Consulta los cambios registrados en la auditoría de Supabase, identifica quién
                        los realizó y revisa los valores anteriores y nuevos disponibles.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={cargar}
                    disabled={cargando}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                >
                    <i className={`bi bi-arrow-clockwise ${cargando ? "animate-spin" : ""}`} aria-hidden="true"></i>
                    Actualizar
                </button>
            </header>

            <form
                onSubmit={aplicarFiltros}
                className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-6"
            >
                <label className="text-xs font-semibold text-slate-600">
                    Desde
                    <input className={`${inputClase} mt-1`} type="date" name="desde" value={filtros.desde} onChange={cambiarFiltro} />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    Hasta
                    <input className={`${inputClase} mt-1`} type="date" name="hasta" value={filtros.hasta} onChange={cambiarFiltro} />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    Usuario
                    <select className={`${inputClase} mt-1`} name="usuario" value={filtros.usuario} onChange={cambiarFiltro}>
                        <option value="">Todos los usuarios</option>
                        {usuarios.map((usuario) => (
                            <option key={usuario.id_usuario} value={usuario.id_usuario}>{usuario.logeo}</option>
                        ))}
                    </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    Acción
                    <select className={`${inputClase} mt-1`} name="accion" value={filtros.accion} onChange={cambiarFiltro}>
                        <option value="">Todas las acciones</option>
                        <option value="INSERT">Insertar</option>
                        <option value="UPDATE">Actualizar</option>
                        <option value="DELETE">Eliminar</option>
                    </select>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    Tabla
                    <input
                        className={`${inputClase} mt-1`}
                        type="text"
                        name="tabla"
                        value={filtros.tabla}
                        onChange={cambiarFiltro}
                        list="tablas-historial"
                        placeholder="Ej. RECEPCION"
                    />
                    <datalist id="tablas-historial">
                        {tablas.map((tabla) => <option key={tabla} value={tabla} />)}
                    </datalist>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    Buscar
                    <input
                        className={`${inputClase} mt-1`}
                        type="search"
                        name="busqueda"
                        value={filtros.busqueda}
                        onChange={cambiarFiltro}
                        placeholder="Tabla, terminal o ID"
                    />
                </label>
                <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-6">
                    <button
                        type="submit"
                        disabled={cargando}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
                    >
                        <i className="bi bi-funnel" aria-hidden="true"></i>
                        Aplicar filtros
                    </button>
                    <button
                        type="button"
                        onClick={limpiarFiltros}
                        disabled={cargando}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        Limpiar
                    </button>
                    <span className="ml-auto text-sm text-slate-500" aria-live="polite">
                        {cargando ? "Consultando historial…" : `${total} evento${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}`}
                    </span>
                </div>
            </form>

            {(error || errorUsuarios) && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <i className="bi bi-exclamation-triangle mt-0.5" aria-hidden="true"></i>
                    <span>{error || errorUsuarios}</span>
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h3 className="font-bold text-slate-900">Eventos de auditoría</h3>
                    <p className="mt-1 text-xs text-slate-500">
                        Se muestran los eventos disponibles en la tabla de auditoría. Los detalles dependen de la información guardada en cada evento.
                    </p>
                </div>
                {cargando && eventos.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-500">
                        <i className="bi bi-arrow-repeat mb-2 block text-2xl" aria-hidden="true"></i>
                        Cargando registros…
                    </div>
                ) : eventos.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-500">
                        <i className="bi bi-clock-history mb-2 block text-3xl text-slate-300" aria-hidden="true"></i>
                        No hay eventos de auditoría para los filtros seleccionados.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">Fecha y hora</th>
                                    <th className="px-5 py-3">Usuario</th>
                                    <th className="px-5 py-3">Acción</th>
                                    <th className="px-5 py-3">Tabla / registro</th>
                                    <th className="px-5 py-3">Terminal / IP</th>
                                    <th className="px-5 py-3 text-right">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {eventos.map((evento) => {
                                    const expandido = String(idExpandido) === String(evento.id_auditoria);
                                    const accion = String(evento.accion || "").toUpperCase();
                                    const claseAccion = accion === "INSERT"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : accion === "DELETE"
                                          ? "bg-red-50 text-red-700"
                                          : "bg-amber-50 text-amber-700";
                                    return (
                                        <Fragment key={evento.id_auditoria}>
                                            <tr className="hover:bg-slate-50/70">
                                                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{fechaLocal(evento.f_evento)}</td>
                                                <td className="px-5 py-4 font-medium text-slate-800">
                                                    {usuariosPorId.get(String(evento.id_usuario)) || `Usuario #${evento.id_usuario || "—"}`}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${claseAccion}`}>
                                                        {accion || "SIN ACCIÓN"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="font-semibold text-slate-800">{evento.n_tabla || "—"}</span>
                                                    <span className="ml-2 text-xs text-slate-500">#{evento.id_registro || "—"}</span>
                                                </td>
                                                <td className="px-5 py-4 text-xs text-slate-600">
                                                    <div>{evento.terminal || "—"}</div>
                                                    <div className="mt-1 text-slate-400">{evento.ip || "IP no registrada"}</div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        aria-expanded={expandido}
                                                        onClick={() => setIdExpandido(expandido ? null : evento.id_auditoria)}
                                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50"
                                                    >
                                                        {expandido ? "Ocultar" : "Ver cambios"}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandido && (
                                                <tr className="bg-slate-50">
                                                    <td colSpan="6" className="px-5 py-4">
                                                        <div className="grid gap-4 md:grid-cols-2">
                                                            <div>
                                                                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Valor anterior</h4>
                                                                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">{valorDetalle(evento.valor_anterior)}</pre>
                                                            </div>
                                                            <div>
                                                                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Valor nuevo</h4>
                                                                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">{valorDetalle(evento.valor_nuevo)}</pre>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {total > 0 && (
                <Paginacion
                    total={total}
                    pagina={pagina}
                    pageSize={pageSize}
                    totalPaginas={totalPaginas}
                    desde={inicio}
                    hasta={fin}
                    setPagina={setPagina}
                    setPageSize={setPageSize}
                    cargando={cargando}
                />
            )}
        </div>
    );
};

export default HistorialTrazabilidad;
