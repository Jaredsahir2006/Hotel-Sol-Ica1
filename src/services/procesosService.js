import { supabase } from "../config/supabase";
import { calcularTotalesEfectivo, calcularTotalesPorMetodo, TURNOS_CAJA } from "../utils/caja";
import { buscarHabitacionesDisponibles } from "../utils/disponibilidad";

// ============================================================
// Servicios de los procesos operativos:
//   - Check-in / Check-out
//   - Pagos y movimientos de caja
//   - Facturación (boleta / factura)
//   - Reportes
//
// Usan las tablas débiles del sistema (recepcion, habitacion,
// venta, detalle_venta, apertura_caja, concepto_caja,
// movimiento_caja, factura, boleta y auditoria).
// ============================================================

const AUD = { usuario: "WEB", pc: "PC-WEB" };
const ahora = () => new Date().toISOString();
const hoyLocal = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
};

const auditar = (fila, esNuevo = true) => ({
    ...fila,
    ...(esNuevo
        ? { usucre: AUD.usuario, pccre: AUD.pc, feccre: ahora(), estado: "1" }
        : { usumod: AUD.usuario, pcmod: AUD.pc, fecmod: ahora() }),
});

const lanzar = (error) => {
    if (!error) return;
    if (error.code === "23503")
        throw new Error("El registro está relacionado con otros datos y no se puede completar la operación.");
    if (error.code === "23505")
        throw new Error("Ya existe un registro con ese valor único. Verifica el número o documento.");
    if (error.code === "23502")
        throw new Error(`Falta un dato obligatorio en la base de datos. ${error.message}`);
    if (error.code === "42501")
        throw new Error("Sin permisos (RLS). Revisa las políticas de la tabla en Supabase.");
    throw new Error(error.message);
};

const leer = async (consulta) => {
    const { data, error } = await consulta;
    lanzar(error);
    return data || [];
};

const leerTodos = async (crearConsulta) => {
    const tamanoLote = 1000;
    const filas = [];
    let desde = 0;
    let lote;

    do {
        lote = await leer(crearConsulta().range(desde, desde + tamanoLote - 1));
        filas.push(...lote);
        desde += tamanoLote;
    } while (lote.length === tamanoLote);

    return filas;
};

const insertarFila = async (tabla, fila) => {
    const { data, error } = await supabase
        .from(tabla)
        .insert([auditar(fila)])
        .select()
        .single();
    lanzar(error);
    return data;
};

const actualizarFila = async (tabla, pk, id, fila) => {
    const { data, error } = await supabase
        .from(tabla)
        .update(auditar(fila, false))
        .eq(pk, id)
        .select()
        .single();
    lanzar(error);
    return data;
};

const nombrePersona = (p) =>
    p ? `${p.nombre || ""} ${p.ap_paterno || ""} ${p.ap_materno || ""}`.replace(/\s+/g, " ").trim() : "";

const saldoSiguienteApertura = (apertura) => {
    const coincidencia = String(apertura?.observacion || "").match(
        /Fondo para siguiente turno:\s*S\/\s*(-?\d+(?:\.\d+)?)/i
    );
    if (coincidencia) return Number(coincidencia[1]);
    return Number(apertura?.monto_declarado ?? apertura?.monto_sistema ?? 0);
};

const turnoDeObservacion = (observacion) => {
    const coincidencia = String(observacion || "").match(/Turno operativo:\s*(Mañana|Tarde|Noche)/i);
    return coincidencia
        ? TURNOS_CAJA.find((turno) => turno.toLowerCase() === coincidencia[1].toLowerCase()) || ""
        : "";
};

const numeroSiguiente = (numeros) => {
    const maximo = numeros.reduce((max, n) => {
        const valor = Number(String(n || "").replace(/\D/g, ""));
        return Number.isFinite(valor) && valor > max ? valor : max;
    }, 0);
    return String(maximo + 1).padStart(8, "0");
};

const usuarioActualId = () => {
    try {
        const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
        return usuario?.id_usuario ?? null;
    } catch {
        return null;
    }
};

// ------------------------------------------------------------
// DATOS DE APOYO
// ------------------------------------------------------------
export const listarHabitaciones = async () => {
    const [habitaciones, estados, categorias, pisos] = await Promise.all([
        leer(supabase.from("habitacion").select("*").eq("estado", "1").order("numero")),
        leer(supabase.from("estado_habitacion").select("*").eq("estado", "1")),
        leer(supabase.from("categoria_habitacion").select("*").eq("estado", "1")),
        leer(supabase.from("piso").select("*").eq("estado", "1")),
    ]);
    return habitaciones.map((h) => {
        const estado = estados.find((e) => e.id_estadohabitacion === h.id_estadohabitacion);
        const categoria = categorias.find((c) => c.id_categoria === h.id_categoria);
        const piso = pisos.find((p) => p.id_piso === h.id_piso);
        return {
            ...h,
            estado_nombre: estado?.descripcion || "",
            categoria_nombre: categoria?.descripcion || "",
            piso_nombre: piso?.descripcion || "",
        };
    });
};

export const listarClientes = async () => {
    const [clientes, personas, empresas] = await Promise.all([
        leer(supabase.from("cliente").select("*").eq("estado", "1")),
        leer(supabase.from("persona").select("*").eq("estado", "1")),
        leer(supabase.from("empresa").select("*").eq("estado", "1")),
    ]);
    return clientes.map((c) => {
        const persona = personas.find((p) => p.id_persona === c.id_persona);
        const empresa = empresas.find((e) => e.id_empresa === c.id_empresa);
        return {
            ...c,
            persona,
            empresa,
            nombre: persona ? nombrePersona(persona) : `Cliente #${c.id_cliente}`,
            documento: persona?.n_documento || empresa?.ruc || "",
        };
    });
};

export const listarCatalogosPago = async () => {
    const [cajas, usuarios, metodos, conceptos, tipos] = await Promise.all([
        leer(supabase.from("caja").select("*").eq("estado", "1").order("n_caja")),
        leer(supabase.from("usuario").select("*").eq("estado", "1").order("logeo")),
        leer(supabase.from("metodo_pago").select("*").eq("estado", "1").order("n_metodopago")),
        leer(supabase.from("concepto_caja").select("*").eq("estado", "1").order("n_concepto")),
        leer(supabase.from("tipo_movimiento_caja").select("*").eq("estado", "1")),
    ]);
    return { cajas, usuarios, metodos, conceptos, tipos };
};

// ------------------------------------------------------------
// CHECK-IN / CHECK-OUT
// ------------------------------------------------------------
export const listarRecepciones = async () => {
    const [recepciones, clientes, habitaciones] = await Promise.all([
        leer(supabase.from("recepcion").select("*").eq("estado", "1").order("id_recepcion", { ascending: false })),
        listarClientes(),
        listarHabitaciones(),
    ]);
    return recepciones.map((r) => {
        const cliente = clientes.find((c) => c.id_cliente === r.id_cliente);
        const habitacion = habitaciones.find((h) => h.id_habitacion === r.id_habitacion);
        return {
            ...r,
            cliente_nombre: cliente?.nombre || `Cliente #${r.id_cliente}`,
            cliente_documento: cliente?.documento || r.documento || "",
            habitacion_numero: habitacion?.numero || r.id_habitacion,
            habitacion_estado: habitacion?.estado_nombre || "",
        };
    });
};

export const listarRecepcionesActivas = async () => {
    const recepciones = await listarRecepciones();
    return recepciones.filter((r) => !r.f_salidac);
};

export const buscarDisponibilidadHabitaciones = async ({ f_entrada, f_salida }) => {
    const [habitaciones, recepciones] = await Promise.all([
        listarHabitaciones(),
        listarRecepciones(),
    ]);
    return buscarHabitacionesDisponibles(habitaciones, recepciones, f_entrada, f_salida);
};

export const listarCatalogosReserva = async () => {
    const [clientes, identidades, distritos, metodos] = await Promise.all([
        listarClientes(),
        leer(supabase.from("tipo_identidad").select("*").eq("estado", "1").order("abreviatura")),
        leer(supabase.from("distrito").select("*").eq("estado", "1").order("d_distrito")),
        leer(supabase.from("metodo_pago").select("*").eq("estado", "1").order("n_metodopago")),
    ]);
    return { clientes, identidades, distritos, metodos };
};

const insertarClienteReserva = async ({ tipo_cliente, persona, empresa }, clientes) => {
    const documento = String(tipo_cliente === "empresa" ? empresa.ruc : persona.n_documento).trim();
    const clienteExistente = clientes.find((cliente) => cliente.documento === documento);
    if (clienteExistente) {
        return {
            id_cliente: clienteExistente.id_cliente,
            tipo_cliente: clienteExistente.id_empresa ? "empresa" : "persona",
            documento: clienteExistente.documento,
            nombre: clienteExistente.nombre,
        };
    }

    let idEmpresa = null;
    let idPersona = null;
    if (tipo_cliente === "empresa") {
        const { data: empresaExistente, error: errorEmpresa } = await supabase
            .from("empresa")
            .select("id_empresa")
            .eq("ruc", documento)
            .eq("estado", "1")
            .maybeSingle();
        lanzar(errorEmpresa);
        const filaEmpresa = empresaExistente || await insertarFila("empresa", {
            ruc: documento,
            razon_social: empresa.razon_social.trim(),
            direccion: empresa.direccion?.trim() || null,
            telefono: empresa.telefono?.trim() || null,
        });
        idEmpresa = filaEmpresa.id_empresa;
    } else {
        const { data: personaExistente, error: errorPersona } = await supabase
            .from("persona")
            .select("id_persona")
            .eq("n_documento", documento)
            .eq("estado", "1")
            .maybeSingle();
        lanzar(errorPersona);
        const filaPersona = personaExistente || await insertarFila("persona", {
            id_tipoidentidad: Number(persona.id_tipoidentidad),
            n_documento: documento,
            nombre: persona.nombre.trim(),
            ap_paterno: persona.ap_paterno.trim(),
            ap_materno: persona.ap_materno?.trim() || null,
            email: persona.email?.trim() || null,
            celular: persona.celular?.trim() || null,
            id_distrito: Number(persona.id_distrito),
        });
        idPersona = filaPersona.id_persona;
        const clientePersona = clientes.find(
            (cliente) => String(cliente.id_persona) === String(idPersona)
        );
        if (clientePersona) {
            return {
                id_cliente: clientePersona.id_cliente,
                tipo_cliente: clientePersona.id_empresa ? "empresa" : "persona",
                documento: clientePersona.documento,
                nombre: clientePersona.nombre,
            };
        }
    }

    const cliente = await insertarFila("cliente", {
        id_persona: idPersona,
        id_empresa: idEmpresa,
    });
    return {
        id_cliente: cliente.id_cliente,
        tipo_cliente,
        documento,
        nombre: tipo_cliente === "empresa"
            ? empresa.razon_social.trim()
            : nombrePersona({
                nombre: persona.nombre,
                ap_paterno: persona.ap_paterno,
                ap_materno: persona.ap_materno,
            }),
    };
};

export const registrarReserva = async ({
    id_cliente,
    tipo_cliente,
    persona,
    empresa,
    id_habitacion,
    id_metodopago,
    f_entrada,
    f_salida,
    huespedes,
    total,
}) => {
    const habitacionId = Number(id_habitacion);
    const metodoId = Number(id_metodopago);
    const huespedesTotal = Number(huespedes);
    const totalIngresado = Number(total);
    if (!Number.isInteger(habitacionId) || habitacionId <= 0) throw new Error("Selecciona una habitación válida.");
    if (!Number.isInteger(metodoId) || metodoId <= 0) throw new Error("Selecciona un método de pago previsto.");
    if (!Number.isInteger(huespedesTotal) || huespedesTotal < 1) throw new Error("La cantidad de huéspedes no es válida.");
    if (!Number.isFinite(totalIngresado) || totalIngresado < 0) throw new Error("El total de la reserva no es válido.");
    const usuarioId = usuarioActualId();
    if (!Number.isInteger(Number(usuarioId)) || Number(usuarioId) <= 0) {
        throw new Error("No se pudo identificar al usuario que registra la reserva.");
    }
    if (!f_entrada || f_entrada < hoyLocal()) {
        throw new Error("La fecha de entrada no puede ser anterior a hoy.");
    }

    const nochesReserva = Math.round(
        (new Date(`${f_salida}T12:00:00`) - new Date(`${f_entrada}T12:00:00`)) / 86400000
    );
    if (!Number.isFinite(nochesReserva) || nochesReserva <= 0) {
        throw new Error("La fecha de salida debe ser posterior a la fecha de entrada.");
    }

    const disponibles = await buscarDisponibilidadHabitaciones({ f_entrada, f_salida });
    if (!disponibles.some((habitacion) => String(habitacion.id_habitacion) === String(habitacionId))) {
        throw new Error("La habitación ya no está disponible para esas fechas. Actualiza la búsqueda.");
    }

    const metodo = await leer(supabase
        .from("metodo_pago")
        .select("id_metodopago")
        .eq("id_metodopago", metodoId)
        .eq("estado", "1")
        .maybeSingle());
    if (!metodo) throw new Error("El método de pago previsto no existe o está inactivo.");

    let clienteId = Number(id_cliente);
    let clienteDetalle;
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
        if (!["persona", "empresa"].includes(tipo_cliente)) throw new Error("Selecciona o registra un huésped válido.");
        if (tipo_cliente === "persona") {
            if (!persona?.id_tipoidentidad || !persona?.id_distrito || !persona?.nombre?.trim()
                || !persona?.ap_paterno?.trim() || !/^\d{8,12}$/.test(String(persona?.n_documento || ""))) {
                throw new Error("Completa tipo y número de documento, nombres, apellido paterno y distrito del huésped.");
            }
        } else if (!/^\d{11}$/.test(String(empresa?.ruc || ""))
            || !empresa?.razon_social?.trim()) {
            throw new Error("Ingresa un RUC de 11 dígitos y la razón social.");
        }
        const clientes = await listarClientes();
        clienteDetalle = await insertarClienteReserva({ tipo_cliente, persona, empresa }, clientes);
        clienteId = clienteDetalle.id_cliente;
    } else {
        const clientes = await listarClientes();
        clienteDetalle = clientes.find((cliente) => String(cliente.id_cliente) === String(clienteId));
        if (!clienteDetalle) throw new Error("El huésped seleccionado no existe o está inactivo.");
    }
    if (!Number.isInteger(clienteId) || clienteId <= 0) throw new Error("No se pudo identificar al cliente de la reserva.");
    const tipoDocumentoReserva = clienteDetalle
        ? clienteDetalle.tipo_cliente === "empresa" || clienteDetalle.id_empresa ? "FACTURA" : "BOLETA"
        : tipo_cliente === "empresa" ? "FACTURA" : "BOLETA";
    const documentoReserva = clienteDetalle?.documento
        ?? (tipo_cliente === "empresa" ? empresa?.ruc : persona?.n_documento);

    const reserva = await insertarFila("recepcion", {
        id_cliente: clienteId,
        id_habitacion: habitacionId,
        id_usuario: usuarioId,
        id_metodopago: metodoId,
        f_entrada,
        f_salida,
        d_inicial: Math.round(totalIngresado * 100) / 100,
        adelanto: 0,
        d_asistente: 0,
        t_pagado: 0,
        contarjeta: 0,
        totaldeuda: Math.round(totalIngresado * 100) / 100,
        tipodocumento: tipoDocumentoReserva,
        documento: documentoReserva || null,
        f_salidac: null,
    });

    return {
        ...reserva,
        huespedes: huespedesTotal,
        cliente_nombre: clienteDetalle?.nombre || "",
        cliente_documento: documentoReserva || "",
    };
};

export const registrarCheckIn = async ({
    id_cliente,
    id_habitacion,
    id_usuario,
    id_metodopago,
    f_entrada,
    f_salida,
    d_inicial,
    adelanto,
    tipodocumento,
    documento,
}) => {
    const total = Number(d_inicial) || 0;
    const pagado = Number(adelanto) || 0;

    const recepcion = await insertarFila("recepcion", {
        id_cliente: Number(id_cliente),
        id_habitacion: Number(id_habitacion),
        id_usuario: Number(id_usuario || usuarioActualId()),
        id_metodopago: Number(id_metodopago),
        f_entrada,
        f_salida,
        d_inicial: total,
        adelanto: pagado,
        d_asistente: 0,
        t_pagado: pagado,
        contarjeta: 0,
        totaldeuda: Math.max(0, total - pagado),
        tipodocumento,
        documento: documento || null,
        f_salidac: null,
    });

    const estados = await leer(supabase.from("estado_habitacion").select("*").eq("estado", "1"));
    const ocupada = estados.find((e) => String(e.descripcion).toUpperCase().includes("OCUP"));
    if (ocupada) {
        await actualizarFila("habitacion", "id_habitacion", id_habitacion, {
            id_estadohabitacion: ocupada.id_estadohabitacion,
        });
    }

    return recepcion;
};

export const registrarCheckOut = async (id_recepcion) => {
    const { data: recepcion, error } = await supabase
        .from("recepcion")
        .select("*")
        .eq("id_recepcion", id_recepcion)
        .single();
    lanzar(error);
    if (!recepcion) throw new Error("La recepción no existe.");
    if (recepcion.f_salidac) throw new Error("Esta recepción ya tiene registrado el check-out.");
    if (String(recepcion.f_entrada || "").slice(0, 10) > hoyLocal()) {
        throw new Error("No se puede registrar el check-out antes de la fecha de entrada.");
    }

    const habitaciones = await listarHabitaciones();
    const habitacion = habitaciones.find(
        (item) => String(item.id_habitacion) === String(recepcion.id_habitacion)
    );
    if (!String(habitacion?.estado_nombre || "").toUpperCase().includes("OCUP")) {
        throw new Error("La reserva todavía no tiene check-in. Registra el ingreso antes del check-out.");
    }

    const actualizada = await actualizarFila("recepcion", "id_recepcion", id_recepcion, {
        f_salidac: ahora(),
    });

    const estados = await leer(supabase.from("estado_habitacion").select("*").eq("estado", "1"));
    const disponible = estados.find((e) => String(e.descripcion).toUpperCase().includes("DISPON"));
    if (disponible) {
        await actualizarFila("habitacion", "id_habitacion", recepcion.id_habitacion, {
            id_estadohabitacion: disponible.id_estadohabitacion,
        });
    }

    return actualizada;
};

// ------------------------------------------------------------
// CAJA Y PAGOS
// ------------------------------------------------------------
export const listarAperturas = async () => {
    const [aperturas, cajas, usuarios] = await Promise.all([
        leer(supabase.from("apertura_caja").select("*").eq("estado", "1").order("id_aperturacaja", { ascending: false })),
        leer(supabase.from("caja").select("*").eq("estado", "1")),
        leer(supabase.from("usuario").select("*").eq("estado", "1")),
    ]);
    return aperturas.map((a) => ({
        ...a,
        caja_nombre: cajas.find((c) => c.id_caja === a.id_caja)?.n_caja || `Caja #${a.id_caja}`,
        usuario_nombre: usuarios.find((u) => u.id_usuario === a.id_usuario)?.logeo || `Usuario #${a.id_usuario}`,
        turno_nombre: turnoDeObservacion(a.observacion),
        abierta: String(a.situacion).toUpperCase() === "A",
    }));
};

export const listarAperturasAbiertas = async () => {
    const aperturas = await listarAperturas();
    return aperturas.filter((a) => a.abierta);
};

export const obtenerUltimaAperturaCaja = async (id_caja) => {
    const cajaId = Number(id_caja);
    if (!Number.isInteger(cajaId) || cajaId <= 0) return null;
    const anterior = await leer(supabase
        .from("apertura_caja")
        .select("*")
        .eq("id_caja", cajaId)
        .eq("situacion", "C")
        .eq("estado", "1")
        .order("f_cierre", { ascending: false })
        .limit(1)
        .maybeSingle());
    return anterior ? { ...anterior, saldo_siguiente: saldoSiguienteApertura(anterior) } : null;
};

export const obtenerArqueoCaja = async (id_aperturacaja) => {
    const aperturaId = Number(id_aperturacaja);
    if (!Number.isInteger(aperturaId) || aperturaId <= 0) throw new Error("Selecciona un turno de caja válido.");
    const [apertura, movimientos, tipos, metodos, conceptos] = await Promise.all([
        leer(supabase.from("apertura_caja").select("*").eq("id_aperturacaja", aperturaId).single()),
        leer(supabase.from("movimiento_caja").select("*").eq("estado", "1").eq("id_aperturacaja", aperturaId)),
        leer(supabase.from("tipo_movimiento_caja").select("id_tipomovimiento, signo")),
        leer(supabase.from("metodo_pago").select("id_metodopago, n_metodopago").eq("estado", "1").order("n_metodopago")),
        leer(supabase.from("concepto_caja").select("id_concepto, n_concepto, descripcion")),
    ]);
    if (String(apertura.situacion).toUpperCase() !== "A") throw new Error("La caja seleccionada no está abierta.");
    return {
        apertura,
        metodos: calcularTotalesPorMetodo(apertura.monto_inicial, movimientos, tipos, metodos, conceptos),
        movimientos,
        tipos,
    };
};

export const abrirCaja = async ({
    id_caja,
    id_usuario,
    monto_inicial,
    observacion,
    saldo_anterior,
    turno,
}) => {
    const cajaId = Number(id_caja);
    const usuarioId = Number(id_usuario || usuarioActualId());
    const montoIngresado = Number(monto_inicial);
    if (!Number.isInteger(cajaId) || cajaId <= 0) throw new Error("Selecciona una caja válida.");
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) throw new Error("No se pudo identificar al usuario que abre la caja.");
    if (!Number.isFinite(montoIngresado) || montoIngresado < 0) throw new Error("El monto inicial debe ser un importe válido y no negativo.");
    const turnoOperativo = TURNOS_CAJA.find((opcion) => opcion === turno);
    if (!turnoOperativo) throw new Error("Selecciona un turno operativo válido.");
    const monto = Math.round(montoIngresado * 100) / 100;

    const [caja, aperturasAbiertas, todas, anterior] = await Promise.all([
        leer(supabase.from("caja").select("*").eq("id_caja", cajaId).eq("estado", "1").maybeSingle()),
        leer(supabase.from("apertura_caja").select("id_aperturacaja").eq("id_caja", cajaId).eq("situacion", "A").eq("estado", "1")),
        leerTodos(() => supabase.from("apertura_caja").select("numero_turno")),
        obtenerUltimaAperturaCaja(cajaId),
    ]);
    if (!caja) throw new Error("La caja seleccionada no existe o está inactiva.");
    if (aperturasAbiertas.length) throw new Error("Esta caja ya tiene un turno abierto.");

    const maximo = todas.reduce((max, a) => {
        const valor = Number(String(a.numero_turno || "").replace(/\D/g, ""));
        return Number.isFinite(valor) && valor > max ? valor : max;
    }, 0);
    const numero = `T${String(maximo + 1).padStart(4, "0")}`;

    const saldoAnterior = anterior ? saldoSiguienteApertura(anterior) : Number(saldo_anterior);
    const diferenciaInicial = Number.isFinite(saldoAnterior) && (anterior || saldo_anterior != null)
        ? Math.round((monto - saldoAnterior) * 100) / 100
        : null;
    const notaApertura = [
        `Turno operativo: ${turnoOperativo}.`,
        observacion?.trim(),
        diferenciaInicial !== null
            ? `Fondo anterior reportado: S/ ${saldoAnterior.toFixed(2)}. Diferencia de apertura: S/ ${diferenciaInicial.toFixed(2)}.`
            : null,
    ].filter(Boolean).join(" ");

    const apertura = await insertarFila("apertura_caja", {
        id_caja: cajaId,
        id_usuario: usuarioId,
        numero_turno: numero,
        f_apertura: ahora(),
        f_cierre: null,
        monto_inicial: monto,
        total_ingresos: 0,
        total_egresos: 0,
        monto_sistema: monto,
        monto_declarado: 0,
        diferencia: 0,
        situacion: "A",
        observacion: notaApertura || "Apertura de caja desde el módulo de pagos",
    });

    await actualizarFila("caja", "id_caja", cajaId, { aperturada: "1" });
    return { ...apertura, turno_nombre: turnoOperativo };
};

export const cerrarCaja = async (id_aperturacaja, {
    monto_declarado,
    observacion,
    conteo_metodos = [],
    fondo_siguiente = 0,
} = {}) => {
    const aperturaId = Number(id_aperturacaja);
    const declaradoIngresado = Number(monto_declarado);
    const usuarioCierreId = usuarioActualId();
    if (!Number.isInteger(aperturaId) || aperturaId <= 0) throw new Error("Selecciona un turno de caja válido.");
    if (monto_declarado == null || monto_declarado === "" || !Number.isFinite(declaradoIngresado) || declaradoIngresado < 0) {
        throw new Error("El monto declarado debe ser un importe válido y no negativo.");
    }
    const declarado = Math.round(declaradoIngresado * 100) / 100;
    const fondoSiguienteIngresado = Number(fondo_siguiente);
    if (!Number.isFinite(fondoSiguienteIngresado) || fondoSiguienteIngresado < 0) {
        throw new Error("El fondo para el siguiente turno debe ser un importe válido y no negativo.");
    }
    const fondoSiguiente = Math.round(fondoSiguienteIngresado * 100) / 100;
    if (fondoSiguiente > declarado) {
        throw new Error("El fondo para el siguiente turno no puede superar el efectivo contado.");
    }
    if (!Number.isInteger(Number(usuarioCierreId)) || Number(usuarioCierreId) <= 0) {
        throw new Error("No se pudo identificar al usuario que cierra la caja.");
    }

    const { data: apertura, error } = await supabase
        .from("apertura_caja")
        .select("*")
        .eq("id_aperturacaja", aperturaId)
        .maybeSingle();
    lanzar(error);
    if (!apertura) throw new Error("La apertura de caja no existe.");
    if (String(apertura.situacion).toUpperCase() === "C") throw new Error("Esta caja ya está cerrada.");

    const [movimientos, tipos, metodos, conceptos] = await Promise.all([
        leer(supabase.from("movimiento_caja").select("*").eq("estado", "1").eq("id_aperturacaja", aperturaId)),
        leer(supabase.from("tipo_movimiento_caja").select("id_tipomovimiento, signo")),
        leer(supabase.from("metodo_pago").select("id_metodopago, n_metodopago").eq("estado", "1")),
        leer(supabase.from("concepto_caja").select("id_concepto, n_concepto, descripcion")),
    ]);
    const { ingresos, egresos, sistema } = calcularTotalesEfectivo(
        apertura.monto_inicial,
        movimientos,
        tipos
    );
    const resumenMetodos = calcularTotalesPorMetodo(apertura.monto_inicial, movimientos, tipos, metodos, conceptos);
    const resumenPorId = new Map(resumenMetodos.map((item) => [String(item.clave), item]));
    if (conteo_metodos.length && conteo_metodos.length !== resumenMetodos.length) {
        throw new Error("El arqueo debe incluir todos los métodos de pago disponibles.");
    }
    const clavesConteo = conteo_metodos.map((item) =>
        String(item.clave || item.id_metodopago || "efectivo")
    );
    if (new Set(clavesConteo).size !== clavesConteo.length) {
        throw new Error("Cada método de pago debe aparecer una sola vez en el arqueo.");
    }
    const conteo = conteo_metodos.map((item) => {
        const contado = Number(item.contado);
        if (!Number.isFinite(contado) || contado < 0) {
            throw new Error("Todos los montos contados deben ser válidos y no negativos.");
        }
        const metodoId = String(item.clave || item.id_metodopago || "efectivo");
        const resumen = resumenPorId.get(metodoId);
        if (!resumen) throw new Error("El método de pago del arqueo no es válido.");
        return {
            metodo: resumen?.nombre || String(item.metodo || "Método no identificado"),
            esperado: resumen?.esperado || 0,
            contado: Math.round(contado * 100) / 100,
        };
    });
    const efectivoContado = conteo.find((item) => /efectivo/i.test(item.metodo))
        || (conteo_metodos.some((item) => !item.id_metodopago) ? conteo.find((item) => item.metodo === "Efectivo") : null);
    if (efectivoContado && efectivoContado.contado !== declarado) {
        throw new Error("El efectivo declarado debe coincidir con el efectivo contado en el arqueo.");
    }
    const detalleArqueo = [
        ...conteo.map((item) =>
            `${item.metodo}: esperado S/ ${item.esperado.toFixed(2)}, contado S/ ${item.contado.toFixed(2)}`
        ),
        `Fondo para siguiente turno: S/ ${fondoSiguiente.toFixed(2)}.`,
        `Retiro a caja fuerte: S/ ${(declarado - fondoSiguiente).toFixed(2)}.`,
    ].join(" | ");
    const observacionCierre = [
        apertura.observacion ? `Apertura: ${apertura.observacion}` : null,
        observacion?.trim() ? `Cierre: ${observacion.trim()}` : "Cierre de caja",
        detalleArqueo,
    ].filter(Boolean).join(" — ");

    const { data: cerrada, error: errorCierre } = await supabase
        .from("apertura_caja")
        .update(auditar({
            id_usuariocierre: usuarioCierreId,
            f_cierre: ahora(),
            total_ingresos: ingresos,
            total_egresos: egresos,
            monto_sistema: sistema,
            monto_declarado: declarado,
            diferencia: Math.round((declarado - sistema) * 100) / 100,
            situacion: "C",
            observacion: observacionCierre || apertura.observacion || "Cierre de caja",
        }, false))
        .eq("id_aperturacaja", aperturaId)
        .eq("situacion", "A")
        .select()
        .single();
    lanzar(errorCierre);

    await actualizarFila("caja", "id_caja", apertura.id_caja, { aperturada: "0" });
    return { ...cerrada, arqueo: conteo, fondo_siguiente: fondoSiguiente };
};

export const registrarPago = async ({
    id_aperturacaja,
    id_recepcion,
    id_metodopago,
    id_concepto,
    id_tipomovimiento,
    monto,
    numero_operacion,
    documento,
    descripcion,
}) => {
    const valorIngresado = Number(monto);
    if (!Number.isFinite(valorIngresado) || valorIngresado <= 0) throw new Error("El monto del pago debe ser un importe válido mayor a cero.");
    const valor = Math.round(valorIngresado * 100) / 100;
    if (valor <= 0) throw new Error("El monto del pago debe ser mayor a un céntimo.");

    const [concepto, tipo, apertura] = await Promise.all([
        leer(supabase.from("concepto_caja").select("*").eq("id_concepto", id_concepto).single()),
        leer(supabase.from("tipo_movimiento_caja").select("*").eq("id_tipomovimiento", id_tipomovimiento).single()),
        leer(supabase.from("apertura_caja").select("*").eq("id_aperturacaja", id_aperturacaja).single()),
    ]);

    if (!apertura || String(apertura.situacion).toUpperCase() !== "A")
        throw new Error("La caja seleccionada no está abierta.");
    if (!tipo) throw new Error("El tipo de movimiento no existe.");
    if (String(concepto.id_tipomovimiento) !== String(id_tipomovimiento)) {
        throw new Error("El tipo de movimiento no corresponde al concepto seleccionado.");
    }
    if (!["+", "-"].includes(tipo.signo)) {
        throw new Error("El tipo de movimiento no tiene un signo válido.");
    }
    const afectaEfectivo = String(concepto.afecta_efectivo || "").toUpperCase();
    if (!["S", "N"].includes(afectaEfectivo)) {
        throw new Error("El concepto no indica si el movimiento afecta al efectivo.");
    }
    const usuarioId = usuarioActualId();
    if (!Number.isInteger(Number(usuarioId)) || Number(usuarioId) <= 0) {
        throw new Error("No se pudo identificar al usuario que registra el movimiento.");
    }

    const movimiento = await insertarFila("movimiento_caja", {
        id_aperturacaja: Number(id_aperturacaja),
        id_tipomovimiento: Number(id_tipomovimiento),
        id_concepto: Number(id_concepto),
        id_metodopago: Number(id_metodopago),
        id_usuario: usuarioId,
        id_recepcion: id_recepcion ? Number(id_recepcion) : null,
        id_venta: null,
        numero_operacion: numero_operacion || `OP${Date.now()}`,
        documento: documento || null,
        descripcion: descripcion || concepto?.n_concepto || "Pago registrado",
        monto: valor,
        afecta_efectivo: afectaEfectivo,
        f_movimiento: ahora(),
        ip: "127.0.0.1",
        terminal: "WEB",
    });

    if (afectaEfectivo === "S") {
        const ingresos = Number(apertura.total_ingresos) || 0;
        const egresos = Number(apertura.total_egresos) || 0;
        const nuevosIngresos = Math.round((tipo.signo === "-" ? ingresos : ingresos + valor) * 100) / 100;
        const nuevosEgresos = Math.round((tipo.signo === "-" ? egresos + valor : egresos) * 100) / 100;

        await actualizarFila("apertura_caja", "id_aperturacaja", id_aperturacaja, {
            total_ingresos: nuevosIngresos,
            total_egresos: nuevosEgresos,
            monto_sistema: Math.round((Number(apertura.monto_inicial) + nuevosIngresos - nuevosEgresos) * 100) / 100,
        });
    }

    if (id_recepcion) {
        const { data: recepcion } = await supabase
            .from("recepcion")
            .select("*")
            .eq("id_recepcion", id_recepcion)
            .single();

        if (recepcion) {
            const pagado = (Number(recepcion.t_pagado) || 0) + valor;
            await actualizarFila("recepcion", "id_recepcion", id_recepcion, {
                t_pagado: pagado,
                totaldeuda: Math.max(0, (Number(recepcion.d_inicial) || 0) - pagado),
            });
        }
    }

    return movimiento;
};

export const listarPagos = async () => {
    const [movimientos, conceptos, tipos, metodos, usuarios, recepciones] = await Promise.all([
        leerTodos(() =>
            supabase
                .from("movimiento_caja")
                .select("*")
                .eq("estado", "1")
                .order("id_movimientocaja", { ascending: false })
        ),
        leer(supabase.from("concepto_caja").select("*").eq("estado", "1")),
        leer(supabase.from("tipo_movimiento_caja").select("*").eq("estado", "1")),
        leer(supabase.from("metodo_pago").select("*").eq("estado", "1")),
        leer(supabase.from("usuario").select("*").eq("estado", "1")),
        leer(supabase.from("recepcion").select("*").eq("estado", "1")),
    ]);

    return movimientos.map((m) => ({
        ...m,
        concepto_nombre: conceptos.find((c) => c.id_concepto === m.id_concepto)?.n_concepto || "-",
        tipo_nombre: tipos.find((t) => t.id_tipomovimiento === m.id_tipomovimiento)?.n_tipomovimiento || "-",
        tipo_signo: tipos.find((t) => t.id_tipomovimiento === m.id_tipomovimiento)?.signo || "+",
        metodo_nombre: metodos.find((x) => x.id_metodopago === m.id_metodopago)?.n_metodopago || "-",
        usuario_nombre: usuarios.find((u) => u.id_usuario === m.id_usuario)?.logeo || "-",
        recepcion_numero: m.id_recepcion
            ? recepciones.find((r) => r.id_recepcion === m.id_recepcion)?.id_recepcion
            : null,
    }));
};

// ------------------------------------------------------------
// FACTURACIÓN
// ------------------------------------------------------------
export const emitirComprobante = async ({ id_recepcion, tipo, serie }) => {
    const esFactura = String(tipo).toUpperCase() === "FACTURA";
    const tabla = esFactura ? "factura" : "boleta";
    const pk = esFactura ? "id_factura" : "id_boleta";
    const prefijo = esFactura ? "F" : "B";

    const existentes = await leer(
        supabase.from(tabla).select("*").eq("estado", "1").eq("id_recepcion", id_recepcion)
    );
    if (existentes.length > 0) {
        return { comprobante: existentes[0], yaExistia: true, tipo: esFactura ? "FACTURA" : "BOLETA" };
    }

    const cajasAbiertas = await leer(
        supabase.from("apertura_caja").select("id_aperturacaja").eq("situacion", "A").eq("estado", "1")
    );
    if (cajasAbiertas.length === 0) {
        throw new Error("Abre una caja antes de emitir un nuevo comprobante.");
    }

    const numeros = await leer(supabase.from(tabla).select("numero"));
    const numero = numeroSiguiente(numeros.map((n) => n.numero));
    const serieFinal = (serie || `${prefijo}001`).trim().toUpperCase();

    const comprobante = await insertarFila(tabla, {
        id_recepcion: Number(id_recepcion),
        f_emision: ahora(),
        numero,
        serie: serieFinal,
    });

    return { comprobante, yaExistia: false, tipo: esFactura ? "FACTURA" : "BOLETA", pk };
};

export const listarComprobantes = async () => {
    const [facturas, boletas, recepciones, clientes] = await Promise.all([
        leer(supabase.from("factura").select("*").eq("estado", "1").order("id_factura", { ascending: false })),
        leer(supabase.from("boleta").select("*").eq("estado", "1").order("id_boleta", { ascending: false })),
        leer(supabase.from("recepcion").select("*").eq("estado", "1")),
        listarClientes(),
    ]);

    const armar = (filas, tipo, pk) =>
        filas.map((f) => {
            const recepcion = recepciones.find((r) => r.id_recepcion === f.id_recepcion);
            const cliente = recepcion ? clientes.find((c) => c.id_cliente === recepcion.id_cliente) : null;
            return {
                ...f,
                pk,
                tipo,
                recepcion,
                cliente_nombre: cliente?.nombre || "-",
                cliente_documento: cliente?.documento || recepcion?.documento || "-",
                total: recepcion?.d_inicial || 0,
            };
        });

    return [
        ...armar(facturas, "FACTURA", "id_factura"),
        ...armar(boletas, "BOLETA", "id_boleta"),
    ].sort((a, b) => String(b.f_emision).localeCompare(String(a.f_emision)));
};

export const listarRecepcionesFacturables = async () => {
    const recepciones = await listarRecepciones();
    return recepciones.filter((r) => r.f_salidac || r.totaldeuda <= 0);
};

// ------------------------------------------------------------
// REPORTES
// ------------------------------------------------------------
export const obtenerReporte = async ({ desde, hasta } = {}) => {
    const filtrar = (consulta, columna) => {
        let c = consulta;
        if (desde) c = c.gte(columna, desde);
        if (hasta) c = c.lte(columna, `${hasta}T23:59:59`);
        return c;
    };

    const [
        ventas,
        detalles,
        productos,
        facturas,
        boletas,
        movimientos,
        tipos,
        aperturas,
        auditoria,
        recepciones,
        habitaciones,
        estados,
    ] = await Promise.all([
        leer(filtrar(supabase.from("venta").select("*").eq("estado", "1"), "feccre")),
        leer(filtrar(supabase.from("detalle_venta").select("*").eq("estado", "1"), "feccre")),
        leer(supabase.from("producto").select("*").eq("estado", "1")),
        leer(filtrar(supabase.from("factura").select("*").eq("estado", "1"), "f_emision")),
        leer(filtrar(supabase.from("boleta").select("*").eq("estado", "1"), "f_emision")),
        leer(filtrar(supabase.from("movimiento_caja").select("*").eq("estado", "1"), "f_movimiento")),
        leer(supabase.from("tipo_movimiento_caja").select("*").eq("estado", "1")),
        leer(filtrar(supabase.from("apertura_caja").select("*").eq("estado", "1"), "f_apertura")),
        leer(filtrar(supabase.from("auditoria").select("*").eq("estado", "1"), "f_evento")),
        leer(supabase.from("recepcion").select("*").eq("estado", "1")),
        leer(supabase.from("habitacion").select("*").eq("estado", "1")),
        leer(supabase.from("estado_habitacion").select("*").eq("estado", "1")),
    ]);

    const totalVentas = ventas.reduce((s, v) => s + (Number(v.total) || 0), 0);

    let ingresos = 0;
    let egresos = 0;
    for (const m of movimientos) {
        const tipo = tipos.find((t) => t.id_tipomovimiento === m.id_tipomovimiento);
        if (tipo?.signo === "-") egresos += Number(m.monto) || 0;
        else ingresos += Number(m.monto) || 0;
    }

    const porProducto = new Map();
    for (const d of detalles) {
        const producto = productos.find((p) => p.id_producto === d.id_producto);
        const clave = d.id_producto;
        const actual = porProducto.get(clave) || {
            id_producto: clave,
            nombre: producto?.n_producto || `Producto #${clave}`,
            cantidad: 0,
            total: 0,
        };
        actual.cantidad += Number(d.cantidad) || 0;
        actual.total += Number(d.sub_total) || 0;
        porProducto.set(clave, actual);
    }

    const totalComprobantes = facturas.length + boletas.length;
    const totalFacturado = [...facturas, ...boletas].reduce((s, c) => {
        const r = recepciones.find((x) => x.id_recepcion === c.id_recepcion);
        return s + (Number(r?.d_inicial) || 0);
    }, 0);

    const ocupadas = recepciones.filter((r) => !r.f_salidac).length;
    const disponibles = habitaciones.filter((h) => {
        const estado = estados.find((e) => e.id_estadohabitacion === h.id_estadohabitacion);
        return String(estado?.descripcion || "").toUpperCase().includes("DISPON");
    }).length;

    return {
        ventas: { cantidad: ventas.length, total: totalVentas },
        caja: { ingresos, egresos, neto: ingresos - egresos, movimientos: movimientos.length },
        comprobantes: {
            facturas: facturas.length,
            boletas: boletas.length,
            total: totalComprobantes,
            totalFacturado,
        },
        ocupacion: { ocupadas, disponibles, total: habitaciones.length },
        auditoria: auditoria.length,
        aperturas: aperturas.length,
        topProductos: [...porProducto.values()].sort((a, b) => b.total - a.total).slice(0, 10),
        ultimosMovimientos: movimientos
            .slice()
            .sort((a, b) => String(b.f_movimiento).localeCompare(String(a.f_movimiento)))
            .slice(0, 10),
        ultimosEventos: auditoria
            .slice()
            .sort((a, b) => String(b.f_evento).localeCompare(String(a.f_evento)))
            .slice(0, 10),
    };
};
