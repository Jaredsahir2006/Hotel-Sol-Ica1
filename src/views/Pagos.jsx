import { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
    abrirCaja,
    cerrarCaja,
    listarAperturasAbiertas,
    listarCatalogosPago,
    listarPagos,
    listarRecepcionesPendientesPago,
    obtenerArqueoCaja,
    obtenerUltimaAperturaCaja,
    registrarPago,
} from "../services/procesosService";
import { fechaHora, soles } from "../utils/format";
import { TURNOS_CAJA } from "../utils/caja";
import { construirComprobantePago } from "../utils/comprobantePago";
import { filtrarConceptosCaja, siguienteNumeroOperacion } from "../utils/operacionesCaja";
import Paginacion from "../components/Paginacion";
import { usePaginacion } from "../hooks/usePaginacion";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const fechaLocalISO = () => {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${hoy.getFullYear()}-${mes}-${dia}`;
};

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
    const [aperturaConfirmada, setAperturaConfirmada] = useState(null);
    const [aperturaAnterior, setAperturaAnterior] = useState(null);
    const [busquedaConcepto, setBusquedaConcepto] = useState("");
    const [filtroTipoConcepto, setFiltroTipoConcepto] = useState("todos");
    const [consultandoAnterior, setConsultandoAnterior] = useState(false);
    const [turnoCierre, setTurnoCierre] = useState(null);
    const [arqueo, setArqueo] = useState(null);
    const [conteoMetodos, setConteoMetodos] = useState({});
    const [fondoSiguiente, setFondoSiguiente] = useState("");
    const [observacionCierre, setObservacionCierre] = useState("");
    const [reporteCierre, setReporteCierre] = useState(null);
    const [comprobantePago, setComprobantePago] = useState(null);

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
        observacion: "",
        turno: "Mañana",
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
                listarRecepcionesPendientesPago(),
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
    const conceptosFiltrados = filtrarConceptosCaja({
        conceptos: catalogos.conceptos,
        tipos: catalogos.tipos,
        busqueda: busquedaConcepto,
        signo: filtroTipoConcepto,
        soloIngresos: Boolean(form.id_recepcion),
    });
    const proximaOperacion = siguienteNumeroOperacion(
        pagos.map((pago) => pago.numero_operacion)
    );

    const recepcionSeleccionada = recepciones.find(
        (r) => String(r.id_recepcion) === String(form.id_recepcion)
    );

    const paginacion = usePaginacion(pagos.length);
    const pagosPagina = pagos.slice(paginacion.desde, paginacion.hasta);

    const metodoEfectivoArqueo = arqueo?.metodos.find((metodo) => /efectivo/i.test(metodo.nombre))
        || arqueo?.metodos.find((metodo) => !metodo.id_metodopago);
    const efectivoContadoArqueo = Number(
        conteoMetodos[String(metodoEfectivoArqueo?.clave || metodoEfectivoArqueo?.id_metodopago || "efectivo")] || 0
    );
    const retiroEstimado = Math.max(0, efectivoContadoArqueo - Number(fondoSiguiente || 0));
    const nombreCajero = usuario?.logeo || usuario?.usuario || usuario?.nombre || "Usuario actual";

    const cambiar = (e) => {
        const { name, value } = e.target;
        if (name === "id_recepcion") {
            setFiltroTipoConcepto(value ? "+" : "todos");
            setBusquedaConcepto("");
        }
        setForm((prev) => {
            const siguiente = { ...prev, [name]: value };
            if (name === "id_recepcion") {
                siguiente.id_concepto = "";
                const recepcion = recepciones.find((r) => String(r.id_recepcion) === String(value));
                siguiente.monto = recepcion
                    ? String(Number(recepcion.saldo_pendiente ?? recepcion.totaldeuda ?? 0).toFixed(2))
                    : "";
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
        const importe = Number(form.monto);
        if (!Number.isFinite(importe) || importe <= 0) {
            avisar("Ingresa un monto mayor a cero.", false);
            return;
        }
        const tipoSeleccionado = catalogos.tipos.find(
            (tipo) => String(tipo.id_tipomovimiento) === String(conceptoSeleccionado.id_tipomovimiento)
        );
        if (recepcionSeleccionada) {
            if (tipoSeleccionado?.signo !== "+") {
                avisar("Para cobrar una recepción, selecciona un concepto de ingreso.", false);
                return;
            }
            const saldoPendiente = Number(recepcionSeleccionada.saldo_pendiente ?? recepcionSeleccionada.totaldeuda);
            if (!Number.isFinite(saldoPendiente) || saldoPendiente <= 0) {
                avisar("La recepción seleccionada no tiene saldo pendiente.", false);
                return;
            }
            if (importe > saldoPendiente) {
                avisar(`El pago no puede superar el saldo pendiente de ${soles(saldoPendiente)}.`, false);
                return;
            }
        }

        setGuardando(true);
        try {
            const pago = await registrarPago({
                ...form,
                id_tipomovimiento: conceptoSeleccionado.id_tipomovimiento,
                monto: importe,
            });
            if (!pago?.id_movimientocaja) {
                throw new Error("No se recibió el identificador del movimiento para emitir la constancia.");
            }
            const metodo = catalogos.metodos.find(
                (item) => String(item.id_metodopago) === String(form.id_metodopago)
            );
            setComprobantePago({
                ...pago,
                id_recepcion: form.id_recepcion ? Number(form.id_recepcion) : null,
                cliente_nombre: recepcionSeleccionada?.cliente_nombre || "-",
                cliente_documento: recepcionSeleccionada?.cliente_documento || "-",
                habitacion_numero: recepcionSeleccionada?.habitacion_numero || "-",
                usuario_nombre: nombreCajero,
                concepto_nombre: conceptoSeleccionado.n_concepto,
                metodo_nombre: metodo?.n_metodopago || "-",
                monto: importe,
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
            if (errorPago.procesoParcial) {
                await cargar();
                setError(errorPago.message);
                setForm((prev) => ({
                    ...prev,
                    id_recepcion: "",
                    monto: "",
                    numero_operacion: "",
                    documento: "",
                    descripcion: "",
                }));
            }
            avisar(errorPago.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const descargarComprobantePago = (pago) => {
        const documento = new jsPDF();
        const nombreArchivo = construirComprobantePago(documento, autoTable, pago);
        documento.save(nombreArchivo);
    };

    const abrir = async (e) => {
        e.preventDefault();
        const montoInicial = Number(formApertura.monto_inicial);
        if (!formApertura.id_caja || formApertura.monto_inicial === "" || !Number.isFinite(montoInicial) || montoInicial < 0) {
            avisar("Selecciona una caja e ingresa el monto inicial.", false);
            return;
        }

        setGuardando(true);
        try {
            const apertura = await abrirCaja({
                id_caja: Number(formApertura.id_caja),
                id_usuario: usuario?.id_usuario,
                monto_inicial: montoInicial,
                observacion: formApertura.observacion,
                turno: formApertura.turno,
                saldo_anterior: aperturaAnterior
                    ? aperturaAnterior.saldo_siguiente ?? aperturaAnterior.monto_declarado ?? aperturaAnterior.monto_sistema
                    : null,
            });
            const caja = catalogos.cajas.find((item) => String(item.id_caja) === String(formApertura.id_caja));
            setAperturaConfirmada({
                ...apertura,
                caja_nombre: caja?.n_caja || `Caja #${formApertura.id_caja}`,
                usuario_nombre: nombreCajero,
                turno_nombre: apertura.turno_nombre || formApertura.turno,
            });
            setFormApertura({ id_caja: "", monto_inicial: "", observacion: "", turno: "Mañana" });
            setAperturaAnterior(null);
            setMostrarApertura(false);
            await cargar();
            avisar(`Caja ${apertura.numero_turno} aperturada correctamente.`);
        } catch (errorApertura) {
            avisar(errorApertura.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const prepararCierre = async (apertura) => {
        setGuardando(true);
        try {
            const resumen = await obtenerArqueoCaja(apertura.id_aperturacaja);
            setTurnoCierre(apertura);
            setArqueo(resumen);
            setConteoMetodos(Object.fromEntries(
                resumen.metodos.map((metodo) => [String(metodo.clave || metodo.id_metodopago || "efectivo"), ""])
            ));
            setFondoSiguiente("");
            setObservacionCierre("");
            setReporteCierre(null);
        } catch (errorArqueo) {
            avisar(errorArqueo.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const confirmarCierre = async (e) => {
        e.preventDefault();
        if (!arqueo || !turnoCierre) return;
        const efectivo = arqueo.metodos.find((metodo) => /efectivo/i.test(metodo.nombre))
            || arqueo.metodos.find((metodo) => !metodo.id_metodopago);
        const idEfectivo = String(efectivo?.clave || efectivo?.id_metodopago || "efectivo");
        const declarado = Number(conteoMetodos[idEfectivo]);
        const conteo = arqueo.metodos.map((metodo) => ({
            id_metodopago: metodo.id_metodopago,
            clave: metodo.clave,
            metodo: metodo.nombre,
            contado: conteoMetodos[String(metodo.clave || metodo.id_metodopago || "efectivo")],
        }));
        if (conteo.some((item) => item.contado === "" || !Number.isFinite(Number(item.contado)) || Number(item.contado) < 0)) {
            avisar("Ingresa el monto contado para cada método de pago, incluso si es S/ 0.00.", false);
            return;
        }
        if (!Number.isFinite(declarado) || declarado < 0) {
            avisar("Ingresa el efectivo contado para cerrar el turno.", false);
            return;
        }
        const fondo = Number(fondoSiguiente || 0);
        if (!Number.isFinite(fondo) || fondo < 0 || fondo > declarado) {
            avisar("El fondo siguiente debe ser válido y no puede superar el efectivo contado.", false);
            return;
        }

        setGuardando(true);
        try {
            const resultado = await cerrarCaja(turnoCierre.id_aperturacaja, {
                monto_declarado: declarado,
                observacion: observacionCierre,
                conteo_metodos: conteo,
                fondo_siguiente: fondo,
            });
            setReporteCierre({ apertura: turnoCierre, arqueo, resultado });
            setTurnoCierre(null);
            setArqueo(null);
            await cargar();
            const diferencia = Number(resultado.diferencia) || 0;
            avisar(diferencia === 0
                ? "Caja cerrada sin diferencia."
                : `Caja cerrada con diferencia de ${soles(diferencia)}.`);
        } catch (errorCierre) {
            avisar(errorCierre.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const seleccionarCaja = async (idCaja) => {
        setFormApertura((prev) => ({ ...prev, id_caja: idCaja }));
        setAperturaAnterior(null);
        if (!idCaja) {
            setFormApertura((prev) => ({ ...prev, monto_inicial: "" }));
            return;
        }
        const caja = catalogos.cajas.find((item) => String(item.id_caja) === String(idCaja));
        setFormApertura((prev) => ({
            ...prev,
            monto_inicial: String(Number(caja?.monto_base || 0).toFixed(2)),
        }));
        setConsultandoAnterior(true);
        try {
            const anterior = await obtenerUltimaAperturaCaja(idCaja);
            setAperturaAnterior(anterior);
            if (anterior) {
                const saldo = Number(anterior.saldo_siguiente ?? anterior.monto_declarado ?? anterior.monto_sistema ?? 0);
                setFormApertura((prev) => ({ ...prev, monto_inicial: saldo.toFixed(2) }));
            }
        } catch (errorAnterior) {
            avisar(errorAnterior.message, false);
        } finally {
            setConsultandoAnterior(false);
        }
    };

    const descargarReporteCierre = () => {
        if (!reporteCierre) return;
        const { apertura, resultado } = reporteCierre;
        const documento = new jsPDF();
        documento.setFontSize(16);
        documento.text("Reporte de cierre de caja", 14, 18);
        documento.setFontSize(10);
        documento.text(`Turno: ${apertura.numero_turno} · ${apertura.caja_nombre}`, 14, 27);
        documento.text(`Cajero: ${apertura.usuario_nombre}`, 14, 33);
        documento.text(`Apertura: ${fechaHora(apertura.f_apertura)}`, 14, 39);
        documento.text(`Cierre: ${fechaHora(resultado.f_cierre)}`, 14, 45);
        autoTable(documento, {
            startY: 52,
            head: [["Método de pago", "Esperado", "Contado", "Diferencia"]],
            body: resultado.arqueo.map((item) => [
                item.metodo,
                soles(item.esperado),
                soles(item.contado),
                soles(item.contado - item.esperado),
            ]),
        });
        const finalY = documento.lastAutoTable?.finalY || 60;
        documento.text(`Efectivo esperado: ${soles(resultado.monto_sistema)}`, 14, finalY + 9);
        documento.text(`Efectivo contado: ${soles(resultado.monto_declarado)}`, 14, finalY + 15);
        documento.text(`Diferencia de efectivo: ${soles(resultado.diferencia)}`, 14, finalY + 21);
        documento.text(`Fondo siguiente: ${soles(resultado.fondo_siguiente)}`, 14, finalY + 27);
        documento.text(`Retiro a caja fuerte: ${soles(Number(resultado.monto_declarado) - Number(resultado.fondo_siguiente))}`, 14, finalY + 33);
        if (observacionCierre) documento.text(`Observación: ${observacionCierre}`, 14, finalY + 42, { maxWidth: 180 });
        documento.save(`cierre-caja-${apertura.numero_turno}.pdf`);
    };

    const totalDia = pagos.reduce((s, p) => s + (p.tipo_signo === "-" ? -Number(p.monto) : Number(p.monto)), 0);
    const saldoAnterior = Number(
        aperturaAnterior?.saldo_siguiente
        ?? aperturaAnterior?.monto_declarado
        ?? aperturaAnterior?.monto_sistema
        ?? 0
    );
    const diferenciaApertura = Number(formApertura.monto_inicial || 0) - saldoAnterior;

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
                <form onSubmit={abrir} className="mb-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">
                        Fecha
                        <input
                            type="date"
                            value={fechaLocalISO()}
                            readOnly
                            className={`${inputClase} mt-1.5 font-normal`}
                        />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Usuario
                        <input
                            type="text"
                            value={nombreCajero}
                            readOnly
                            className={`${inputClase} mt-1.5 bg-slate-50 font-normal`}
                        />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Turno *
                        <select
                            value={formApertura.turno}
                            onChange={(e) => setFormApertura((prev) => ({ ...prev, turno: e.target.value }))}
                            className={`${inputClase} mt-1.5 font-normal`}
                        >
                            {TURNOS_CAJA.map((turno) => (
                                <option key={turno} value={turno}>{turno}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Caja *
                        <select
                            value={formApertura.id_caja}
                            onChange={(e) => seleccionarCaja(e.target.value)}
                            className={`${inputClase} mt-1.5 font-normal`}
                        >
                            <option value="">-- Seleccione --</option>
                            {catalogos.cajas.map((c) => {
                                const estaAbierta = aperturas.some((a) => String(a.id_caja) === String(c.id_caja));
                                return (
                                    <option key={c.id_caja} value={c.id_caja} disabled={estaAbierta}>
                                        {c.n_caja}{estaAbierta ? " (turno abierto)" : ""}
                                    </option>
                                );
                            })}
                        </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Fondo inicial contado (S/) *
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formApertura.monto_inicial}
                            onChange={(e) => setFormApertura((p) => ({ ...p, monto_inicial: e.target.value }))}
                            className={`${inputClase} mt-1.5 font-normal`}
                        />
                    </label>
                    {consultandoAnterior && (
                        <p className="text-sm text-slate-500 sm:col-span-2">Consultando el cierre anterior...</p>
                    )}
                    {aperturaAnterior && (
                        <div className={`rounded-xl border p-4 text-sm sm:col-span-2 ${Math.abs(diferenciaApertura) >= 0.01 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}>
                            <p>
                                Último cierre: <strong>{aperturaAnterior.numero_turno}</strong> · fondo para el siguiente turno{" "}
                                <strong>{soles(saldoAnterior)}</strong>.
                                Verifica el conteo físico antes de confirmar.
                            </p>
                            <p className="mt-1">
                                Diferencia inicial:{" "}
                                <strong>{soles(diferenciaApertura)}</strong>
                                {Math.abs(diferenciaApertura) >= 0.01 && " · revisa y deja constancia de la diferencia"}
                            </p>
                        </div>
                    )}
                    {!aperturaAnterior && formApertura.id_caja && !consultandoAnterior && (
                        <p className="text-sm text-slate-500 sm:col-span-2">
                            No hay cierre previo para esta caja. Se propone el monto base; confirma el efectivo contado.
                        </p>
                    )}
                    <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">
                        Notas de apertura
                        <textarea
                            value={formApertura.observacion}
                            onChange={(e) => setFormApertura((prev) => ({ ...prev, observacion: e.target.value }))}
                            rows="2"
                            className={`${inputClase} mt-1.5 font-normal`}
                            placeholder="Indica diferencias, novedades o estado del fondo."
                        />
                    </label>
                    <div className="flex items-end gap-2 sm:col-span-2">
                        <button
                            type="submit"
                            disabled={guardando || consultandoAnterior}
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

            {aperturaConfirmada && (
                <section
                    role="status"
                    className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
                >
                    <div className="flex items-start gap-3">
                        <i className="bi bi-check-circle-fill mt-0.5 text-xl text-emerald-600"></i>
                        <div className="w-full">
                            <h3 className="font-semibold">Caja abierta correctamente</h3>
                            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                <p>Caja: <strong>{aperturaConfirmada.caja_nombre}</strong></p>
                                <p>Turno: <strong>{aperturaConfirmada.numero_turno}</strong></p>
                                <p>Jornada: <strong>{aperturaConfirmada.turno_nombre}</strong></p>
                                <p>Usuario: <strong>{aperturaConfirmada.usuario_nombre}</strong></p>
                                <p>Fecha: <strong>{fechaHora(aperturaConfirmada.f_apertura)}</strong></p>
                                <p>Fondo inicial: <strong>{soles(aperturaConfirmada.monto_inicial)}</strong></p>
                                <p>Estado: <strong>Abierta</strong></p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {comprobantePago && (
                <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-sm text-emerald-900">
                        <h3 className="font-semibold">Comprobante de pago generado · CP-{comprobantePago.id_movimientocaja}</h3>
                        <div className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <p>Recibido de: <strong>{comprobantePago.cliente_nombre}</strong></p>
                            <p>Importe recibido: <strong>{soles(comprobantePago.monto)}</strong></p>
                            <p>Método: <strong>{comprobantePago.metodo_nombre}</strong></p>
                            <p>Operación: <strong>{comprobantePago.numero_operacion || "-"}</strong></p>
                            {comprobantePago.id_recepcion && (
                                <p>Recepción: <strong>#{comprobantePago.id_recepcion}</strong></p>
                            )}
                            {comprobantePago.saldo_pendiente != null && (
                                <p>Saldo restante: <strong>{soles(comprobantePago.saldo_pendiente)}</strong></p>
                            )}
                        </div>
                        <p className="mt-2 text-xs">
                            Constancia interna; no reemplaza una boleta o factura.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => descargarComprobantePago(comprobantePago)}
                        className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                        <i className="bi bi-file-earmark-pdf mr-2"></i>
                        Descargar constancia
                    </button>
                </section>
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
                                Recepción con saldo (opcional)
                                <select name="id_recepcion" value={form.id_recepcion} onChange={cambiar} className={`${inputClase} mt-1.5 font-normal`}>
                                    <option value="">-- Pago sin recepción --</option>
                                    {recepciones.map((r) => (
                                        <option key={r.id_recepcion} value={r.id_recepcion}>
                                            #{r.id_recepcion} · {r.cliente_nombre} · saldo {soles(r.saldo_pendiente ?? r.totaldeuda)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                Concepto *
                                <input
                                    type="search"
                                    aria-label="Buscar concepto"
                                    value={busquedaConcepto}
                                    onChange={(e) => setBusquedaConcepto(e.target.value)}
                                    placeholder="Buscar por concepto o tipo..."
                                    className={`${inputClase} mt-1.5 font-normal`}
                                />
                                <select
                                    aria-label="Filtrar conceptos por tipo"
                                    value={filtroTipoConcepto}
                                    onChange={(e) => setFiltroTipoConcepto(e.target.value)}
                                    disabled={Boolean(form.id_recepcion)}
                                    className={`${inputClase} mt-2 font-normal disabled:bg-slate-100`}
                                >
                                    {!form.id_recepcion && <option value="todos">Todos los tipos</option>}
                                    <option value="+">Solo ingresos</option>
                                    {!form.id_recepcion && <option value="-">Solo egresos</option>}
                                </select>
                                <select
                                    aria-label="Seleccionar concepto"
                                    name="id_concepto"
                                    value={form.id_concepto}
                                    onChange={cambiar}
                                    className={`${inputClase} mt-2 font-normal`}
                                >
                                    <option value="">-- Seleccione --</option>
                                    {conceptosFiltrados.map((c) => {
                                        const tipo = catalogos.tipos.find((t) =>
                                            String(t.id_tipomovimiento) === String(c.id_tipomovimiento)
                                        );
                                        return (
                                            <option key={c.id_concepto} value={c.id_concepto}>
                                                {c.n_concepto} ({tipo?.n_tipomovimiento || "-"})
                                            </option>
                                        );
                                    })}
                                </select>
                                {conceptosFiltrados.length === 0 && (
                                    <span className="mt-1 block text-[11px] font-normal text-amber-700">
                                        No hay conceptos que coincidan. Revisa el filtro o solicita al administrador que configure el concepto necesario.
                                    </span>
                                )}
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
                                        Saldo actual: {soles(recepcionSeleccionada.saldo_pendiente ?? recepcionSeleccionada.totaldeuda)}
                                    </span>
                                )}
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                N° de operación
                                <input
                                    type="text"
                                    aria-label="Número de operación generado"
                                    value={proximaOperacion}
                                    readOnly
                                    className={`${inputClase} mt-1.5 bg-slate-50 font-normal`}
                                />
                                <span className="mt-1 block text-[11px] font-normal text-gray-500">
                                    Se asigna automáticamente y se vuelve a verificar al registrar el movimiento.
                                </span>
                            </label>

                            <label className="block text-xs font-semibold text-slate-700">
                                N° de comprobante o voucher
                                <input
                                    type="text"
                                    aria-label="N° de comprobante o voucher"
                                    name="documento"
                                    value={form.documento}
                                    onChange={cambiar}
                                    className={`${inputClase} mt-1.5 font-normal`}
                                />
                                <span className="mt-1 block text-[11px] font-normal text-gray-500">
                                    Referencia del comprobante del pago; no es el DNI/RUC. Los datos del huésped aparecen al asociar una recepción.
                                </span>
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
                                        onClick={() => prepararCierre(a)}
                                        disabled={guardando}
                                        className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        Iniciar arqueo y cierre
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {turnoCierre && arqueo && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
                    <form
                        onSubmit={confirmarCierre}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-arqueo"
                        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h3 id="titulo-arqueo" className="text-xl font-bold text-slate-900">
                                    Arqueo del turno {turnoCierre.numero_turno}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {turnoCierre.caja_nombre} · Fondo inicial {soles(arqueo.apertura.monto_inicial)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setTurnoCierre(null); setArqueo(null); }}
                                className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
                                aria-label="Cancelar arqueo"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <p className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                            Compara el importe esperado por el sistema con el efectivo contado y los comprobantes de cada medio.
                            Los valores esperados se calculan con los movimientos del turno.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2">Método de pago</th>
                                        <th className="px-3 py-2">Esperado</th>
                                        <th className="px-3 py-2">Contado / verificado</th>
                                        <th className="px-3 py-2">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {arqueo.metodos.map((metodo) => {
                                        const idMetodo = String(metodo.clave || metodo.id_metodopago || "efectivo");
                                        const contado = conteoMetodos[idMetodo];
                                        const diferencia = contado === "" ? null : Number(contado) - metodo.esperado;
                                        return (
                                            <tr key={idMetodo}>
                                                <td className="px-3 py-3 font-medium text-slate-800">{metodo.nombre}</td>
                                                <td className="px-3 py-3">{soles(metodo.esperado)}</td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        aria-label={`Contado ${metodo.nombre}`}
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                        value={contado}
                                                        onChange={(e) => setConteoMetodos((prev) => ({ ...prev, [idMetodo]: e.target.value }))}
                                                        className={`${inputClase} min-w-32`}
                                                    />
                                                </td>
                                                <td className={`px-3 py-3 font-semibold ${diferencia === null || diferencia === 0 ? "text-slate-500" : "text-amber-700"}`}>
                                                    {diferencia === null ? "—" : soles(diferencia)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-slate-700">
                                Efectivo que queda como fondo siguiente (S/)
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={fondoSiguiente}
                                    onChange={(e) => setFondoSiguiente(e.target.value)}
                                    className={`${inputClase} mt-1.5 font-normal`}
                                />
                            </label>
                            <div className="rounded-xl bg-slate-50 p-3 text-sm">
                                <p>Esperado en efectivo: <strong>{soles(arqueo.apertura.monto_sistema)}</strong></p>
                                <p>Retiro a caja fuerte: <strong>{soles(retiroEstimado)}</strong></p>
                            </div>
                            <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">
                                Observaciones de cierre
                                <textarea
                                    value={observacionCierre}
                                    onChange={(e) => setObservacionCierre(e.target.value)}
                                    rows="2"
                                    className={`${inputClase} mt-1.5 font-normal`}
                                    placeholder="Registra diferencias, vouchers pendientes u otras novedades."
                                />
                            </label>
                        </div>
                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => { setTurnoCierre(null); setArqueo(null); }}
                                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={guardando}
                                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                                {guardando ? "Cerrando..." : "Confirmar cierre"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {reporteCierre && (
                <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-sm text-emerald-900">
                        <p className="font-semibold">Cierre de {reporteCierre.apertura.numero_turno} registrado.</p>
                        <p>
                            Esperado: {soles(reporteCierre.resultado.monto_sistema)} · contado:{" "}
                            {soles(reporteCierre.resultado.monto_declarado)} · diferencia:{" "}
                            {soles(reporteCierre.resultado.diferencia)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={descargarReporteCierre}
                        className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                        <i className="bi bi-file-earmark-pdf mr-2"></i>
                        Descargar reporte PDF
                    </button>
                </section>
            )}

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
                                <th className="px-5 py-3 font-semibold">Constancia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cargando ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400">Cargando...</td>
                                </tr>
                            ) : pagos.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400">Sin movimientos</td>
                                </tr>
                            ) : (
                                pagosPagina.map((p) => (
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
                                        <td className="px-5 py-3">
                                            {p.tipo_signo === "+" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => descargarComprobantePago(p)}
                                                    className="whitespace-nowrap rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                                    aria-label={`Descargar constancia del pago ${p.id_movimientocaja}`}
                                                >
                                                    Descargar PDF
                                                </button>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <Paginacion {...paginacion} total={pagos.length} cargando={cargando} />

            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
                    {toast.mensaje}
                </div>
            )}
        </div>
    );
};

export default Pagos;
