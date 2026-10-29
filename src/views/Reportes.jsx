import { useCallback, useEffect, useMemo, useState } from "react";

import { generarReporte, obtenerCatalogoReportes } from "../services/reportesService";
import { fecha, fechaHora, hoy, soles } from "../utils/format";
import { exportarReportePdf, exportarReporteExcel } from "../utils/exportarReportes";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const selectClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const inicioMes = () => {
    const d = new Date();
    d.setDate(1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const colores = [
    "#1d4ed8",
    "#0f766e",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#65a30d",
    "#db2777",
    "#475569",
    "#ca8a04",
];

const Tarjeta = ({ titulo, valor, detalle, icono, color }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className="text-sm text-gray-500">{titulo}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{valor}</p>
                {detalle && <p className="mt-1 text-xs text-gray-400">{detalle}</p>}
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                <i className={`bi ${icono}`}></i>
            </div>
        </div>
    </div>
);

const formatearValor = (valor, formato) => {
    if (valor == null || valor === "") return "-";
    if (formato === "moneda") return soles(valor);
    if (formato === "porcentaje") return `${Number(valor).toLocaleString("es-PE")}%`;
    if (formato === "numero") {
        const num = Number(valor);
        if (!Number.isFinite(num)) return valor;
        return num.toLocaleString("es-PE");
    }
    if (formato === "fecha") return fecha(valor);
    if (formato === "fecha-hora") return fechaHora(valor);
    return valor;
};

const Grafico = ({ grafico }) => {
    const etiquetas = grafico.etiquetas || [];
    const series = grafico.series || [];
    if (!etiquetas.length || !series.length) {
        return (
            <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-gray-400">
                Sin datos para graficar
            </div>
        );
    }

    const maximo = Math.max(
        1,
        ...series.flatMap((serie) => (serie.valores || []).map((v) => Math.abs(Number(v) || 0)))
    );

    if (grafico.tipo === "donut") {
        let acumulado = 0;
        const total = (series[0]?.valores || []).reduce((s, v) => s + Math.abs(Number(v) || 0), 0) || 1;
        const radios = [];
        const size = 180;
        const r = 70;
        const circ = 2 * Math.PI * r;

        (series[0]?.valores || []).forEach((valor, i) => {
            const v = Math.abs(Number(valor) || 0);
            const ratio = v / total;
            const dash = ratio * circ;
            const gap = circ - dash;
            const offset = circ - acumulado;
            radios.push({ color: series[0].color || colores[i % colores.length], dash, gap, offset, valor: v });
            acumulado += dash;
        });

        return (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
                        <circle r={r} cx="0" cy="0" fill="transparent" stroke="#f1f5f9" strokeWidth="28" />
                        {radios.map((seg, i) => (
                            <circle
                                key={i}
                                r={r}
                                cx="0"
                                cy="0"
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth="28"
                                strokeDasharray={`${seg.dash} ${seg.gap}`}
                                strokeDashoffset={seg.offset}
                            />
                        ))}
                    </g>
                </svg>
                <div className="flex w-full flex-col gap-2 sm:max-w-xs">
                    {(series[0]?.valores || []).map((valor, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: series[0].color || colores[i % colores.length] }}
                                ></span>
                                <span className="text-slate-600">{etiquetas[i] || series[0].nombre}</span>
                            </div>
                            <span className="font-semibold text-slate-900">
                                {formatearValor(valor, grafico.formato)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (grafico.tipo === "lineas") {
        const valores = series[0]?.valores || [];
        const puntos = valores.map((v, i) => {
            const x = (i / Math.max(1, valores.length - 1)) * 100;
            const y = 100 - ((Number(v) || 0) / maximo) * 80;
            return `${x},${y}`;
        });
        return (
            <div>
                <svg viewBox="0 0 100 100" className="h-64 w-full">
                    <polyline
                        fill="none"
                        stroke={series[0].color || colores[0]}
                        strokeWidth="2"
                        points={puntos.join(" ")}
                    />
                    {valores.map((v, i) => {
                        const x = (i / Math.max(1, valores.length - 1)) * 100;
                        const y = 100 - ((Number(v) || 0) / maximo) * 80;
                        return <circle key={i} cx={x} cy={y} r="1.6" fill={series[0].color || colores[0]} />;
                    })}
                </svg>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                    {etiquetas.map((et, i) => (
                        <span key={i}>{et}</span>
                    ))}
                </div>
            </div>
        );
    }

    if (grafico.tipo === "barras-horizontales") {
        return (
            <div className="space-y-3">
                {etiquetas.map((et, idx) => {
                    const v = Number(series[0]?.valores?.[idx] || 0);
                    const ancho = maximo ? (Math.abs(v) / maximo) * 100 : 0;
                    return (
                        <div key={idx}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="text-slate-600">{et}</span>
                                <span className="font-semibold text-slate-900">{formatearValor(v, grafico.formato)}</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-100">
                                <div
                                    className="h-2.5 rounded-full"
                                    style={{ width: `${Math.max(4, ancho)}%`, backgroundColor: series[0].color || colores[idx % colores.length] }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div>
            <svg viewBox="0 0 100 100" className="h-64 w-full">
                {(series[0]?.valores || []).map((_, i) => (
                    <line key={i} x1={(i + 1) * 20} y1="10" x2={(i + 1) * 20} y2="90" stroke="#e5e7eb" strokeWidth="0.4" />
                ))}
                {series.map((serie, sIdx) => {
                    const valores = serie.valores || [];
                    const ancho = 100 / Math.max(1, valores.length);
                    return valores.map((v, i) => {
                        const h = maximo ? ((Number(v) || 0) / maximo) * 70 : 0;
                        const x = i * ancho + ancho * 0.15 + sIdx * (ancho * 0.35);
                        const w = ancho * 0.35;
                        return (
                            <rect
                                key={`${sIdx}-${i}`}
                                x={x}
                                y={90 - h}
                                width={w}
                                height={h}
                                rx="1"
                                fill={serie.color || colores[sIdx % colores.length]}
                            />
                        );
                    });
                })}
            </svg>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                {etiquetas.map((et, i) => (
                    <span key={i}>{et}</span>
                ))}
            </div>
            {series.length > 1 && (
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    {series.map((serie, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: serie.color || colores[i % colores.length] }}></span>
                            <span>{serie.nombre}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Reportes = () => {
    const [catalogo, setCatalogo] = useState(null);
    const [reporteId, setReporteId] = useState("resumen");
    const [filtros, setFiltros] = useState({
        desde: inicioMes(),
        hasta: hoy(),
        periodo: "mes",
    });
    const [reporte, setReporte] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
    const [error, setError] = useState("");

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="module-icon">
                        <i className="bi bi-bar-chart"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Reportes</h2>
                        <p className="text-sm text-gray-500">
                            Reportes generales, operativos y estadísticos con filtros reales desde Supabase.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <i className="bi bi-exclamation-triangle mr-2"></i>
                    {error}
                </div>
            )}

            {!reporte && cargando ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
                    Cargando reporte...
                </div>
            ) : reporte ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Tarjeta
                            titulo="Ventas registradas"
                            valor={soles(reporte.ventas.total)}
                            detalle={`${reporte.ventas.cantidad} venta(s) en el período`}
                            icono="bi-cash-coin"
                            color="bg-emerald-100 text-emerald-700"
                        />
                        <Tarjeta
                            titulo="Ingresos de caja"
                            valor={soles(reporte.caja.ingresos)}
                            detalle={`${reporte.caja.movimientos} movimiento(s)`}
                            icono="bi-arrow-down-left-circle"
                            color="bg-blue-100 text-blue-700"
                        />
                        <Tarjeta
                            titulo="Egresos de caja"
                            valor={soles(reporte.caja.egresos)}
                            detalle={`Neto: ${soles(reporte.caja.neto)}`}
                            icono="bi-arrow-up-right-circle"
                            color="bg-red-100 text-red-700"
                        />
                        <Tarjeta
                            titulo="Comprobantes"
                            valor={reporte.comprobantes.total}
                            detalle={`${reporte.comprobantes.facturas} factura(s) · ${reporte.comprobantes.boletas} boleta(s)`}
                            icono="bi-receipt"
                            color="bg-amber-100 text-amber-700"
                        />
                        <Tarjeta
                            titulo="Total facturado"
                            valor={soles(reporte.comprobantes.totalFacturado)}
                            detalle="Según recepciones asociadas"
                            icono="bi-file-earmark-text"
                            color="bg-indigo-100 text-indigo-700"
                        />
                        <Tarjeta
                            titulo="Habitaciones ocupadas"
                            valor={reporte.ocupacion.ocupadas}
                            detalle={`${reporte.ocupacion.disponibles} disponible(s) de ${reporte.ocupacion.total}`}
                            icono="bi-door-open"
                            color="bg-purple-100 text-purple-700"
                        />
                        <Tarjeta
                            titulo="Turnos de caja"
                            valor={reporte.aperturas}
                            detalle="Aperturas en el período"
                            icono="bi-safe"
                            color="bg-cyan-100 text-cyan-700"
                        />
                        <Tarjeta
                            titulo="Eventos de auditoría"
                            valor={reporte.auditoria}
                            detalle="Operaciones registradas"
                            icono="bi-clock-history"
                            color="bg-slate-200 text-slate-700"
                        />
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-2">
                        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-100 px-5 py-4">
                                <h3 className="font-semibold text-slate-900">Productos más vendidos</h3>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Producto</th>
                                        <th className="px-5 py-3 font-semibold">Cantidad</th>
                                        <th className="px-5 py-3 font-semibold">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {reporte.topProductos.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-5 py-8 text-center text-gray-400">Sin detalle de ventas</td>
                                        </tr>
                                    ) : (
                                        reporte.topProductos.map((p) => (
                                            <tr key={p.id_producto} className="hover:bg-slate-50">
                                                <td className="px-5 py-3 text-slate-700">{p.nombre}</td>
                                                <td className="px-5 py-3 text-slate-700">{p.cantidad}</td>
                                                <td className="px-5 py-3 font-semibold text-slate-800">{soles(p.total)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-100 px-5 py-4">
                                <h3 className="font-semibold text-slate-900">Últimos movimientos de caja</h3>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Fecha</th>
                                        <th className="px-5 py-3 font-semibold">Descripción</th>
                                        <th className="px-5 py-3 font-semibold">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {reporte.ultimosMovimientos.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-5 py-8 text-center text-gray-400">Sin movimientos</td>
                                        </tr>
                                    ) : (
                                        reporte.ultimosMovimientos.map((m) => (
                                            <tr key={m.id_movimientocaja} className="hover:bg-slate-50">
                                                <td className="px-5 py-3 text-slate-700">{fecha(m.f_movimiento)}</td>
                                                <td className="px-5 py-3 text-slate-700">{m.descripcion || "-"}</td>
                                                <td className="px-5 py-3 font-semibold text-slate-800">{soles(m.monto)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </section>
                    </div>

                    <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-5 py-4">
                            <h3 className="font-semibold text-slate-900">Últimos eventos de auditoría</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Fecha</th>
                                        <th className="px-5 py-3 font-semibold">Tabla</th>
                                        <th className="px-5 py-3 font-semibold">Acción</th>
                                        <th className="px-5 py-3 font-semibold">ID registro</th>
                                        <th className="px-5 py-3 font-semibold">Terminal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {reporte.ultimosEventos.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-8 text-center text-gray-400">Sin eventos</td>
                                        </tr>
                                    ) : (
                                        reporte.ultimosEventos.map((e) => (
                                            <tr key={e.id_auditoria} className="hover:bg-slate-50">
                                                <td className="px-5 py-3 text-slate-700">{fechaHora(e.f_evento)}</td>
                                                <td className="px-5 py-3 font-medium text-slate-700">{e.n_tabla}</td>
                                                <td className="px-5 py-3">
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                                        {e.accion}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-slate-700">{e.id_registro}</td>
                                                <td className="px-5 py-3 text-slate-700">{e.terminal || "-"}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            ) : null}
        </div>
    );
};

export default Reportes;
