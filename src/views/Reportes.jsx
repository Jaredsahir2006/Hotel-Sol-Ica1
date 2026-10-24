import { useCallback, useEffect, useState } from "react";

import { obtenerReporte } from "../services/procesosService";
import { fecha, fechaHora, hoy, soles } from "../utils/format";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const inicioMes = () => {
    const d = new Date();
    d.setDate(1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const Tarjeta = ({ titulo, valor, detalle, icono, color }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
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

const Reportes = () => {
    const [desde, setDesde] = useState(inicioMes());
    const [hasta, setHasta] = useState(hoy());
    const [reporte, setReporte] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const cargar = useCallback(async (rango) => {
        setCargando(true);
        setError("");
        try {
            const data = await obtenerReporte(rango);
            setReporte(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar({ desde: inicioMes(), hasta: hoy() });
    }, [cargar]);

    const consultar = (e) => {
        e.preventDefault();
        cargar({ desde, hasta });
    };

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
                            Resumen de ventas, caja, comprobantes, ocupación y auditoría.
                        </p>
                    </div>
                </div>

                <form onSubmit={consultar} className="flex flex-wrap items-end gap-2">
                    <label className="block text-xs font-semibold text-slate-700">
                        Desde
                        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${inputClase} mt-1.5 font-normal`} />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Hasta
                        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`${inputClase} mt-1.5 font-normal`} />
                    </label>
                    <button
                        type="submit"
                        disabled={cargando}
                        className="rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
                    >
                        {cargando ? "Consultando..." : "Consultar"}
                    </button>
                </form>
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
