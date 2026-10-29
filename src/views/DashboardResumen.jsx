import { useCallback, useEffect, useState } from "react";
import { cargarResumenDashboard } from "../services/dashboardService";
import { soles } from "../utils/format";

const coloresEstado = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#64748b"];

const Indicador = ({ dato }) => {
    const colores = {
        blue: "bg-blue-100 text-blue-700",
        emerald: "bg-emerald-100 text-emerald-700",
        amber: "bg-amber-100 text-amber-700",
        violet: "bg-violet-100 text-violet-700",
    };

    return (
        <article className="dashboard-card">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500">{dato.etiqueta}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {dato.formato === "moneda" ? soles(dato.valor) : dato.valor.toLocaleString("es-PE")}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">{dato.detalle}</p>
                </div>
                <div className={`dashboard-icon ${colores[dato.color]}`}>
                    <i className={`bi ${dato.icono}`} aria-hidden="true"></i>
                </div>
            </div>
        </article>
    );
};

const GraficoIngresos = ({ grafico }) => {
    const valores = grafico.valores || [];
    const maximo = Math.max(1, ...valores);
    const puntos = valores.map((valor, indice) => {
        const x = 8 + (indice * 84) / Math.max(1, valores.length - 1);
        const y = 82 - (valor / maximo) * 68;
        return `${x},${y}`;
    });

    return (
        <div>
            {valores.some((valor) => valor > 0) ? (
                <svg
                    viewBox="0 0 100 90"
                    className="h-56 w-full"
                    role="img"
                    aria-label="Ingresos de caja por mes durante los últimos seis meses"
                >
                    {[20, 40, 60, 80].map((y) => (
                        <line key={y} x1="5" x2="95" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                    ))}
                    <polyline
                        points={puntos.join(" ")}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                    {valores.map((valor, indice) => (
                        <circle
                            key={grafico.etiquetas[indice]}
                            cx={8 + (indice * 84) / Math.max(1, valores.length - 1)}
                            cy={82 - (valor / maximo) * 68}
                            r="1.8"
                            fill="#2563eb"
                        >
                            <title>{`${grafico.etiquetas[indice]}: ${soles(valor)}`}</title>
                        </circle>
                    ))}
                </svg>
            ) : (
                <div className="flex h-56 items-center justify-center text-sm text-gray-400">
                    No hay ingresos de caja en los últimos seis meses.
                </div>
            )}
            <div className="grid grid-cols-6 text-center text-xs capitalize text-gray-500">
                {(grafico.etiquetas || []).map((etiqueta, indice) => (
                    <span key={`${etiqueta}-${indice}`}>{etiqueta}</span>
                ))}
            </div>
        </div>
    );
};

const GraficoHabitaciones = ({ estados }) => {
    const total = estados.reduce((suma, estado) => suma + estado.cantidad, 0);
    let acumulado = 0;
    const segmentos = estados.map((estado, indice) => {
        const desde = total ? (acumulado / total) * 100 : 0;
        acumulado += estado.cantidad;
        const hasta = total ? (acumulado / total) * 100 : 0;
        return `${coloresEstado[indice % coloresEstado.length]} ${desde}% ${hasta}%`;
    });

    return (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-6 sm:flex-row">
            <div
                className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
                style={{
                    background: total
                        ? `conic-gradient(${segmentos.join(", ")})`
                        : "#e2e8f0",
                }}
                role="img"
                aria-label={`Estado actual de ${total} habitaciones`}
            >
                <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
                    <strong className="text-2xl text-slate-900">{total}</strong>
                    <span className="text-xs text-gray-500">Habitaciones</span>
                </div>
            </div>
            <ul className="w-full space-y-3 sm:w-auto">
                {estados.length ? estados.map((estado, indice) => (
                    <li key={estado.estado} className="flex items-center justify-between gap-5 text-sm">
                        <span className="flex items-center gap-2 text-slate-600">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: coloresEstado[indice % coloresEstado.length] }}
                            />
                            {estado.estado}
                        </span>
                        <strong className="text-slate-900">{estado.cantidad}</strong>
                    </li>
                )) : (
                    <li className="text-sm text-gray-400">No hay habitaciones registradas.</li>
                )}
            </ul>
        </div>
    );
};

const estadoReservaColor = {
    "En curso": "bg-emerald-100 text-emerald-700",
    Pendiente: "bg-amber-100 text-amber-700",
    Próxima: "bg-blue-100 text-blue-700",
    Finalizada: "bg-slate-100 text-slate-600",
};

const DashboardResumen = () => {
    const [resumen, setResumen] = useState(null);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(true);
    const [actualizado, setActualizado] = useState(null);

    const cargar = useCallback(async (mostrarCarga = false) => {
        if (mostrarCarga) setCargando(true);
        setError("");

        try {
            const datos = await cargarResumenDashboard();
            setResumen(datos);
            setActualizado(new Date());
        } catch (errorCarga) {
            setError(errorCarga.message || "No se pudo cargar el resumen del hotel.");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar(true);
        const intervalo = window.setInterval(() => {
            if (document.visibilityState === "visible") cargar();
        }, 60_000);
        return () => window.clearInterval(intervalo);
    }, [cargar]);

    return (
        <section className="mt-8" aria-labelledby="dashboard-resumen-titulo">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 id="dashboard-resumen-titulo" className="text-lg font-bold text-slate-900">
                        Resumen del hotel
                    </h2>
                    <p className="text-sm text-gray-500">
                        Indicadores calculados con las operaciones guardadas en Supabase.
                        {actualizado && (
                            <span className="ml-1">
                                Actualizado {actualizado.toLocaleTimeString("es-PE", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => cargar(true)}
                    disabled={cargando}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
                >
                    <i className={`bi bi-arrow-clockwise ${cargando ? "animate-spin" : ""}`} aria-hidden="true" />
                    Actualizar
                </button>
            </div>

            {error && (
                <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <span>{error}</span>
                    <button type="button" className="font-semibold underline" onClick={() => cargar(true)}>
                        Reintentar
                    </button>
                </div>
            )}

            {cargando && !resumen ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Cargando indicadores">
                    {[0, 1, 2, 3].map((elemento) => (
                        <div key={elemento} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
                    ))}
                </div>
            ) : resumen ? (
                <>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {resumen.indicadores.map((indicador) => (
                            <Indicador key={indicador.id} dato={indicador} />
                        ))}
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-5">
                        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-3">
                            <h3 className="font-bold text-slate-900">Ingresos de caja · últimos 6 meses</h3>
                            <p className="mt-1 text-xs text-gray-500">Suma de los movimientos clasificados como ingreso.</p>
                            <div className="mt-4">
                                <GraficoIngresos grafico={resumen.graficoIngresos} />
                            </div>
                        </article>

                        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
                            <h3 className="font-bold text-slate-900">Estado de habitaciones</h3>
                            <p className="mt-1 text-xs text-gray-500">Distribución actual del inventario activo.</p>
                            <div className="mt-4">
                                <GraficoHabitaciones estados={resumen.graficoHabitaciones} />
                            </div>
                        </article>
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-5">
                        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-3">
                            <div className="flex items-center justify-between gap-3 p-5">
                                <div>
                                    <h3 className="font-bold text-slate-900">Últimas reservas</h3>
                                    <p className="mt-1 text-xs text-gray-500">Registros recientes de recepción.</p>
                                </div>
                            </div>
                            {resumen.reservasRecientes.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[560px] text-left text-sm">
                                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                            <tr>
                                                <th className="px-5 py-3">Reserva</th>
                                                <th className="px-5 py-3">Habitación</th>
                                                <th className="px-5 py-3">Entrada</th>
                                                <th className="px-5 py-3">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {resumen.reservasRecientes.map((reserva) => (
                                                <tr key={reserva.id}>
                                                    <td className="px-5 py-3 font-medium text-slate-800">#{reserva.id}</td>
                                                    <td className="px-5 py-3 text-slate-600">{reserva.habitacion}</td>
                                                    <td className="px-5 py-3 text-slate-600">{reserva.entrada}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estadoReservaColor[reserva.estado] || "bg-slate-100 text-slate-600"}`}>
                                                            {reserva.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="px-5 pb-5 text-sm text-gray-400">Todavía no hay reservas registradas.</p>
                            )}
                        </article>

                        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
                            <h3 className="font-bold text-slate-900">Actividad reciente</h3>
                            <p className="mt-1 text-xs text-gray-500">Reservas y movimientos de caja reales.</p>
                            <div className="mt-5 space-y-4">
                                {resumen.actividades.length ? resumen.actividades.map((actividad) => (
                                    <div key={actividad.id} className="flex items-start gap-3">
                                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                            actividad.tipo === "reserva"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-emerald-100 text-emerald-700"
                                        }`}>
                                            <i className={`bi ${actividad.tipo === "reserva" ? "bi-calendar-check" : "bi-cash-coin"}`} aria-hidden="true" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800">{actividad.titulo}</p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {actividad.fechaTexto}
                                                {actividad.habitacion ? ` · Hab. ${actividad.habitacion}` : ""}
                                                {actividad.descripcion ? ` · ${actividad.descripcion}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-sm text-gray-400">No hay operaciones recientes para mostrar.</p>
                                )}
                            </div>
                        </article>
                    </div>
                </>
            ) : null}
        </section>
    );
};

export default DashboardResumen;
