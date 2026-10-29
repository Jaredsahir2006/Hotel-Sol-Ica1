import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
    listarAperturasAbiertas,
    listarCatalogosPago,
    listarClientes,
    listarHabitaciones,
    listarConsumosRecepcion,
    listarRecepciones,
    registrarCheckIn,
    registrarIngresoReserva,
    registrarCheckOut,
} from "../services/procesosService";
import { fecha, hoy, noches, soles, sumarDias } from "../utils/format";
import { construirPreCuenta } from "../utils/preCuenta";
import Paginacion from "../components/Paginacion";
import { usePaginacion } from "../hooks/usePaginacion";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const CheckInOut = () => {
    const [habitaciones, setHabitaciones] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [recepciones, setRecepciones] = useState([]);
    const [catalogos, setCatalogos] = useState({
        usuarios: [],
        metodos: [],
        conceptos: [],
        tipos: [],
    });
    const [aperturasAbiertas, setAperturasAbiertas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [formAbierto, setFormAbierto] = useState(false);
    const [recepcionCheckout, setRecepcionCheckout] = useState(null);
    const [consumosCheckout, setConsumosCheckout] = useState([]);
    const [cargandoConsumos, setCargandoConsumos] = useState(false);
    const consultaConsumosActual = useRef(0);

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
        id_aperturacaja: "",
        id_concepto: "",
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
            const [h, c, r, cat, aperturas] = await Promise.all([
                listarHabitaciones(),
                listarClientes(),
                listarRecepciones(),
                listarCatalogosPago(),
                listarAperturasAbiertas(),
            ]);
            setHabitaciones(h);
            setClientes(c);
            setRecepciones(r);
            setCatalogos(cat);
            setAperturasAbiertas(aperturas);
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
    const conceptosIngreso = catalogos.conceptos.filter((concepto) =>
        catalogos.tipos.some(
            (tipo) =>
                String(tipo.id_tipomovimiento) === String(concepto.id_tipomovimiento)
                && tipo.signo === "+"
        )
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
            id_aperturacaja: "",
            id_concepto: "",
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
        const adelanto = Number(form.adelanto) || 0;
        const total = Number(form.d_inicial || totalEstimado);
        if (adelanto < 0 || adelanto > total) {
            avisar("El adelanto debe ser válido y no puede superar el total de la estadía.", false);
            return;
        }
        if (adelanto > 0 && (!form.id_aperturacaja || !form.id_concepto)) {
            avisar("Para registrar un adelanto, selecciona una caja abierta y un concepto de ingreso.", false);
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
                d_inicial: total,
                adelanto,
            });
            await cargar();
            limpiar();
            setFormAbierto(false);
            avisar("Check-in registrado correctamente.");
        } catch (errorGuardar) {
            if (errorGuardar.procesoParcial) {
                await cargar();
                limpiar();
                setFormAbierto(false);
            }
            avisar(errorGuardar.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const hacerCheckOut = async (recepcion) => {
        const deuda = Number(recepcion.totaldeuda) || 0;
        const total = (Number(recepcion.d_inicial) || 0) + (Number(recepcion.d_asistente) || 0);
        const mensaje = deuda > 0
            ? `La pre-cuenta de la habitación ${recepcion.habitacion_numero} suma ${soles(total)} y tiene un saldo pendiente de ${soles(deuda)}. ¿Registrar el check-out igualmente?`
            : `La cuenta de la habitación ${recepcion.habitacion_numero} está saldada. ¿Registrar el check-out?`;
        if (!window.confirm(mensaje)) return;

        setGuardando(true);
        try {
            await registrarCheckOut(recepcion.id_recepcion);
            await cargar();
            consultaConsumosActual.current += 1;
            setRecepcionCheckout(null);
            setConsumosCheckout([]);
            avisar("Check-out registrado. La habitación quedó disponible.");
        } catch (errorCheckOut) {
            if (errorCheckOut.procesoParcial) {
                await cargar();
                consultaConsumosActual.current += 1;
                setRecepcionCheckout(null);
                setConsumosCheckout([]);
            }
            avisar(errorCheckOut.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const prepararCheckOut = async (recepcion) => {
        const solicitud = ++consultaConsumosActual.current;
        setRecepcionCheckout(recepcion);
        setConsumosCheckout([]);
        setCargandoConsumos(true);
        setError("");
        try {
            const detalles = await listarConsumosRecepcion(recepcion.id_recepcion);
            if (solicitud === consultaConsumosActual.current) setConsumosCheckout(detalles);
        } catch (errorConsumos) {
            if (solicitud === consultaConsumosActual.current) {
                setError(`No se pudieron cargar los consumos de la recepción #${recepcion.id_recepcion}: ${errorConsumos.message}`);
            }
        } finally {
            if (solicitud === consultaConsumosActual.current) setCargandoConsumos(false);
        }
    };

    const cancelarPreparacionCheckOut = () => {
        consultaConsumosActual.current += 1;
        setRecepcionCheckout(null);
        setConsumosCheckout([]);
        setCargandoConsumos(false);
    };

    const descargarPreCuenta = () => {
        if (!recepcionCheckout || cargandoConsumos) return;
        const documento = new jsPDF();
        const nombreArchivo = construirPreCuenta(
            documento,
            autoTable,
            recepcionCheckout,
            consumosCheckout
        );
        documento.save(nombreArchivo);
    };

    const hacerCheckIn = async (recepcion) => {
        setGuardando(true);
        try {
            await registrarIngresoReserva(recepcion.id_recepcion);
            await cargar();
            avisar(`Check-in registrado para la habitación ${recepcion.habitacion_numero}.`);
        } catch (errorCheckIn) {
            avisar(errorCheckIn.message, false);
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
    const ordenadas = [...activas, ...finalizadas];
    const paginacion = usePaginacion(ordenadas.length);
    const recepcionesPagina = ordenadas.slice(paginacion.desde, paginacion.hasta);
    const totalPreCuenta = recepcionCheckout
        ? (Number(recepcionCheckout.d_inicial) || 0) + (Number(recepcionCheckout.d_asistente) || 0)
        : 0;
    const saldoPreCuenta = !recepcionCheckout
        ? 0
        : recepcionCheckout.totaldeuda == null
            ? Math.max(0, totalPreCuenta - (Number(recepcionCheckout.t_pagado) || 0))
            : Math.max(0, Number(recepcionCheckout.totaldeuda) || 0);

    const esReservaPendiente = (r) =>
        !r.f_salidac
        && (String(r.f_entrada || "").slice(0, 10) > hoy()
            || !String(r.habitacion_estado || "").toUpperCase().includes("OCUP"));

    const estadoBadge = (r) =>
        r.f_salidac ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Check-out
            </span>
        ) : esReservaPendiente(r) ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Pendiente de check-in
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
                            Confirma el ingreso de reservas existentes o registra un ingreso sin reserva.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setFormAbierto((v) => !v)}
                    className="rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
                >
                    <i className="bi bi-box-arrow-in-right mr-2"></i>
                    {formAbierto ? "Cerrar formulario" : "Nuevo ingreso sin reserva"}
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
                    <h3 className="mb-4 font-semibold text-slate-900">Nuevo ingreso sin reserva</h3>

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
                            <span className="mt-1 block font-normal text-gray-400">
                                Si registras un adelanto, el sistema lo asociará a una caja abierta y actualizará el saldo y el movimiento de caja.
                            </span>
                        </label>

                        {Number(form.adelanto) > 0 && (
                            <>
                                <label className="block text-xs font-semibold text-slate-700">
                                    Caja abierta para el cobro *
                                    <select name="id_aperturacaja" value={form.id_aperturacaja} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                        <option value="">-- Seleccione --</option>
                                        {aperturasAbiertas.map((apertura) => (
                                            <option key={apertura.id_aperturacaja} value={apertura.id_aperturacaja}>
                                                {apertura.caja_nombre} · {apertura.numero_turno}
                                            </option>
                                        ))}
                                    </select>
                                    {aperturasAbiertas.length === 0 && (
                                        <span className="mt-1 block font-normal text-amber-700">
                                            No hay cajas abiertas. Abre una desde Pagos y caja para registrar el adelanto.
                                        </span>
                                    )}
                                </label>
                                <label className="block text-xs font-semibold text-slate-700">
                                    Concepto de ingreso *
                                    <select name="id_concepto" value={form.id_concepto} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                        <option value="">-- Seleccione --</option>
                                        {conceptosIngreso.map((concepto) => (
                                            <option key={concepto.id_concepto} value={concepto.id_concepto}>
                                                {concepto.n_concepto}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </>
                        )}

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
                            {guardando ? "Guardando..." : "Registrar ingreso"}
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
                    onChange={(e) => {
                        setBusqueda(e.target.value);
                        paginacion.setPagina(1);
                    }}
                    placeholder="Buscar reserva por huésped, DNI/RUC, habitación o número..."
                    className={inputClase}
                />
            </div>

            {recepcionCheckout && (
                <section className="mb-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm" aria-label="Detalle de check-out">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Preparar check-out · Recepción #{recepcionCheckout.id_recepcion}
                            </h3>
                            <p className="text-sm text-slate-600">
                                {recepcionCheckout.cliente_nombre} · Habitación {recepcionCheckout.habitacion_numero}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={cancelarPreparacionCheckOut}
                            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                        >
                            Cerrar detalle
                        </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-3 text-sm">
                            <p className="text-xs text-slate-500">Documento</p>
                            <p className="mt-1 font-semibold">{recepcionCheckout.cliente_documento || "—"}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm">
                            <p className="text-xs text-slate-500">Fecha de entrada</p>
                            <p className="mt-1 font-semibold">{fecha(recepcionCheckout.f_entrada)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm">
                            <p className="text-xs text-slate-500">Salida prevista · Noches</p>
                            <p className="mt-1 font-semibold">
                                {fecha(recepcionCheckout.f_salida)} · {noches(recepcionCheckout.f_entrada, recepcionCheckout.f_salida)}
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm">
                            <p className="text-xs text-slate-500">Total registrado de alojamiento</p>
                            <p className="mt-1 font-semibold">{soles(recepcionCheckout.d_inicial)}</p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <h4 className="mb-2 font-semibold text-slate-800">Consumos adicionales</h4>
                        {cargandoConsumos ? (
                            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Cargando detalle de consumos...</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">Servicio</th>
                                            <th className="px-4 py-3">Cantidad</th>
                                            <th className="px-4 py-3">Precio unitario</th>
                                            <th className="px-4 py-3">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {consumosCheckout.length ? consumosCheckout.map((detalle) => (
                                            <tr key={detalle.id_detalle}>
                                                <td className="px-4 py-3">{detalle.producto_nombre}</td>
                                                <td className="px-4 py-3">{detalle.cantidad}</td>
                                                <td className="px-4 py-3">
                                                    {soles(Number(detalle.sub_total) / (Number(detalle.cantidad) || 1))}
                                                </td>
                                                <td className="px-4 py-3 font-semibold">{soles(detalle.sub_total)}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-5 text-center text-slate-500">
                                                    No hay consumos con detalle asociados a esta recepción.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {(Number(recepcionCheckout.d_asistente) || 0) > 0 && (
                            <p className="mt-2 text-xs text-slate-500">
                                Total de consumos registrado en la cuenta: {soles(recepcionCheckout.d_asistente)}.
                                La pre-cuenta concilia el detalle con ese total registrado.
                            </p>
                        )}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                        <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                            <p>Total de estadía: <strong>{soles(totalPreCuenta)}</strong></p>
                            <p>Pagos registrados: <strong>{soles(recepcionCheckout.t_pagado)}</strong></p>
                            <p className={saldoPreCuenta > 0 ? "text-red-700" : "text-emerald-700"}>
                                Saldo pendiente: <strong>{soles(saldoPreCuenta)}</strong>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={descargarPreCuenta}
                                disabled={cargandoConsumos}
                                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <i className="bi bi-file-earmark-pdf mr-2"></i>Generar pre-cuenta
                            </button>
                            <button
                                type="button"
                                onClick={() => hacerCheckOut(recepcionCheckout)}
                                disabled={guardando || cargandoConsumos}
                                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <i className="bi bi-box-arrow-right mr-2"></i>Registrar check-out
                            </button>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        La pre-cuenta es informativa y no reemplaza una factura, boleta ni el registro del pago. Si queda saldo pendiente,
                        se solicitará confirmación antes de liberar la habitación.
                    </p>
                </section>
            )}

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
                            ) : ordenadas.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-5 py-10 text-center text-gray-400">Sin recepciones</td>
                                </tr>
                            ) : (
                                recepcionesPagina.map((r) => (
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
                                                esReservaPendiente(r) ? (
                                                    String(r.f_entrada || "").slice(0, 10) > hoy() ? (
                                                        <span className="text-xs text-amber-700">
                                                            Ingreso desde {fecha(r.f_entrada)}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => hacerCheckIn(r)}
                                                            disabled={
                                                                guardando
                                                                || !String(r.habitacion_estado || "").toUpperCase().includes("DISPON")
                                                            }
                                                            className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <i className="bi bi-box-arrow-in-right mr-1"></i>
                                                            Registrar check-in
                                                        </button>
                                                    )
                                                ) : (
                                                    <button
                                                        onClick={() => prepararCheckOut(r)}
                                                        disabled={guardando || cargandoConsumos}
                                                        className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-200 disabled:opacity-60"
                                                    >
                                                        <i className="bi bi-receipt mr-1"></i>
                                                        Preparar check-out
                                                    </button>
                                                )
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

            <Paginacion {...paginacion} total={ordenadas.length} />

            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
                    {toast.mensaje}
                </div>
            )}
        </div>
    );
};

export default CheckInOut;
