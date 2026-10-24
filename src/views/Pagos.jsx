import { useCallback, useEffect, useMemo, useState } from "react";

import {
    abrirCaja,
    cerrarCaja,
    listarAperturasAbiertas,
    listarCatalogosPago,
    listarPagos,
    listarRecepcionesActivas,
    registrarPago,
} from "../services/procesosService";
import { fechaHora, soles } from "../utils/format";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const Pagos = () => {
    const [catalogos, setCatalogos] = useState({ cajas: [], usuarios: [], metodos: [], conceptos: [], tipos: [] });
    const [aperturas, setAperturas] = useState([]);
    const [recepciones, setRecepciones] = useState([]);
    const [pagos, setPagos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState(null);
    const [mostrarApertura, setMostrarApertura] = useState(false);

    const usuario = useMemo(() => {
        try {
            return JSON.parse(sessionStorage.getItem("usuario") || "null");
        } catch {
            return null;
        }
    }, []);

    const [form, setForm] = useState({
        id_aperturacaja: "",
        id_recepcion: "",
        id_concepto: "",
        id_metodopago: "",
        monto: "",
        numero_operacion: "",
        documento: "",
        descripcion: "",
    });

    const [formApertura, setFormApertura] = useState({
        id_caja: "",
        monto_inicial: "",
    });

    const avisar = (mensaje, ok = true) => {
        setToast({ mensaje, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const [cat, ap, rec, pag] = await Promise.all([
                listarCatalogosPago(),
                listarAperturasAbiertas(),
                listarRecepcionesActivas(),
                listarPagos(),
            ]);
            setCatalogos(cat);
            setAperturas(ap);
            setRecepciones(rec);
            setPagos(pag);

            setForm((prev) => ({
                ...prev,
                id_aperturacaja: prev.id_aperturacaja || (ap[0] ? String(ap[0].id_aperturacaja) : ""),
            }));
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const conceptoSeleccionado = catalogos.conceptos.find(
        (c) => String(c.id_concepto) === String(form.id_concepto)
    );

    const recepcionSeleccionada = recepciones.find(
        (r) => String(r.id_recepcion) === String(form.id_recepcion)
    );

    const cambiar = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const siguiente = { ...prev, [name]: value };
            if (name === "id_recepcion") {
                const recepcion = recepciones.find((r) => String(r.id_recepcion) === String(value));
                if (recepcion && !siguiente.monto) {
                    siguiente.monto = String(Number(recepcion.totaldeuda || 0).toFixed(2));
                }
            }
            return siguiente;
        });
    };

    const registrar = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.id_aperturacaja || !form.id_concepto || !form.id_metodopago) {
            avisar("Selecciona una caja abierta, un concepto y un método de pago.", false);
            return;
        }
        if (!conceptoSeleccionado) {
            avisar("El concepto de caja no es válido.", false);
            return;
        }
        if (Number(form.monto) <= 0) {
            avisar("Ingresa un monto mayor a cero.", false);
            return;
        }

        setGuardando(true);
        try {
            await registrarPago({
                ...form,
                id_tipomovimiento: conceptoSeleccionado.id_tipomovimiento,
                monto: Number(form.monto),
            });
            setForm((prev) => ({
                ...prev,
                id_recepcion: "",
                monto: "",
                numero_operacion: "",
                documento: "",
                descripcion: "",
            }));
            await cargar();
            avisar("Pago registrado y movimiento de caja actualizado.");
        } catch (errorPago) {
            avisar(errorPago.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const abrir = async (e) => {
        e.preventDefault();
        if (!formApertura.id_caja || Number(formApertura.monto_inicial) < 0) {
            avisar("Selecciona una caja e ingresa el monto inicial.", false);
            return;
        }

        setGuardando(true);
        try {
            await abrirCaja({
                id_caja: Number(formApertura.id_caja),
                id_usuario: usuario?.id_usuario,
                monto_inicial: Number(formApertura.monto_inicial),
            });
            setFormApertura({ id_caja: "", monto_inicial: "" });
            setMostrarApertura(false);
            await cargar();
            avisar("Caja aperturada correctamente.");
        } catch (errorApertura) {
            avisar(errorApertura.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const cerrar = async (apertura) => {
        const valor = window.prompt(
            `Monto declarado para cerrar el turno ${apertura.numero_turno}:`,
            String(apertura.monto_sistema || 0)
        );
        if (valor === null) return;
        const declarado = Number(valor);
        if (Number.isNaN(declarado) || declarado < 0) {
            avisar("El monto declarado no es válido.", false);
            return;
        }

        setGuardando(true);
        try {
            await cerrarCaja(apertura.id_aperturacaja, { monto_declarado: declarado });
            await cargar();
            avisar("Caja cerrada y cuadrada correctamente.");
        } catch (errorCierre) {
            avisar(errorCierre.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const totalDia = pagos.reduce((s, p) => s + (p.tipo_signo === "-" ? -Number(p.monto) : Number(p.monto)), 0);

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="module-icon">
                        <i className="bi bi-cash-coin"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Pagos y caja</h2>
                        <p className="text-sm text-gray-500">
                            Registra cobros, ingresos y egresos sobre el turno de caja abierto.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setMostrarApertura((v) => !v)}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    <i className="bi bi-safe mr-2"></i>
                    Abrir caja
                </button>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <i className="bi bi-exclamation-triangle mr-2"></i>
                    {error}
                </div>
            )}

            {mostrarApertura && (
                <form onSubmit={abrir} className="mb-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-3">
                    <label className="block text-xs font-semibold text-slate-700">
                        Caja *
                        <select
                            value={formApertura.id_caja}
                            onChange={(e) => setFormApertura((p) => ({ ...p, id_caja: e.target.value }))}
                            className={`${inputClase} mt-1.5 font-normal`}
                        >
                            <option value="">-- Seleccione --</option>
                            {catalogos.cajas.map((c) => (
                                <option key={c.id_caja} value={c.id_caja}>{c.n_caja}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Monto inicial (S/) *
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formApertura.monto_inicial}
                            onChange={(e) => setFormApertura((p) => ({ ...p, monto_inicial: e.target.value }))}
                            className={`${inputClase} mt-1.5 font-normal`}
                        />
                    </label>
                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            disabled={guardando}
                            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            Aperturar
                        </button>
                        <button
                            type="button"
                            onClick={() => setMostrarApertura(false)}
                            className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
                    <h3 className="mb-4 font-semibold text-slate-900">Registrar pago</h3>

                    {aperturas.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            No hay una caja abierta. Usa el botón <strong>Abrir caja</strong> para iniciar un turno.
                        </div>
                    ) : (
                        <form onSubmit={registrar} className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-slate-700">
                                Turno de caja *
                                <select name="id_aperturacaja" value={form.id_aperturacaja} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                    <option value="">-- Seleccione --</option>
                                    {aperturas.map((a) => (
                                        <option key={a.id_aperturacaja} value={a.id_aperturacaja}>
                                            {a.numero_turno} · {a.caja_nombre}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                Recepción (opcional)
                                <select name="id_recepcion" value={form.id_recepcion} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                    <option value="">-- Pago sin recepción --</option>
                                    {recepciones.map((r) => (
                                        <option key={r.id_recepcion} value={r.id_recepcion}>
                                            #{r.id_recepcion} · {r.cliente_nombre} · deuda {soles(r.totaldeuda)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                Concepto *
                                <select name="id_concepto" value={form.id_concepto} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                    <option value="">-- Seleccione --</option>
                                    {catalogos.conceptos.map((c) => {
                                        const tipo = catalogos.tipos.find((t) => t.id_tipomovimiento === c.id_tipomovimiento);
                                        return (
                                            <option key={c.id_concepto} value={c.id_concepto}>
                                                {c.n_concepto} ({tipo?.n_tipomovimiento || "-"})
                                            </option>
                                        );
                                    })}
                                </select>
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                Método de pago *
                                <select name="id_metodopago" value={form.id_metodopago} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                    <option value="">-- Seleccione --</option>
                                    {catalogos.metodos.map((m) => (
                                        <option key={m.id_metodopago} value={m.id_metodopago}>{m.n_metodopago}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                Monto (S/) *
                                <input type="number" min="0" step="0.01" name="monto" value={form.monto} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
                                {recepcionSeleccionada && (
                                    <span className="mt-1 block text-[11px] font-normal text-gray-400">
                                        Deuda actual: {soles(recepcionSeleccionada.totaldeuda)}
                                    </span>
                                )}
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                N° de operación
                                <input type="text" name="numero_operacion" value={form.numero_operacion} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                Documento
                                <input type="text" name="documento" value={form.documento} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                Descripción
                                <input type="text" name="descripcion" value={form.descripcion} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
                            </label>

                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={guardando}
                                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {guardando ? "Registrando..." : "Registrar pago"}
                                </button>
                            </div>
                        </form>
                    )}
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 font-semibold text-slate-900">Turnos abiertos</h3>
                    {aperturas.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin turnos abiertos.</p>
                    ) : (
                        <div className="space-y-3">
                            {aperturas.map((a) => (
                                <div key={a.id_aperturacaja} className="rounded-xl border border-gray-100 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-slate-800">{a.numero_turno}</p>
                                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Abierta</span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">{a.caja_nombre} · {a.usuario_nombre}</p>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                        <div><span className="text-gray-400">Inicial</span><p className="font-semibold">{soles(a.monto_inicial)}</p></div>
                                        <div><span className="text-gray-400">Sistema</span><p className="font-semibold">{soles(a.monto_sistema)}</p></div>
                                    </div>
                                    <button
                                        onClick={() => cerrar(a)}
                                        disabled={guardando}
                                        className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        Cerrar caja
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                    <h3 className="font-semibold text-slate-900">Últimos movimientos de caja</h3>
                    <span className="text-sm text-slate-500">
                        Neto: <strong className={totalDia >= 0 ? "text-emerald-700" : "text-red-600"}>{soles(totalDia)}</strong>
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3 font-semibold">Fecha</th>
                                <th className="px-5 py-3 font-semibold">Tipo</th>
                                <th className="px-5 py-3 font-semibold">Concepto</th>
                                <th className="px-5 py-3 font-semibold">Recepción</th>
                                <th className="px-5 py-3 font-semibold">Método</th>
                                <th className="px-5 py-3 font-semibold">Operación</th>
                                <th className="px-5 py-3 font-semibold">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cargando ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">Cargando...</td>
                                </tr>
                            ) : pagos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400">Sin movimientos</td>
                                </tr>
                            ) : (
                                pagos.map((p) => (
                                    <tr key={p.id_movimientocaja} className="hover:bg-slate-50">
                                        <td className="px-5 py-3 text-slate-700">{fechaHora(p.f_movimiento)}</td>
                                        <td className="px-5 py-3">
                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${p.tipo_signo === "-" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                                {p.tipo_nombre}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-700">{p.concepto_nombre}</td>
                                        <td className="px-5 py-3 text-slate-700">{p.recepcion_numero ? `#${p.recepcion_numero}` : "-"}</td>
                                        <td className="px-5 py-3 text-slate-700">{p.metodo_nombre}</td>
                                        <td className="px-5 py-3 text-slate-700">{p.numero_operacion || "-"}</td>
                                        <td className={`px-5 py-3 font-semibold ${p.tipo_signo === "-" ? "text-red-600" : "text-emerald-700"}`}>
                                            {p.tipo_signo === "-" ? "-" : "+"}{soles(p.monto)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
                    {toast.mensaje}
                </div>
            )}
        </div>
    );
};

export default Pagos;
