import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
    buscarDisponibilidadHabitaciones,
    listarCatalogosReserva,
    registrarReserva,
} from "../services/procesosService";
import { consultarDocumento } from "../services/factilizaService";
import { fecha, hoy, noches, soles, sumarDias } from "../utils/format";
import { crearEnlaceCorreoReserva } from "../utils/comprobanteReserva";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const Reservas = ({ onVerReservas }) => {
    const [fEntrada, setFEntrada] = useState(hoy());
    const [fSalida, setFSalida] = useState(sumarDias(hoy(), 1));
    const [huespedes, setHuespedes] = useState("2");
    const [resultados, setResultados] = useState(null);
    const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [pasoFormulario, setPasoFormulario] = useState("huesped");
    const [modoCliente, setModoCliente] = useState("nuevo");
    const [tipoCliente, setTipoCliente] = useState("persona");
    const [clienteId, setClienteId] = useState("");
    const [metodoPagoId, setMetodoPagoId] = useState("");
    const [catalogosReserva, setCatalogosReserva] = useState(null);
    const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
    const [consultandoDocumento, setConsultandoDocumento] = useState(false);
    const [datosPersona, setDatosPersona] = useState({
        id_tipoidentidad: "",
        n_documento: "",
        nombre: "",
        ap_paterno: "",
        ap_materno: "",
        email: "",
        celular: "",
        id_distrito: "",
    });
    const [datosEmpresa, setDatosEmpresa] = useState({
        ruc: "",
        razon_social: "",
        direccion: "",
        telefono: "",
    });
    const [guardandoReserva, setGuardandoReserva] = useState(false);
    const [reservaRegistrada, setReservaRegistrada] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    const totalReserva = habitacionSeleccionada
        ? (Number(habitacionSeleccionada.precio) || 0) * noches(fEntrada, fSalida)
        : 0;
    const identidadPersona = catalogosReserva?.identidades.find(
        (identidad) => String(identidad.id_tipoidentidad) === String(datosPersona.id_tipoidentidad)
    );
    const documentoEsDni = String(identidadPersona?.abreviatura || "").toUpperCase() === "DNI";

    const buscar = async (e) => {
        e.preventDefault();
        setError("");
        setHabitacionSeleccionada(null);
        setMostrarFormulario(false);
        setReservaRegistrada(null);

        if (fEntrada < hoy()) {
            setError("La fecha de entrada no puede ser anterior a hoy.");
            return;
        }
        if (noches(fEntrada, fSalida) <= 0) {
            setError("La fecha de salida debe ser posterior a la fecha de entrada.");
            return;
        }
        if (!Number.isInteger(Number(huespedes)) || Number(huespedes) < 1) {
            setError("Ingresa una cantidad válida de huéspedes.");
            return;
        }

        setCargando(true);
        try {
            const disponibles = await buscarDisponibilidadHabitaciones({
                f_entrada: fEntrada,
                f_salida: fSalida,
            });
            setResultados(disponibles);
        } catch (errorBusqueda) {
            setResultados(null);
            setError(errorBusqueda.message || "No se pudo consultar la disponibilidad.");
        } finally {
            setCargando(false);
        }
    };

    const seleccionarHabitacion = async (habitacion) => {
        setHabitacionSeleccionada(habitacion);
        setReservaRegistrada(null);
        setError("");
        setMostrarFormulario(true);
        setPasoFormulario("huesped");
        setModoCliente("nuevo");
        setTipoCliente("persona");
        setClienteId("");
        setDatosPersona({
            id_tipoidentidad: "",
            n_documento: "",
            nombre: "",
            ap_paterno: "",
            ap_materno: "",
            email: "",
            celular: "",
            id_distrito: "",
        });
        setDatosEmpresa({ ruc: "", razon_social: "", direccion: "", telefono: "" });

        if (catalogosReserva) {
            const dni = catalogosReserva.identidades.find(
                (identidad) => String(identidad.abreviatura || "").toUpperCase() === "DNI"
            );
            if (dni) {
                setDatosPersona((prev) => ({ ...prev, id_tipoidentidad: String(dni.id_tipoidentidad) }));
            }
            return;
        }
        setCargandoCatalogos(true);
        try {
            const catalogos = await listarCatalogosReserva();
            setCatalogosReserva(catalogos);
            setMetodoPagoId(catalogos.metodos[0] ? String(catalogos.metodos[0].id_metodopago) : "");
            const dni = catalogos.identidades.find(
                (identidad) => String(identidad.abreviatura || "").toUpperCase() === "DNI"
            );
            if (dni) {
                setDatosPersona((prev) => ({ ...prev, id_tipoidentidad: String(dni.id_tipoidentidad) }));
            }
        } catch (errorCatalogos) {
            setError(`No se pudieron cargar los datos para registrar la reserva: ${errorCatalogos.message}`);
        } finally {
            setCargandoCatalogos(false);
        }
    };

    const consultarDocumentoHuesped = async () => {
        const esEmpresa = tipoCliente === "empresa";
        if (!esEmpresa && !documentoEsDni) {
            setError("Selecciona DNI como tipo de documento para consultar los datos.");
            return;
        }
        const tipo = esEmpresa ? "ruc" : "dni";
        const documento = String(esEmpresa ? datosEmpresa.ruc : datosPersona.n_documento).trim();
        const longitud = esEmpresa ? 11 : 8;
        if (!new RegExp(`^\\d{${longitud}}$`).test(documento)) {
            setError(`Ingresa un ${tipo.toUpperCase()} válido de ${longitud} dígitos.`);
            return;
        }
        setConsultandoDocumento(true);
        setError("");
        try {
            const datos = await consultarDocumento(tipo, documento);
            if (esEmpresa) {
                setDatosEmpresa((prev) => ({
                    ...prev,
                    ruc: datos.numero || documento,
                    razon_social: datos.nombre_o_razon_social || prev.razon_social,
                    direccion: datos.direccion || prev.direccion,
                }));
            } else {
                const tipoDni = catalogosReserva?.identidades.find(
                    (identidad) => String(identidad.abreviatura || "").toUpperCase() === "DNI"
                );
                setDatosPersona((prev) => ({
                    ...prev,
                    id_tipoidentidad: tipoDni ? String(tipoDni.id_tipoidentidad) : prev.id_tipoidentidad,
                    n_documento: datos.numero || documento,
                    nombre: datos.nombres || prev.nombre,
                    ap_paterno: datos.apellido_paterno || prev.ap_paterno,
                    ap_materno: datos.apellido_materno || prev.ap_materno,
                }));
            }
        } catch (errorConsulta) {
            setError(errorConsulta.message);
        } finally {
            setConsultandoDocumento(false);
        }
    };

    const continuarDatosHuesped = () => {
        setError("");
        if (modoCliente === "existente") {
            if (!clienteId) {
                setError("Selecciona un huésped o una empresa registrados.");
                return;
            }
        } else if (tipoCliente === "persona") {
            if (!datosPersona.id_tipoidentidad || !datosPersona.id_distrito
                || !datosPersona.nombre.trim() || !datosPersona.ap_paterno.trim()
                || !/^\d{8,12}$/.test(datosPersona.n_documento)) {
                setError("Completa tipo y número de documento, nombres, apellido paterno y distrito.");
                return;
            }
        } else if (!/^\d{11}$/.test(datosEmpresa.ruc) || !datosEmpresa.razon_social.trim()) {
            setError("Ingresa un RUC de 11 dígitos y la razón social de la empresa.");
            return;
        }
        setPasoFormulario("reserva");
    };

    const guardarReserva = async (e) => {
        e.preventDefault();
        setError("");
        if (!habitacionSeleccionada || !metodoPagoId) {
            setError("Selecciona un método de pago previsto para continuar.");
            return;
        }
        setGuardandoReserva(true);
        try {
            const reserva = await registrarReserva({
                id_cliente: modoCliente === "existente" ? Number(clienteId) : null,
                tipo_cliente: tipoCliente,
                persona: datosPersona,
                empresa: datosEmpresa,
                id_habitacion: habitacionSeleccionada.id_habitacion,
                id_metodopago: Number(metodoPagoId),
                f_entrada: fEntrada,
                f_salida: fSalida,
                huespedes: Number(huespedes),
                total: totalReserva,
            });
            setReservaRegistrada({
                ...reserva,
                habitacion_numero: habitacionSeleccionada.numero,
                metodo_pago_nombre: catalogosReserva.metodos.find(
                    (metodo) => String(metodo.id_metodopago) === String(metodoPagoId)
                )?.n_metodopago || "",
                estado_nombre: "Pendiente de check-in",
                noches: noches(reserva.f_entrada, reserva.f_salida),
                correo_envio: reserva.cliente_email || (
                    modoCliente === "existente"
                        ? catalogosReserva.clientes.find(
                            (cliente) => String(cliente.id_cliente) === String(clienteId)
                        )?.email
                        : tipoCliente === "persona" ? datosPersona.email : ""
                ) || "",
                cliente_nombre: reserva.cliente_nombre || (tipoCliente === "empresa"
                    ? datosEmpresa.razon_social
                    : `${datosPersona.nombre} ${datosPersona.ap_paterno} ${datosPersona.ap_materno}`.trim()),
            });
            setMostrarFormulario(false);
            setHabitacionSeleccionada(null);
            setResultados(null);
        } catch (errorReserva) {
            setError(errorReserva.message || "No se pudo registrar la reserva.");
        } finally {
            setGuardandoReserva(false);
        }
    };

    const descargarComprobante = () => {
        if (!reservaRegistrada) return;
        const documento = new jsPDF();
        documento.setFontSize(18);
        documento.text("HOTEL SOL ICA", 105, 18, { align: "center" });
        documento.setFontSize(13);
        documento.text("Comprobante de reserva", 105, 27, { align: "center" });
        documento.setFontSize(10);
        documento.text(`Reserva N° ${reservaRegistrada.id_recepcion}`, 14, 38);
        documento.text(`Estado: ${reservaRegistrada.estado_nombre}`, 14, 44);
        autoTable(documento, {
            startY: 52,
            head: [["Detalle", "Información"]],
            body: [
                ["Huésped / razón social", reservaRegistrada.cliente_nombre || "-"],
                ["Documento", reservaRegistrada.cliente_documento || "-"],
                ["Habitación", String(reservaRegistrada.habitacion_numero || "-")],
                ["Entrada", fecha(reservaRegistrada.f_entrada)],
                ["Salida", fecha(reservaRegistrada.f_salida)],
                ["Duración", `${reservaRegistrada.noches} noche(s)`],
                ["Huéspedes", String(reservaRegistrada.huespedes)],
                ["Método de pago previsto", reservaRegistrada.metodo_pago_nombre || "-"],
                ["Total reservado", soles(reservaRegistrada.d_inicial)],
                ["Adelanto registrado", soles(reservaRegistrada.adelanto)],
                ["Saldo pendiente", soles(reservaRegistrada.totaldeuda)],
            ],
            theme: "grid",
            headStyles: { fillColor: [30, 64, 175] },
            styles: { fontSize: 10, cellPadding: 3 },
        });
        const finalY = documento.lastAutoTable?.finalY || 60;
        documento.setFontSize(9);
        documento.text(
            "Este documento confirma una reserva pendiente de check-in; no es una factura, boleta ni comprobante de pago.",
            14,
            finalY + 10,
            { maxWidth: 180 }
        );
        documento.text("Hotel Sol Ica", 14, finalY + 22);
        documento.save(`reserva-${reservaRegistrada.id_recepcion}.pdf`);
    };

    const correoReservaValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(reservaRegistrada?.correo_envio || "").trim()
    );
    const enlaceCorreoReserva = reservaRegistrada && correoReservaValido
        ? crearEnlaceCorreoReserva(reservaRegistrada, reservaRegistrada.correo_envio)
        : undefined;

    const cambiarEntrada = (e) => {
        const entrada = e.target.value;
        setFEntrada(entrada);
        if (fSalida <= entrada) setFSalida(sumarDias(entrada, 1));
        setResultados(null);
        setHabitacionSeleccionada(null);
    };

    const cambiarSalida = (e) => {
        setFSalida(e.target.value);
        setResultados(null);
        setHabitacionSeleccionada(null);
    };

    const limpiarBusqueda = () => {
        setFEntrada(hoy());
        setFSalida(sumarDias(hoy(), 1));
        setHuespedes("2");
        setResultados(null);
        setHabitacionSeleccionada(null);
        setError("");
    };

    return (
        <div>
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="module-icon">
                        <i className="bi bi-calendar-check"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Disponibilidad de habitaciones</h2>
                        <p className="text-sm text-gray-500">
                            Consulta qué habitaciones están disponibles para las fechas de la estadía.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onVerReservas}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <i className="bi bi-list-ul mr-2"></i>
                    Ver reservas registradas
                </button>
            </header>

            {error && (
                <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <i className="bi bi-exclamation-triangle mr-2"></i>
                    {error}
                </div>
            )}

            <form onSubmit={buscar} className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block text-xs font-semibold text-slate-700">
                        Fecha de entrada *
                        <input
                            aria-label="Fecha de entrada"
                            type="date"
                            required
                            min={hoy()}
                            value={fEntrada}
                            onChange={cambiarEntrada}
                            className={`${inputClase} mt-1.5 font-normal`}
                        />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Fecha de salida *
                        <input
                            aria-label="Fecha de salida"
                            type="date"
                            required
                            min={sumarDias(fEntrada, 1)}
                            value={fSalida}
                            onChange={cambiarSalida}
                            className={`${inputClase} mt-1.5 font-normal`}
                        />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Número de huéspedes *
                        <input
                            aria-label="Número de huéspedes"
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={huespedes}
                            onChange={(e) => {
                                setHuespedes(e.target.value);
                                setResultados(null);
                                setHabitacionSeleccionada(null);
                            }}
                            className={`${inputClase} mt-1.5 font-normal`}
                        />
                    </label>
                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            disabled={cargando}
                            className="flex-1 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                            <i className="bi bi-search mr-2"></i>
                            {cargando ? "Buscando..." : "Buscar"}
                        </button>
                        <button
                            type="button"
                            onClick={limpiarBusqueda}
                            disabled={cargando}
                            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                    Estadía: {noches(fEntrada, fSalida)} noche(s). El inventario actual no registra capacidad máxima por habitación;
                    confirma el número de huéspedes al preparar la reserva.
                </p>
            </form>

            {habitacionSeleccionada && !mostrarFormulario && (
                <section role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <p>
                        <i className="bi bi-check-circle-fill mr-2"></i>
                        Habitación <strong>{habitacionSeleccionada.numero}</strong> seleccionada para{" "}
                        <strong>{huespedes}</strong> huésped(es), del {fecha(fEntrada)} al {fecha(fSalida)}.
                    </p>
                    <span className="font-medium">Completa los datos para registrar la reserva.</span>
                </section>
            )}

            {resultados !== null && (
                <section aria-live="polite">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h3 className="font-semibold text-slate-900">Habitaciones disponibles</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                {fecha(fEntrada)} – {fecha(fSalida)} · {huespedes} huésped(es)
                            </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                            {resultados.length} disponible(s)
                        </span>
                    </div>

                    {resultados.length === 0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                            <i className="bi bi-calendar-x text-3xl text-amber-600"></i>
                            <p className="mt-2 font-semibold text-amber-900">No hay habitaciones disponibles para esas fechas.</p>
                            <p className="mt-1 text-sm text-amber-800">Prueba con otras fechas o consulta otra vez más adelante.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {resultados.map((habitacion) => {
                                const seleccionada = String(habitacionSeleccionada?.id_habitacion) === String(habitacion.id_habitacion);
                                const total = (Number(habitacion.precio) || 0) * noches(fEntrada, fSalida);
                                return (
                                    <article
                                        key={habitacion.id_habitacion}
                                        className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${seleccionada ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-blue-200"}`}
                                    >
                                        <div className="flex h-28 items-center justify-center bg-gradient-to-br from-blue-100 via-slate-100 to-amber-50">
                                            <i className="bi bi-door-open text-5xl text-blue-700"></i>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-900">Habitación {habitacion.numero}</h4>
                                                    <p className="mt-1 text-sm text-slate-500">{habitacion.categoria_nombre || "Sin categoría"}</p>
                                                </div>
                                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                                                    Disponible
                                                </span>
                                            </div>
                                            <div className="mt-4 space-y-2 text-sm text-slate-600">
                                                {habitacion.piso_nombre && (
                                                    <p><i className="bi bi-building mr-2 text-slate-400"></i>{habitacion.piso_nombre}</p>
                                                )}
                                                {habitacion.detalle && (
                                                    <p className="line-clamp-2"><i className="bi bi-info-circle mr-2 text-slate-400"></i>{habitacion.detalle}</p>
                                                )}
                                                <p><i className="bi bi-moon mr-2 text-slate-400"></i>{noches(fEntrada, fSalida)} noche(s)</p>
                                            </div>
                                            <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
                                                <div>
                                                    <p className="text-xs text-slate-500">{soles(habitacion.precio)} / noche</p>
                                                    <p className="mt-0.5 text-lg font-bold text-slate-900">{soles(total)}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => seleccionarHabitacion(habitacion)}
                                                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${seleccionada ? "bg-emerald-600 text-white" : "bg-blue-700 text-white hover:bg-blue-800"}`}
                                                >
                                                    {seleccionada ? "Continuar reserva" : "Seleccionar"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {mostrarFormulario && habitacionSeleccionada && (
                <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Nueva reserva</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Habitación {habitacionSeleccionada.numero} · {fecha(fEntrada)} al {fecha(fSalida)} · {huespedes} huésped(es)
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setMostrarFormulario(false);
                                setHabitacionSeleccionada(null);
                                setError("");
                            }}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cambiar habitación
                        </button>
                    </div>

                    <div className="flex border-b border-gray-100 px-5">
                        <button
                            type="button"
                            onClick={() => setPasoFormulario("huesped")}
                            className={`border-b-2 px-4 py-3 text-sm font-semibold ${pasoFormulario === "huesped" ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500"}`}
                        >
                            1. Datos del huésped
                        </button>
                        <button
                            type="button"
                            onClick={continuarDatosHuesped}
                            className={`border-b-2 px-4 py-3 text-sm font-semibold ${pasoFormulario === "reserva" ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500"}`}
                        >
                            2. Detalles de la reserva
                        </button>
                    </div>

                    {cargandoCatalogos ? (
                        <p className="p-6 text-sm text-slate-500">Cargando huéspedes, documentos y métodos de pago...</p>
                    ) : catalogosReserva && pasoFormulario === "huesped" ? (
                        <div className="p-5 sm:p-6">
                            <div className="mb-5 grid gap-3 sm:grid-cols-2">
                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                                    <input
                                        type="radio"
                                        name="modoCliente"
                                        value="nuevo"
                                        checked={modoCliente === "nuevo"}
                                        onChange={() => { setModoCliente("nuevo"); setClienteId(""); }}
                                        className="mt-1"
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-900">Registrar huésped</span>
                                        <span className="mt-1 block text-xs text-slate-500">Crear una persona o empresa en el registro del hotel.</span>
                                    </span>
                                </label>
                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
                                    <input
                                        type="radio"
                                        name="modoCliente"
                                        value="existente"
                                        checked={modoCliente === "existente"}
                                        onChange={() => { setModoCliente("existente"); setClienteId(""); }}
                                        className="mt-1"
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-900">Usar huésped registrado</span>
                                        <span className="mt-1 block text-xs text-slate-500">Buscar una persona o empresa ya registrada.</span>
                                    </span>
                                </label>
                            </div>

                            {modoCliente === "existente" ? (
                                <label className="block max-w-2xl text-xs font-semibold text-slate-700">
                                    Huésped o empresa *
                                    <select
                                        aria-label="Huésped registrado"
                                        value={clienteId}
                                        onChange={(e) => setClienteId(e.target.value)}
                                        className={`${inputClase} mt-1.5 font-normal`}
                                    >
                                        <option value="">-- Seleccione --</option>
                                        {catalogosReserva.clientes.map((cliente) => (
                                            <option key={cliente.id_cliente} value={cliente.id_cliente}>
                                                {cliente.nombre} · {cliente.documento || "Sin documento"}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : (
                                <>
                                    <div className="mb-4 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTipoCliente("persona")}
                                            className={`rounded-full px-4 py-2 text-sm font-semibold ${tipoCliente === "persona" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}
                                        >
                                            Persona natural
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTipoCliente("empresa")}
                                            className={`rounded-full px-4 py-2 text-sm font-semibold ${tipoCliente === "empresa" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}
                                        >
                                            Empresa
                                        </button>
                                    </div>

                                    {tipoCliente === "persona" ? (
                                        <>
                                            <div className="mb-4 grid gap-4 sm:grid-cols-2">
                                                <label className="block text-xs font-semibold text-slate-700">
                                                    Tipo de documento *
                                                    <select
                                                        aria-label="Tipo de documento"
                                                        value={datosPersona.id_tipoidentidad}
                                                        onChange={(e) => setDatosPersona((prev) => ({ ...prev, id_tipoidentidad: e.target.value }))}
                                                        className={`${inputClase} mt-1.5 font-normal`}
                                                    >
                                                        <option value="">-- Seleccione --</option>
                                                        {catalogosReserva.identidades.map((identidad) => (
                                                            <option key={identidad.id_tipoidentidad} value={identidad.id_tipoidentidad}>
                                                                {identidad.abreviatura}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <div>
                                                    <label htmlFor="reserva-documento-persona" className="block text-xs font-semibold text-slate-700">
                                                        Número de documento *
                                                    </label>
                                                    <div className="mt-1.5 flex gap-2">
                                                        <input
                                                            id="reserva-documento-persona"
                                                            aria-label="DNI del huésped"
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={documentoEsDni ? "8" : "12"}
                                                            value={datosPersona.n_documento}
                                                            onChange={(e) => setDatosPersona((prev) => ({ ...prev, n_documento: e.target.value.replace(/\D/g, "") }))}
                                                            className={`${inputClase} min-w-0 font-normal`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={consultarDocumentoHuesped}
                                                            disabled={consultandoDocumento || !documentoEsDni}
                                                            className="shrink-0 rounded-xl bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                                                        >
                                                            {consultandoDocumento ? "Consultando..." : "Consultar DNI"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                <label className="block text-xs font-semibold text-slate-700">
                                                    Nombres *
                                                    <input aria-label="Nombres del huésped" value={datosPersona.nombre} onChange={(e) => setDatosPersona((prev) => ({ ...prev, nombre: e.target.value }))} className={`${inputClase} mt-1.5 font-normal`} />
                                                </label>
                                                <label className="block text-xs font-semibold text-slate-700">
                                                    Apellido paterno *
                                                    <input aria-label="Apellido paterno" value={datosPersona.ap_paterno} onChange={(e) => setDatosPersona((prev) => ({ ...prev, ap_paterno: e.target.value }))} className={`${inputClase} mt-1.5 font-normal`} />
                                                </label>
                                                <label className="block text-xs font-semibold text-slate-700">
                                                    Apellido materno
                                                    <input aria-label="Apellido materno" value={datosPersona.ap_materno} onChange={(e) => setDatosPersona((prev) => ({ ...prev, ap_materno: e.target.value }))} className={`${inputClase} mt-1.5 font-normal`} />
                                                </label>
                                                <label className="block text-xs font-semibold text-slate-700">
                                                    Teléfono
                                                    <input aria-label="Teléfono del huésped" type="tel" value={datosPersona.celular} onChange={(e) => setDatosPersona((prev) => ({ ...prev, celular: e.target.value }))} className={`${inputClase} mt-1.5 font-normal`} />
                                                </label>
                                                <label className="block text-xs font-semibold text-slate-700">
                                                    Correo electrónico
                                                    <input aria-label="Correo del huésped" type="email" value={datosPersona.email} onChange={(e) => setDatosPersona((prev) => ({ ...prev, email: e.target.value }))} className={`${inputClase} mt-1.5 font-normal`} />
                                                </label>
                                                <label className="block text-xs font-semibold text-slate-700">
                                                    Distrito *
                                                    <select
                                                        aria-label="Distrito del huésped"
                                                        value={datosPersona.id_distrito}
                                                        onChange={(e) => setDatosPersona((prev) => ({ ...prev, id_distrito: e.target.value }))}
                                                        className={`${inputClase} mt-1.5 font-normal`}
                                                    >
                                                        <option value="">-- Seleccione --</option>
                                                        {catalogosReserva.distritos.map((distrito) => (
                                                            <option key={distrito.id_distrito} value={distrito.id_distrito}>{distrito.d_distrito}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="reserva-ruc" className="block text-xs font-semibold text-slate-700">RUC *</label>
                                                <div className="mt-1.5 flex gap-2">
                                                    <input
                                                        id="reserva-ruc"
                                                        aria-label="RUC de la empresa"
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength="11"
                                                        value={datosEmpresa.ruc}
                                                        onChange={(e) => setDatosEmpresa((prev) => ({ ...prev, ruc: e.target.value.replace(/\D/g, "") }))}
                                                        className={`${inputClase} min-w-0 font-normal`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={consultarDocumentoHuesped}
                                                        disabled={consultandoDocumento}
                                                        className="shrink-0 rounded-xl bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                                                    >
                                                        {consultandoDocumento ? "Consultando..." : "Consultar RUC"}
                                                    </button>
                                                </div>
                                            </div>
                                            <label className="block text-xs font-semibold text-slate-700">
                                                Razón social *
                                                <input aria-label="Razón social" value={datosEmpresa.razon_social} onChange={(e) => setDatosEmpresa((prev) => ({ ...prev, razon_social: e.target.value }))} className={`${inputClase} mt-1.5 font-normal`} />
                                            </label>
                                            <label className="block text-xs font-semibold text-slate-700">
                                                Dirección
                                                <input aria-label="Dirección de empresa" value={datosEmpresa.direccion} onChange={(e) => setDatosEmpresa((prev) => ({ ...prev, direccion: e.target.value }))} className={`${inputClase} mt-1.5 font-normal`} />
                                            </label>
                                            <label className="block text-xs font-semibold text-slate-700">
                                                Teléfono
                                                <input aria-label="Teléfono de empresa" type="tel" value={datosEmpresa.telefono} onChange={(e) => setDatosEmpresa((prev) => ({ ...prev, telefono: e.target.value }))} className={`${inputClase} mt-1.5 font-normal`} />
                                            </label>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="mt-6 flex justify-end">
                                <button
                                    type="button"
                                    onClick={continuarDatosHuesped}
                                    disabled={cargandoCatalogos || consultandoDocumento}
                                    className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                                >
                                    Siguiente: detalles de reserva
                                    <i className="bi bi-arrow-right ml-2"></i>
                                </button>
                            </div>
                        </div>
                    ) : catalogosReserva ? (
                        <form onSubmit={guardarReserva} className="p-5 sm:p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                                    <p className="text-xs text-slate-500">Habitación</p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {habitacionSeleccionada.numero} · {habitacionSeleccionada.categoria_nombre}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                                    <p className="text-xs text-slate-500">Fechas y duración</p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {fecha(fEntrada)} – {fecha(fSalida)} · {noches(fEntrada, fSalida)} noche(s)
                                    </p>
                                </div>
                                <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                                    <p className="text-xs text-blue-700">Total estimado</p>
                                    <p className="mt-1 text-lg font-bold">{soles(totalReserva)}</p>
                                    <p className="text-xs">{soles(habitacionSeleccionada.precio)} por noche</p>
                                </div>
                            </div>
                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Método de pago previsto *
                                    <select
                                        aria-label="Método de pago previsto"
                                        required
                                        value={metodoPagoId}
                                        onChange={(e) => setMetodoPagoId(e.target.value)}
                                        className={`${inputClase} mt-1.5 font-normal`}
                                    >
                                        <option value="">-- Seleccione --</option>
                                        {catalogosReserva.metodos.map((metodo) => (
                                            <option key={metodo.id_metodopago} value={metodo.id_metodopago}>
                                                {metodo.n_metodopago}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {catalogosReserva.metodos.length === 0 && (
                                    <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
                                        No hay métodos de pago activos. La reserva necesita un método previsto según la estructura actual; solicita al administrador que configure el catálogo.
                                    </p>
                                )}
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
                                    La reserva no registra un cobro ni un adelanto en este paso. Los huéspedes son informativos:
                                    la tabla existente de reservas no tiene un campo para persistir su cantidad. El check-in y el pago se gestionan después.
                                </div>
                            </div>
                            <div className="mt-6 flex flex-wrap justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setPasoFormulario("huesped"); setError(""); }}
                                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                                >
                                    <i className="bi bi-arrow-left mr-2"></i>
                                    Volver a datos del huésped
                                </button>
                                <button
                                    type="submit"
                                    disabled={guardandoReserva || !metodoPagoId}
                                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    <i className="bi bi-calendar-check mr-2"></i>
                                    {guardandoReserva ? "Registrando..." : "Guardar reserva"}
                                </button>
                            </div>
                        </form>
                    ) : null}
                </section>
            )}

            {reservaRegistrada && (
                <section role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h3 className="font-semibold">
                                <i className="bi bi-check-circle-fill mr-2 text-emerald-600"></i>
                                Reserva registrada correctamente
                            </h3>
                            <div className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                                <p>Número: <strong>#{reservaRegistrada.id_recepcion}</strong></p>
                                <p>Huésped: <strong>{reservaRegistrada.cliente_nombre}</strong></p>
                                <p>Documento: <strong>{reservaRegistrada.cliente_documento || "—"}</strong></p>
                                <p>Habitación: <strong>{reservaRegistrada.habitacion_numero}</strong></p>
                                <p>
                                    Estadía: <strong>{fecha(reservaRegistrada.f_entrada)} – {fecha(reservaRegistrada.f_salida)} · {reservaRegistrada.noches} noche(s)</strong>
                                </p>
                                <p>Huéspedes: <strong>{reservaRegistrada.huespedes}</strong></p>
                                <p>Total reservado: <strong>{soles(reservaRegistrada.d_inicial)}</strong></p>
                                <p>Método previsto: <strong>{reservaRegistrada.metodo_pago_nombre || "—"}</strong></p>
                                <p>Estado: <strong>{reservaRegistrada.estado_nombre}</strong></p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={descargarComprobante}
                                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                                <i className="bi bi-file-earmark-pdf mr-2"></i>
                                Descargar comprobante PDF
                            </button>
                            {onVerReservas && (
                                <button
                                    type="button"
                                    onClick={onVerReservas}
                                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                                >
                                    Ver reservas
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setReservaRegistrada(null);
                                    setError("");
                                }}
                                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                            >
                                Nueva búsqueda
                            </button>
                        </div>
                    </div>
                    <div className="mt-5 border-t border-emerald-200 pt-4">
                        <label className="block max-w-lg text-sm font-semibold text-emerald-950">
                            Correo del destinatario
                            <input
                                type="email"
                                value={reservaRegistrada.correo_envio || ""}
                                onChange={(event) => setReservaRegistrada((reserva) => ({
                                    ...reserva,
                                    correo_envio: event.target.value,
                                }))}
                                placeholder="huésped@correo.com"
                                className={`${inputClase} mt-1.5`}
                            />
                        </label>
                        <a
                            href={enlaceCorreoReserva}
                            aria-disabled={!correoReservaValido}
                            onClick={(event) => {
                                if (!correoReservaValido) event.preventDefault();
                            }}
                            className={`mt-3 inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${
                                correoReservaValido
                                    ? "bg-white text-emerald-800 hover:bg-emerald-100"
                                    : "cursor-not-allowed bg-emerald-100 text-emerald-500"
                            }`}
                        >
                            <i className="bi bi-envelope mr-2"></i>
                            Preparar correo
                        </a>
                        <p className="mt-2 text-xs text-emerald-800">
                            Se abrirá un borrador en tu aplicación de correo con el resumen. Descarga el PDF y adjúntalo manualmente;
                            el sistema no envía correos ni guarda este destinatario. La reserva no es una factura ni un comprobante de pago.
                        </p>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Reservas;
