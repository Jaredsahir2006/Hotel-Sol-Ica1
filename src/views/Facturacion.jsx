import { useCallback, useEffect, useMemo, useState } from "react";

import {
    emitirComprobante,
    listarAperturasAbiertas,
    listarComprobantes,
    listarRecepcionesFacturables,
} from "../services/procesosService";
import { fechaHora, soles } from "../utils/format";
import Paginacion from "../components/Paginacion";
import { usePaginacion } from "../hooks/usePaginacion";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const Facturacion = () => {
    const [comprobantes, setComprobantes] = useState([]);
    const [recepciones, setRecepciones] = useState([]);
    const [aperturas, setAperturas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState(null);
    const [filtro, setFiltro] = useState("TODOS");
    const [busqueda, setBusqueda] = useState("");

    const [form, setForm] = useState({
        id_recepcion: "",
        tipo: "BOLETA",
        serie: "B001",
    });

    const avisar = (mensaje, ok = true) => {
        setToast({ mensaje, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const [c, r, a] = await Promise.all([
                listarComprobantes(),
                listarRecepcionesFacturables(),
                listarAperturasAbiertas(),
            ]);
            setComprobantes(c);
            setRecepciones(r);
            setAperturas(a);
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const recepcionSeleccionada = useMemo(
        () => recepciones.find((r) => String(r.id_recepcion) === String(form.id_recepcion)),
        [recepciones, form.id_recepcion]
    );

    const cambiar = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
            ...(name === "tipo" ? { serie: value === "FACTURA" ? "F001" : "B001" } : {}),
        }));
    };

    const emitir = async (e) => {
        e.preventDefault();
        if (!form.id_recepcion) {
            avisar("Selecciona una recepción para emitir el comprobante.", false);
            return;
        }

        setGuardando(true);
        try {
            const resultado = await emitirComprobante({
                id_recepcion: Number(form.id_recepcion),
                tipo: form.tipo,
                serie: form.serie,
            });
            await cargar();
            setForm((prev) => ({ ...prev, id_recepcion: "" }));
            avisar(
                resultado.yaExistia
                    ? "La recepción ya tenía un comprobante de ese tipo."
                    : `${resultado.tipo} emitida correctamente.`
            );
        } catch (errorEmitir) {
            avisar(errorEmitir.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const filtrados = comprobantes.filter((c) => {
        if (filtro !== "TODOS" && c.tipo !== filtro) return false;
        const texto = `${c.serie}-${c.numero} ${c.cliente_nombre} ${c.cliente_documento} #${c.id_recepcion}`.toLowerCase();
        return texto.includes(busqueda.toLowerCase());
    });

    const totalFacturado = filtrados.reduce((s, c) => s + (Number(c.total) || 0), 0);
    const paginacion = usePaginacion(filtrados.length);
    const comprobantesPagina = filtrados.slice(paginacion.desde, paginacion.hasta);

    return (
        <div>
            <div className="mb-6 flex items-center gap-4">
                <div className="module-icon">
                    <i className="bi bi-receipt"></i>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Facturación</h2>
                    <p className="text-sm text-gray-500">
                        Emite boletas y facturas para las recepciones del hotel.
                    </p>
                </div>
            </div>

            <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                La numeración y el registro de boletas/facturas de este módulo son internos; no se envían ni validan ante SUNAT.
            </p>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <i className="bi bi-exclamation-triangle mr-2"></i>
                    {error}
                </div>
            )}

            <form onSubmit={emitir} className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-semibold text-slate-900">Emitir comprobante</h3>

                {aperturas.length === 0 && (
                    <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Debes abrir una caja desde Finanzas y caja antes de emitir nuevos comprobantes.
                    </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="block text-xs font-semibold text-slate-700 xl:col-span-2">
                        Recepción *
                        <select name="id_recepcion" value={form.id_recepcion} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                            <option value="">-- Seleccione --</option>
                            {recepciones.map((r) => (
                                <option key={r.id_recepcion} value={r.id_recepcion}>
                                    #{r.id_recepcion} · {r.cliente_nombre} · {soles(Number(r.d_inicial || 0) + Number(r.d_asistente || 0))}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                        Tipo *
                        <select name="tipo" value={form.tipo} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                            <option value="BOLETA">BOLETA</option>
                            <option value="FACTURA">FACTURA</option>
                        </select>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                        Serie *
                        <input type="text" name="serie" value={form.serie} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
                    </label>
                </div>

                {recepcionSeleccionada && (
                    <div className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm sm:grid-cols-4">
                        <div>
                            <p className="text-xs text-blue-500">Cliente</p>
                            <p className="font-semibold text-blue-900">{recepcionSeleccionada.cliente_nombre}</p>
                        </div>
                        <div>
                            <p className="text-xs text-blue-500">Documento</p>
                            <p className="font-semibold text-blue-900">{recepcionSeleccionada.cliente_documento || "-"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-blue-500">Habitación</p>
                            <p className="font-semibold text-blue-900">Hab. {recepcionSeleccionada.habitacion_numero}</p>
                        </div>
                        <div>
                            <p className="text-xs text-blue-500">Total de la cuenta</p>
                            <p className="font-semibold text-blue-900">
                                {soles(Number(recepcionSeleccionada.d_inicial || 0) + Number(recepcionSeleccionada.d_asistente || 0))}
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-5">
                    <button
                        type="submit"
                        disabled={guardando || aperturas.length === 0}
                        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {guardando ? "Emitiendo..." : "Emitir comprobante"}
                    </button>
                </div>
            </form>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                    <h3 className="font-semibold text-slate-900">Comprobantes emitidos</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-slate-500">
                            Total: <strong className="text-slate-800">{soles(totalFacturado)}</strong>
                        </span>
                        <select
                            value={filtro}
                            onChange={(e) => {
                                setFiltro(e.target.value);
                                paginacion.setPagina(1);
                            }}
                            className={`${inputClase} w-auto`}
                        >
                            <option value="TODOS">Todos</option>
                            <option value="FACTURA">Facturas</option>
                            <option value="BOLETA">Boletas</option>
                        </select>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                paginacion.setPagina(1);
                            }}
                            placeholder="Buscar comprobante..."
                            className={`${inputClase} w-auto`}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3 font-semibold">Tipo</th>
                                <th className="px-5 py-3 font-semibold">Serie - Número</th>
                                <th className="px-5 py-3 font-semibold">Emisión</th>
                                <th className="px-5 py-3 font-semibold">Recepción</th>
                                <th className="px-5 py-3 font-semibold">Cliente</th>
                                <th className="px-5 py-3 font-semibold">Documento</th>
                                <th className="px-5 py-3 font-semibold">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cargando ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">Cargando...</td>
                                </tr>
                            ) : filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">Sin comprobantes</td>
                                </tr>
                            ) : (
                                comprobantesPagina.map((c) => (
                                    <tr key={`${c.tipo}-${c[c.pk]}`} className="hover:bg-slate-50">
                                        <td className="px-5 py-3">
                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.tipo === "FACTURA" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                                {c.tipo}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 font-semibold text-slate-700">{String(c.serie).trim()}-{c.numero}</td>
                                        <td className="px-5 py-3 text-slate-700">{fechaHora(c.f_emision)}</td>
                                        <td className="px-5 py-3 text-slate-700">#{c.id_recepcion}</td>
                                        <td className="px-5 py-3 text-slate-700">{c.cliente_nombre}</td>
                                        <td className="px-5 py-3 text-slate-700">{c.cliente_documento}</td>
                                        <td className="px-5 py-3 font-semibold text-slate-800">{soles(c.total)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <Paginacion {...paginacion} total={filtrados.length} cargando={cargando} />

            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
                    {toast.mensaje}
                </div>
            )}
        </div>
    );
};

export default Facturacion;
