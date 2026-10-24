import { useCallback, useEffect, useMemo, useState } from "react";

import {
    listarCatalogosPago,
    listarClientes,
    listarHabitaciones,
    listarRecepciones,
    registrarCheckIn,
    registrarCheckOut,
} from "../services/procesosService";
import { fecha, hoy, noches, soles, sumarDias } from "../utils/format";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const CheckInOut = () => {
    const [habitaciones, setHabitaciones] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [recepciones, setRecepciones] = useState([]);
    const [catalogos, setCatalogos] = useState({ usuarios: [], metodos: [] });
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [formAbierto, setFormAbierto] = useState(false);

    const usuario = useMemo(() => {
        try {
            return JSON.parse(sessionStorage.getItem("usuario") || "null");
        } catch {
            return null;
        }
    }, []);

    const [form, setForm] = useState({
        id_cliente: "",
        id_habitacion: "",
        id_usuario: usuario?.id_usuario || "",
        id_metodopago: "",
        f_entrada: hoy(),
        f_salida: sumarDias(hoy(), 1),
        d_inicial: "",
        adelanto: "",
        tipodocumento: "BOLETA",
        documento: "",
    });

    const avisar = (mensaje, ok = true) => {
        setToast({ mensaje, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const [h, c, r, cat] = await Promise.all([
                listarHabitaciones(),
                listarClientes(),
                listarRecepciones(),
                listarCatalogosPago(),
            ]);
            setHabitaciones(h);
            setClientes(c);
            setRecepciones(r);
            setCatalogos(cat);
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const disponibles = habitaciones.filter((h) =>
        String(h.estado_nombre || "").toUpperCase().includes("DISPON")
    );

    const habitacionSeleccionada = habitaciones.find(
        (h) => String(h.id_habitacion) === String(form.id_habitacion)
    );

    const nochesEstadia = noches(form.f_entrada, form.f_salida);
    const totalEstimado = habitacionSeleccionada
        ? (Number(habitacionSeleccionada.precio) || 0) * nochesEstadia
        : 0;

    const cambiar = (e) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const siguiente = { ...prev, [name]: value };

            if (name === "id_cliente") {
                const cliente = clientes.find((c) => String(c.id_cliente) === String(value));
                siguiente.documento = cliente?.documento || "";
            }

            const habitacion = habitaciones.find(
                (h) => String(h.id_habitacion) === String(siguiente.id_habitacion)
            );
            const cantidad = noches(siguiente.f_entrada, siguiente.f_salida);
            if (habitacion && cantidad > 0) {
                siguiente.d_inicial = String(
                    Number(((Number(habitacion.precio) || 0) * cantidad).toFixed(2))
                );
            } else if (name === "f_entrada" || name === "f_salida" || name === "id_habitacion") {
                siguiente.d_inicial = "";
            }

            return siguiente;
        });
    };

    const limpiar = () => {
        setForm({
            id_cliente: "",
            id_habitacion: "",
            id_usuario: usuario?.id_usuario || "",
            id_metodopago: "",
            f_entrada: hoy(),
            f_salida: sumarDias(hoy(), 1),
            d_inicial: "",
            adelanto: "",
            tipodocumento: "BOLETA",
            documento: "",
        });
    };

    const guardarCheckIn = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.id_cliente || !form.id_habitacion || !form.id_metodopago || !form.id_usuario) {
            avisar("Completa cliente, habitación, usuario y método de pago.", false);
            return;
        }
        if (nochesEstadia <= 0) {
            avisar("La fecha de salida debe ser posterior a la de entrada.", false);
            return;
        }

        setGuardando(true);
        try {
            await registrarCheckIn({
                ...form,
                d_inicial: Number(form.d_inicial || totalEstimado),
                adelanto: Number(form.adelanto) || 0,
            });
            await cargar();
            limpiar();
            setFormAbierto(false);
            avisar("Check-in registrado correctamente.");
        } catch (errorGuardar) {
            avisar(errorGuardar.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const hacerCheckOut = async (recepcion) => {
        const deuda = Number(recepcion.totaldeuda) || 0;
        const mensaje = deuda > 0
            ? `La recepción tiene una deuda pendiente de ${soles(deuda)}. ¿Registrar el check-out de la habitación ${recepcion.habitacion_numero} igualmente?`
            : `¿Registrar el check-out de la habitación ${recepcion.habitacion_numero}?`;
        if (!window.confirm(mensaje)) return;

        setGuardando(true);
        try {
            await registrarCheckOut(recepcion.id_recepcion);
            await cargar();
            avisar("Check-out registrado. La habitación quedó disponible.");
        } catch (errorCheckOut) {
            avisar(errorCheckOut.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const filtradas = recepciones.filter((r) => {
        const texto = `${r.cliente_nombre} ${r.cliente_documento} ${r.habitacion_numero} #${r.id_recepcion}`.toLowerCase();
        return texto.includes(busqueda.toLowerCase());
    });

    const activas = filtradas.filter((r) => !r.f_salidac);
    const finalizadas = filtradas.filter((r) => r.f_salidac);

    const estadoBadge = (r) =>
        r.f_salidac ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Check-out
            </span>
        ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                En habitación
            </span>
        );

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="module-icon">
                        <i className="bi bi-door-open"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Check-in / Check-out</h2>
                        <p className="text-sm text-gray-500">
                            Registra el ingreso y la salida de huéspedes actualizando la habitación.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setFormAbierto((v) => !v)}
                    className="rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
                >
                    <i className="bi bi-box-arrow-in-right mr-2"></i>
                    {formAbierto ? "Cerrar formulario" : "Nuevo check-in"}
                </button>
            </div>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <i className="bi bi-exclamation-triangle mr-2"></i>
                    {error}
                </div>
            )}

            {formAbierto && (
                <form
                    onSubmit={guardarCheckIn}
                    className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                    <h3 className="mb-4 font-semibold text-slate-900">Nuevo check-in</h3>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <label className="block text-xs font-semibold text-slate-700">
                            Cliente *
                            <select name="id_cliente" value={form.id_cliente} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                <option value="">-- Seleccione --</option>
                                {clientes.map((c) => (
                                    <option key={c.id_cliente} value={c.id_cliente}>
                                        {c.nombre} ({c.documento || "sin documento"})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block text-xs font-semibold text-slate-700">
                            Habitación disponible *
                            <select name="id_habitacion" value={form.id_habitacion} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                <option value="">-- Seleccione --</option>
                                {disponibles.map((h) => (
                                    <option key={h.id_habitacion} value={h.id_habitacion}>
                                        Hab. {h.numero} · {h.categoria_nombre} · {soles(h.precio)} / noche
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block text-xs font-semibold text-slate-700">
                            Atendido por *
                            <select name="id_usuario" value={form.id_usuario} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                <option value="">-- Seleccione --</option>
                                {catalogos.usuarios.map((u) => (
                                    <option key={u.id_usuario} value={u.id_usuario}>{u.logeo}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block text-xs font-semibold text-slate-700">
                            Fecha de entrada *
                            <input type="date" name="f_entrada" value={form.f_entrada} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
                        </label>

                        <label className="block text-xs font-semibold text-slate-700">
                            Fecha de salida *
                            <input type="date" name="f_salida" value={form.f_salida} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
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
                            Total de la estadía (S/) *
                            <input type="number" min="0" step="0.01" name="d_inicial" value={form.d_inicial} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
                            <span className="mt-1 block text-[11px] font-normal text-gray-400">
                                {nochesEstadia} noche(s) · estimado {soles(totalEstimado)}
                            </span>
                        </label>

                        <label className="block text-xs font-semibold text-slate-700">
                            Adelanto (S/)
                            <input type="number" min="0" step="0.01" name="adelanto" value={form.adelanto} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
                        </label>

                        <label className="block text-xs font-semibold text-slate-700">
                            Comprobante
                            <select name="tipodocumento" value={form.tipodocumento} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                <option value="BOLETA">BOLETA</option>
                                <option value="FACTURA">FACTURA</option>
                            </select>
                        </label>

                        <label className="block text-xs font-semibold text-slate-700">
                            N° de documento
                            <input type="text" name="documento" value={form.documento} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`} />
                        </label>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={guardando}
                            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {guardando ? "Guardando..." : "Registrar check-in"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormAbierto(false)}
                            className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            <div className="mb-4">
                <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por cliente, documento o habitación..."
                    className={inputClase}
                />
            </div>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3 font-semibold">Recepción</th>
                                <th className="px-5 py-3 font-semibold">Cliente</th>
                                <th className="px-5 py-3 font-semibold">Habitación</th>
                                <th className="px-5 py-3 font-semibold">Entrada</th>
                                <th className="px-5 py-3 font-semibold">Salida</th>
                                <th className="px-5 py-3 font-semibold">Total</th>
                                <th className="px-5 py-3 font-semibold">Pagado</th>
                                <th className="px-5 py-3 font-semibold">Deuda</th>
                                <th className="px-5 py-3 font-semibold">Estado</th>
                                <th className="px-5 py-3 font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cargando ? (
                                <tr>
                                    <td colSpan={10} className="px-5 py-10 text-center text-gray-400">Cargando...</td>
                                </tr>
                            ) : filtradas.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-5 py-10 text-center text-gray-400">Sin recepciones</td>
                                </tr>
                            ) : (
                                [...activas, ...finalizadas].map((r) => (
                                    <tr key={r.id_recepcion} className="hover:bg-slate-50">
                                        <td className="px-5 py-3 font-semibold text-slate-700">#{r.id_recepcion}</td>
                                        <td className="px-5 py-3 text-slate-700">
                                            <div className="font-medium">{r.cliente_nombre}</div>
                                            <div className="text-xs text-gray-400">{r.cliente_documento}</div>
                                        </td>
                                        <td className="px-5 py-3 text-slate-700">Hab. {r.habitacion_numero}</td>
                                        <td className="px-5 py-3 text-slate-700">{fecha(r.f_entrada)}</td>
                                        <td className="px-5 py-3 text-slate-700">{fecha(r.f_salida)}</td>
                                        <td className="px-5 py-3 text-slate-700">{soles(r.d_inicial)}</td>
                                        <td className="px-5 py-3 text-emerald-700">{soles(r.t_pagado)}</td>
                                        <td className="px-5 py-3 font-semibold text-red-600">{soles(r.totaldeuda)}</td>
                                        <td className="px-5 py-3">{estadoBadge(r)}</td>
                                        <td className="px-5 py-3">
                                            {!r.f_salidac ? (
                                                <button
                                                    onClick={() => hacerCheckOut(r)}
                                                    disabled={guardando}
                                                    className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-200 disabled:opacity-60"
                                                >
                                                    <i className="bi bi-box-arrow-right mr-1"></i>
                                                    Check-out
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">{fecha(r.f_salidac)}</span>
                                            )}
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

export default CheckInOut;
