import { supabase } from "../config/supabase";
import { DATASETS_PERSONALIZADOS, PERIODOS, REPORTES as REPORTES_CONFIG } from "../config/reportes";
import {
    agregarValores,
    clavePeriodo,
    COLORES_REPORTE,
    dentroDeRango,
    etiquetaPeriodo,
    fechaDia,
    generarPeriodos,
    nombreBase,
    nochesEntre,
    nochesSolapadas,
    normalizarTexto,
    porcentaje,
    rangoDias,
    redondear,
    sumarDias,
} from "../utils/reportes";

// ============================================================
// SERVICIO DE REPORTES
// Todas las cifras se leen desde Supabase. No hay datos fijos:
// los filtros se aplican en las consultas y/o sobre las filas
// reales antes de calcular los indicadores, tablas y gráficos.
// ============================================================

const TAMANO_LOTE = 1000;
const TTL_CATALOGO = 60 * 1000;
const TABLAS_AUDITORIA_RESPALDO = [
    "APERTURA_CAJA",
    "BOLETA",
    "CAJA",
    "CLIENTE",
    "EMPLEADO",
    "EMPRESA",
    "FACTURA",
    "HABITACION",
    "MOVIMIENTO_CAJA",
    "PERSONA",
    "PRODUCTO",
    "RECEPCION",
    "USUARIO",
    "VENTA",
];

const solesTexto = (valor) =>
    `S/ ${Number(valor || 0).toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const hoyLocal = () => {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
        fecha.getDate()
    ).padStart(2, "0")}`;
};

const inicioAnio = () => `${new Date().getFullYear()}-01-01`;

const nombrePersona = (persona) =>
    persona
        ? `${persona.nombre || ""} ${persona.ap_paterno || ""} ${persona.ap_materno || ""}`
              .replace(/\s+/g, " ")
              .trim()
        : "";

const numero = (valor) => {
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : 0;
};

const leer = async (consulta) => {
    const { data, error } = await consulta;
    if (error) {
        if (error.code === "42501") {
            throw new Error("Sin permisos (RLS) para consultar los datos del reporte.");
        }
        throw new Error(error.message);
    }
    return data || [];
};

const leerTodos = async (crearConsulta) => {
    const filas = [];
    let desde = 0;

    for (;;) {
        const lote = await leer(crearConsulta().range(desde, desde + TAMANO_LOTE - 1));
        filas.push(...lote);
        if (lote.length < TAMANO_LOTE) break;
        desde += TAMANO_LOTE;
    }

    return filas;
};

const conRango = (consulta, columna, filtros) => {
    let resultado = consulta;
    if (filtros.desde) resultado = resultado.gte(columna, filtros.desde);
    if (filtros.hasta) resultado = resultado.lte(columna, `${filtros.hasta}T23:59:59.999`);
    return resultado;
};

const sinDuplicados = (valores) => [...new Set(valores.filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "es")
);

// ------------------------------------------------------------
// CATÁLOGOS (personas, empresas, habitaciones, productos, etc.)
// Se mantienen en memoria 60 segundos para no repetir consultas.
// ------------------------------------------------------------
let cacheCatalogo = null;
let cacheCatalogoFecha = 0;

export const invalidarCatalogosReportes = () => {
    cacheCatalogo = null;
    cacheCatalogoFecha = 0;
};

export const cargarCatalogosReportes = async () => {
    if (cacheCatalogo && Date.now() - cacheCatalogoFecha < TTL_CATALOGO) {
        return cacheCatalogo;
    }

    const [
        personas,
        empresas,
        clientes,
        usuarios,
        habitaciones,
        categoriasHabitacion,
        estadosHabitacion,
        pisos,
        categoriasProducto,
        productos,
        cajas,
        metodosPago,
        conceptosCaja,
        tiposMovimiento,
        auditoriaTablas,
    ] = await Promise.all([
        leerTodos(() => supabase.from("persona").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("empresa").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("cliente").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("usuario").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("habitacion").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("categoria_habitacion").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("estado_habitacion").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("piso").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("categoria_producto").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("producto").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("caja").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("metodo_pago").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("concepto_caja").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("tipo_movimiento_caja").select("*").eq("estado", "1")),
        leerTodos(() => supabase.from("auditoria").select("n_tabla").eq("estado", "1")),
    ]);

    const empresasNormalizadas = empresas.map((empresa) => ({
        id: empresa.id_empresa,
        nombre: empresa.razon_social || `Empresa #${empresa.id_empresa}`,
        ruc: empresa.ruc || "",
    }));

    const personasPorId = new Map(personas.map((persona) => [String(persona.id_persona), persona]));
    const empresasPorId = new Map(empresasNormalizadas.map((empresa) => [String(empresa.id), empresa]));

    const clientesNormalizados = clientes.map((cliente) => {
        const persona = personasPorId.get(String(cliente.id_persona));
        const empresa = empresasPorId.get(String(cliente.id_empresa));
        const nombre = persona
            ? nombrePersona(persona)
            : empresa?.nombre || `Cliente #${cliente.id_cliente}`;
        const documento = persona?.n_documento || empresa?.ruc || "";
        return {
            id: cliente.id_cliente,
            nombre,
            etiqueta: `${nombre}${documento ? ` · ${documento}` : ""}`,
            documento,
            idPersona: cliente.id_persona,
            empresaId: cliente.id_empresa || null,
            empresaNombre: empresa?.nombre || "",
        };
    });

    const categoriasHabitacionNormalizadas = categoriasHabitacion
        .map((categoria) => ({ id: categoria.id_categoria, nombre: categoria.descripcion || "" }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const estadosHabitacionNormalizados = estadosHabitacion
        .map((estado) => ({ id: estado.id_estadohabitacion, nombre: estado.descripcion || "" }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const categoriasPorId = new Map(
        categoriasHabitacionNormalizadas.map((categoria) => [String(categoria.id), categoria])
    );
    const estadosPorId = new Map(
        estadosHabitacionNormalizados.map((estado) => [String(estado.id), estado])
    );
    const pisosPorId = new Map(pisos.map((piso) => [String(piso.id_piso), piso.descripcion || ""]));

    const habitacionesNormalizadas = habitaciones
        .map((habitacion) => ({
            id: habitacion.id_habitacion,
            numero: habitacion.numero || String(habitacion.id_habitacion),
            categoriaId: habitacion.id_categoria,
            categoriaNombre: categoriasPorId.get(String(habitacion.id_categoria))?.nombre || "Sin categoría",
            estadoId: habitacion.id_estadohabitacion,
            estadoNombre: estadosPorId.get(String(habitacion.id_estadohabitacion))?.nombre || "Sin estado",
            pisoNombre: pisosPorId.get(String(habitacion.id_piso)) || "",
            precio: numero(habitacion.precio),
            detalle: habitacion.detalle || "",
        }))
        .sort((a, b) => String(a.numero).localeCompare(String(b.numero), "es", { numeric: true }));

    const categoriasProductoNormalizadas = categoriasProducto
        .map((categoria) => ({
            id: categoria.id_categoriaproducto,
            nombre: categoria.n_categoriaproducto || "",
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const categoriasProductoPorId = new Map(
        categoriasProductoNormalizadas.map((categoria) => [String(categoria.id), categoria])
    );

    const productosNormalizados = productos
        .map((producto) => ({
            id: producto.id_producto,
            nombre: producto.n_producto || `Producto #${producto.id_producto}`,
            nombreBase: nombreBase(producto.n_producto),
            categoriaId: producto.id_categoriaproducto,
            categoriaNombre:
                categoriasProductoPorId.get(String(producto.id_categoriaproducto))?.nombre ||
                "Sin categoría",
            precio: numero(producto.precio),
            marca: producto.marca || "",
        }))
        .sort((a, b) => a.nombreBase.localeCompare(b.nombreBase, "es"));

    const conceptosNormalizados = conceptosCaja.map((concepto) => ({
        id: concepto.id_concepto,
        nombre: nombreBase(concepto.n_concepto),
        nombreCompleto: concepto.n_concepto || "",
        tipoId: concepto.id_tipomovimiento,
        afectaEfectivo: concepto.afecta_efectivo || "",
    }));

    const tiposNormalizados = tiposMovimiento.map((tipo) => ({
        id: tipo.id_tipomovimiento,
        nombre: tipo.n_tipomovimiento || "",
        signo: tipo.signo || "+",
    }));

    const usuariosNormalizados = usuarios
        .map((usuario) => ({
            id: usuario.id_usuario,
            nombre: usuario.logeo || `Usuario #${usuario.id_usuario}`,
            tipoUsuarioId: usuario.id_tipousuario,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    const tablasAuditoria = sinDuplicados([
        ...auditoriaTablas.map((fila) => fila.n_tabla),
        ...TABLAS_AUDITORIA_RESPALDO,
    ]);

    cacheCatalogo = {
        personas,
        empresas: empresasNormalizadas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
        clientes: clientesNormalizados.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
        usuarios: usuariosNormalizados,
        habitaciones: habitacionesNormalizadas,
        categoriasHabitacion: categoriasHabitacionNormalizadas,
        estadosHabitacion: estadosHabitacionNormalizados,
        categoriasProducto: categoriasProductoNormalizadas,
        productos: productosNormalizados,
        cajas: cajas
            .map((caja) => ({ id: caja.id_caja, nombre: caja.n_caja || `Caja #${caja.id_caja}` }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
        metodosPago: metodosPago
            .map((metodo) => ({
                id: metodo.id_metodopago,
                nombre: metodo.n_metodopago || `Método #${metodo.id_metodopago}`,
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
        conceptosCaja: conceptosNormalizados,
        conceptosBase: sinDuplicados(conceptosNormalizados.map((concepto) => concepto.nombre)).map(
            (nombre) => ({ id: nombre, nombre })
        ),
        tiposMovimiento: tiposNormalizados,
        tablasAuditoria: tablasAuditoria.map((tabla) => ({ id: tabla, nombre: tabla })),
        actualizadoEn: new Date().toISOString(),
    };
    cacheCatalogoFecha = Date.now();
    return cacheCatalogo;
};

// ------------------------------------------------------------
// CONSULTAS BASE
// ------------------------------------------------------------
const cargarRecepciones = () =>
    leerTodos(() =>
        supabase.from("recepcion").select("*").eq("estado", "1").order("id_recepcion", {
            ascending: false,
        })
    );

const cargarVentas = (filtros) =>
    leerTodos(() =>
        conRango(supabase.from("venta").select("*").eq("estado", "1"), "feccre", filtros).order(
            "id_venta",
            { ascending: false }
        )
    );

const cargarDetallesVenta = () =>
    leerTodos(() => supabase.from("detalle_venta").select("*").eq("estado", "1"));

const cargarMovimientos = (filtros) =>
    leerTodos(() =>
        conRango(
            supabase.from("movimiento_caja").select("*").eq("estado", "1"),
            "f_movimiento",
            filtros
        ).order("id_movimientocaja", { ascending: false })
    );

const cargarAperturas = () =>
    leerTodos(() => supabase.from("apertura_caja").select("*").eq("estado", "1"));

const cargarFacturas = (filtros) =>
    leerTodos(() =>
        conRango(supabase.from("factura").select("*").eq("estado", "1"), "f_emision", filtros)
    );

const cargarBoletas = (filtros) =>
    leerTodos(() =>
        conRango(supabase.from("boleta").select("*").eq("estado", "1"), "f_emision", filtros)
    );

const cargarAuditoria = (filtros) =>
    leerTodos(() =>
        conRango(supabase.from("auditoria").select("*").eq("estado", "1"), "f_evento", filtros).order(
            "id_auditoria",
            { ascending: false }
        )
    );

const cargarComprobantes = async (filtros) => {
    const [facturas, boletas] = await Promise.all([
        cargarFacturas(filtros),
        cargarBoletas(filtros),
    ]);
    return [
        ...facturas.map((fila) => ({ ...fila, tipo: "FACTURA" })),
        ...boletas.map((fila) => ({ ...fila, tipo: "BOLETA" })),
    ].sort((a, b) => String(b.f_emision).localeCompare(String(a.f_emision)));
};

// ------------------------------------------------------------
// FILTROS Y FILAS DERIVADAS
// ------------------------------------------------------------
const normalizarFiltros = (filtros = {}) => {
    const limpiar = (valor) => (valor == null ? "" : String(valor).trim());
    const desde = limpiar(filtros.desde) || inicioAnio();
    const hasta = limpiar(filtros.hasta) || hoyLocal();
    if (desde > hasta) {
        throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
    }
    return {
        desde,
        hasta,
        periodo: ["dia", "semana", "mes", "anio"].includes(filtros.periodo)
            ? filtros.periodo
            : "mes",
        cliente: limpiar(filtros.cliente),
        empresa: limpiar(filtros.empresa),
        usuario: limpiar(filtros.usuario),
        categoriaHabitacion: limpiar(filtros.categoriaHabitacion),
        estadoHabitacion: limpiar(filtros.estadoHabitacion),
        categoriaProducto: limpiar(filtros.categoriaProducto),
        producto: limpiar(filtros.producto),
        estadoReserva: limpiar(filtros.estadoReserva),
        tipoComprobante: limpiar(filtros.tipoComprobante).toUpperCase(),
        tipoMovimiento: limpiar(filtros.tipoMovimiento),
        concepto: limpiar(filtros.concepto),
        caja: limpiar(filtros.caja),
        metodoPago: limpiar(filtros.metodoPago),
        afectaEfectivo: limpiar(filtros.afectaEfectivo).toUpperCase(),
        accion: limpiar(filtros.accion).toUpperCase(),
        tablaAuditada: limpiar(filtros.tablaAuditada).toUpperCase(),
        agrupacionClientes: filtros.agrupacionClientes === "empresa" ? "empresa" : "cliente",
        dataset: DATASETS_PERSONALIZADOS[filtros.dataset] ? filtros.dataset : "reservas",
        metrica: limpiar(filtros.metrica),
        agregacion: limpiar(filtros.agregacion) || "suma",
        agruparPor: limpiar(filtros.agruparPor) || "periodo",
        tipoGrafico: ["barras", "barras-horizontales", "lineas", "donut"].includes(
            filtros.tipoGrafico
        )
            ? filtros.tipoGrafico
            : "barras",
        columnas: Array.isArray(filtros.columnas) ? filtros.columnas : [],
    };
};

const estadoReserva = (recepcion) => {
    if (recepcion.f_salidac) return { clave: "finalizada", nombre: "Finalizada" };
    if (fechaDia(recepcion.f_entrada) > hoyLocal()) return { clave: "proxima", nombre: "Próxima" };
    return { clave: "en_curso", nombre: "En curso" };
};

const clienteDeRecepcion = (recepcion, catalogo) =>
    catalogo.clientes.find((cliente) => String(cliente.id) === String(recepcion.id_cliente)) || null;

const habitacionDeRecepcion = (recepcion, catalogo) =>
    catalogo.habitaciones.find(
        (habitacion) => String(habitacion.id) === String(recepcion.id_habitacion)
    ) || null;

const filtrarRecepciones = (recepciones, filtros, catalogo, opciones = {}) =>
    recepciones.filter((recepcion) => {
        const cliente = clienteDeRecepcion(recepcion, catalogo);
        const habitacion = habitacionDeRecepcion(recepcion, catalogo);

        if (opciones.solapamiento) {
            const noches = nochesSolapadas(
                recepcion.f_entrada,
                recepcion.f_salida,
                filtros.desde,
                filtros.hasta
            );
            if (noches <= 0) return false;
        } else if (!dentroDeRango(recepcion.f_entrada, filtros.desde, filtros.hasta)) {
            return false;
        }

        if (filtros.cliente && String(recepcion.id_cliente) !== String(filtros.cliente)) return false;
        if (filtros.empresa && String(cliente?.empresaId || "") !== String(filtros.empresa)) return false;
        if (filtros.usuario && String(recepcion.id_usuario) !== String(filtros.usuario)) return false;
        if (
            filtros.categoriaHabitacion &&
            String(habitacion?.categoriaId || "") !== String(filtros.categoriaHabitacion)
        ) {
            return false;
        }
        if (filtros.estadoReserva && estadoReserva(recepcion).clave !== filtros.estadoReserva) {
            return false;
        }
        if (
            filtros.tipoComprobante &&
            String(recepcion.tipodocumento || "").trim().toUpperCase() !== filtros.tipoComprobante
        ) {
            return false;
        }
        return true;
    });

const filaRecepcion = (recepcion, catalogo) => {
    const cliente = clienteDeRecepcion(recepcion, catalogo);
    const habitacion = habitacionDeRecepcion(recepcion, catalogo);
    const noches = nochesEntre(recepcion.f_entrada, recepcion.f_salida);
    const total = numero(recepcion.d_inicial);
    const pagado = numero(recepcion.t_pagado);
    const saldo = Math.max(0, numero(recepcion.totaldeuda) || total - pagado);
    const estado = estadoReserva(recepcion);
    return {
        id: recepcion.id_recepcion,
        codigo: `#${recepcion.id_recepcion}`,
        clienteId: recepcion.id_cliente,
        cliente: cliente?.nombre || `Cliente #${recepcion.id_cliente}`,
        documento: cliente?.documento || recepcion.documento || "-",
        empresaId: cliente?.empresaId || null,
        empresa: cliente?.empresaNombre || "-",
        habitacionId: recepcion.id_habitacion,
        habitacion: habitacion?.numero || String(recepcion.id_habitacion),
        categoriaId: habitacion?.categoriaId || null,
        categoria: habitacion?.categoriaNombre || "Sin categoría",
        entrada: fechaDia(recepcion.f_entrada),
        salida: fechaDia(recepcion.f_salida),
        noches,
        total,
        pagado,
        saldo,
        adelanto: numero(recepcion.adelanto),
        estado: estado.nombre,
        estadoClave: estado.clave,
        responsableId: recepcion.id_usuario,
        responsable:
            catalogo.usuarios.find((usuario) => String(usuario.id) === String(recepcion.id_usuario))
                ?.nombre || `Usuario #${recepcion.id_usuario}`,
        tipo: String(recepcion.tipodocumento || "BOLETA").trim().toUpperCase(),
        documentoComprobante: recepcion.documento || "-",
        f_salidac: recepcion.f_salidac,
    };
};

const kpi = (id, etiqueta, valor, formato, detalle, icono, color) => ({
    id,
    etiqueta,
    valor,
    formato,
    detalle,
    icono,
    color,
});

const grafico = (id, titulo, tipo, etiquetas, series, formato = "numero", extra = {}) => ({
    id,
    titulo,
    tipo,
    etiquetas,
    series: series.map((serie, indice) => ({
        nombre: serie.nombre,
        valores: serie.valores || [],
        color: serie.color || COLORES_REPORTE[indice % COLORES_REPORTE.length],
    })),
    formato,
    ...extra,
});

const tabla = (id, titulo, columnas, filas, nota = "") => ({
    id,
    titulo,
    columnas,
    filas,
    nota,
});

const opcion = (lista, id) =>
    (lista || []).find((elemento) => String(elemento.id) === String(id))?.nombre || "";

const ETIQUETAS_ESTADO_RESERVA = {
    en_curso: "En curso",
    proxima: "Próxima",
    finalizada: "Finalizada",
};

const ETIQUETAS_AFECTA_EFECTIVO = { S: "Sí", N: "No" };

const construirContexto = (filtros, catalogo, extras = []) => {
    const aplicados = [];

    if (filtros.cliente) {
        const cliente = catalogo.clientes.find(
            (elemento) => String(elemento.id) === String(filtros.cliente)
        );
        aplicados.push({ etiqueta: "Persona / cliente", valor: cliente?.etiqueta || filtros.cliente });
    }
    if (filtros.empresa) {
        aplicados.push({
            etiqueta: "Empresa",
            valor: opcion(catalogo.empresas, filtros.empresa) || filtros.empresa,
        });
    }
    if (filtros.usuario) {
        aplicados.push({
            etiqueta: "Responsable",
            valor: opcion(catalogo.usuarios, filtros.usuario) || filtros.usuario,
        });
    }
    if (filtros.categoriaHabitacion) {
        aplicados.push({
            etiqueta: "Categoría de habitación",
            valor:
                opcion(catalogo.categoriasHabitacion, filtros.categoriaHabitacion) ||
                filtros.categoriaHabitacion,
        });
    }
    if (filtros.estadoHabitacion) {
        aplicados.push({
            etiqueta: "Estado de habitación",
            valor:
                opcion(catalogo.estadosHabitacion, filtros.estadoHabitacion) ||
                filtros.estadoHabitacion,
        });
    }
    if (filtros.categoriaProducto) {
        aplicados.push({
            etiqueta: "Categoría de producto",
            valor:
                opcion(catalogo.categoriasProducto, filtros.categoriaProducto) ||
                filtros.categoriaProducto,
        });
    }
    if (filtros.producto) aplicados.push({ etiqueta: "Producto contiene", valor: filtros.producto });
    if (filtros.estadoReserva) {
        aplicados.push({
            etiqueta: "Estado de la reserva",
            valor: ETIQUETAS_ESTADO_RESERVA[filtros.estadoReserva] || filtros.estadoReserva,
        });
    }
    if (filtros.tipoComprobante) {
        aplicados.push({ etiqueta: "Comprobante", valor: filtros.tipoComprobante });
    }
    if (filtros.tipoMovimiento) {
        aplicados.push({
            etiqueta: "Tipo de movimiento",
            valor: opcion(catalogo.tiposMovimiento, filtros.tipoMovimiento) || filtros.tipoMovimiento,
        });
    }
    if (filtros.concepto) aplicados.push({ etiqueta: "Concepto de caja", valor: filtros.concepto });
    if (filtros.caja) {
        aplicados.push({ etiqueta: "Caja", valor: opcion(catalogo.cajas, filtros.caja) || filtros.caja });
    }
    if (filtros.metodoPago) {
        aplicados.push({
            etiqueta: "Método de pago",
            valor: opcion(catalogo.metodosPago, filtros.metodoPago) || filtros.metodoPago,
        });
    }
    if (filtros.afectaEfectivo) {
        aplicados.push({
            etiqueta: "Afecta efectivo",
            valor: ETIQUETAS_AFECTA_EFECTIVO[filtros.afectaEfectivo] || filtros.afectaEfectivo,
        });
    }
    if (filtros.accion) aplicados.push({ etiqueta: "Acción", valor: filtros.accion });
    if (filtros.tablaAuditada) {
        aplicados.push({ etiqueta: "Tabla auditada", valor: filtros.tablaAuditada });
    }
    if (filtros.agrupacionClientes) {
        aplicados.push({
            etiqueta: "Agrupación",
            valor: filtros.agrupacionClientes === "empresa" ? "Empresa" : "Cliente",
        });
    }

    return {
        desde: filtros.desde,
        hasta: filtros.hasta,
        periodo: filtros.periodo,
        filtros: [...aplicados, ...extras],
        generadoEn: new Date().toISOString(),
    };
};

const agruparPor = (filas, obtenerClave) => {
    const grupos = new Map();
    filas.forEach((fila) => {
        const clave = obtenerClave(fila);
        if (!grupos.has(clave)) grupos.set(clave, []);
        grupos.get(clave).push(fila);
    });
    return grupos;
};

const suma = (filas, obtenerValor) =>
    filas.reduce((total, fila) => total + numero(obtenerValor(fila)), 0);

const seriePorPeriodos = (periodos, filas, fechaDe, valorDe) => {
    const indices = new Map(periodos.map((periodo, indice) => [periodo, indice]));
    const valores = periodos.map(() => 0);
    filas.forEach((fila) => {
        const clave = clavePeriodo(fechaDe(fila), "periodo");
        const indice = indices.get(clave);
        if (indice == null) return;
        valores[indice] += numero(valorDe ? valorDe(fila) : 1);
    });
    return valores;
};

const seriePeriodos = (periodos, filas, fechaDe, valorDe, periodo) => {
    const indices = new Map(periodos.map((clave, indice) => [clave, indice]));
    const valores = periodos.map(() => 0);
    filas.forEach((fila) => {
        const clave = clavePeriodo(fechaDe(fila), periodo);
        const indice = indices.get(clave);
        if (indice == null) return;
        valores[indice] += numero(valorDe ? valorDe(fila) : 1);
    });
    return valores;
};

const datosPeriodos = (filtros) => {
    const claves = generarPeriodos(filtros.desde, filtros.hasta, filtros.periodo);
    return {
        claves,
        etiquetas: claves.map((clave) => etiquetaPeriodo(clave, filtros.periodo)),
    };
};

// ------------------------------------------------------------
// REPORTE: RESUMEN EJECUTIVO
// ------------------------------------------------------------
const reporteResumen = async (filtros, catalogo) => {
    const [recepcionesTodas, movimientosBase, ventasBase, comprobantesBase] = await Promise.all([
        cargarRecepciones(),
        cargarMovimientos(filtros),
        cargarVentas(filtros),
        cargarComprobantes(filtros),
    ]);

    const recepciones = filtrarRecepciones(recepcionesTodas, filtros, catalogo);
    const idsRecepcion = new Set(recepciones.map((recepcion) => String(recepcion.id_recepcion)));
    const filtrarPorRecepcion = (fila) => {
        if (!filtros.cliente && !filtros.empresa && !filtros.usuario) return true;
        return fila.id_recepcion && idsRecepcion.has(String(fila.id_recepcion));
    };

    const movimientos = movimientosBase
        .filter((movimiento) => !filtros.usuario || String(movimiento.id_usuario) === String(filtros.usuario))
        .filter(
            (movimiento) =>
                !filtros.metodoPago ||
                String(movimiento.id_metodopago) === String(filtros.metodoPago)
        )
        .filter(filtrarPorRecepcion);

    const ventas = ventasBase.filter(filtrarPorRecepcion);
    const comprobantes = comprobantesBase.filter(filtrarPorRecepcion);

    const tiposPorId = new Map(
        catalogo.tiposMovimiento.map((tipo) => [String(tipo.id), tipo])
    );
    let ingresosCaja = 0;
    let egresosCaja = 0;
    movimientos.forEach((movimiento) => {
        const signo = tiposPorId.get(String(movimiento.id_tipomovimiento))?.signo || "+";
        if (signo === "-") egresosCaja += numero(movimiento.monto);
        else ingresosCaja += numero(movimiento.monto);
    });

    const ventasTotal = suma(ventas, (venta) => venta.total);
    const hospedaje = suma(recepciones, (recepcion) => recepcion.d_inicial);
    const nochesVendidas = suma(recepciones, (recepcion) =>
        nochesEntre(recepcion.f_entrada, recepcion.f_salida)
    );

    const habitaciones = catalogo.habitaciones.filter(
        (habitacion) =>
            !filtros.categoriaHabitacion ||
            String(habitacion.categoriaId) === String(filtros.categoriaHabitacion)
    );
    const recepcionesOcupacion = filtrarRecepciones(recepcionesTodas, filtros, catalogo, {
        solapamiento: true,
    }).filter((recepcion) =>
        habitaciones.some(
            (habitacion) => String(habitacion.id) === String(recepcion.id_habitacion)
        )
    );
    const nochesOcupadas = suma(recepcionesOcupacion, (recepcion) =>
        nochesSolapadas(recepcion.f_entrada, recepcion.f_salida, filtros.desde, filtros.hasta)
    );
    const nochesDisponibles = habitaciones.length * rangoDias(filtros.desde, filtros.hasta);
    const tasaOcupacion = porcentaje(nochesOcupadas, nochesDisponibles);

    const { claves, etiquetas } = datosPeriodos(filtros);
    const indexes = new Map(claves.map((clave, indice) => [clave, indice]));
    const reservasPeriodo = claves.map(() => 0);
    const hospedajePeriodo = claves.map(() => 0);
    const ventasPeriodo = claves.map(() => 0);
    const ingresosPeriodo = claves.map(() => 0);
    const egresosPeriodo = claves.map(() => 0);

    recepciones.forEach((recepcion) => {
        const indice = indexes.get(clavePeriodo(recepcion.f_entrada, filtros.periodo));
        if (indice == null) return;
        reservasPeriodo[indice] += 1;
        hospedajePeriodo[indice] += numero(recepcion.d_inicial);
    });
    ventas.forEach((venta) => {
        const indice = indexes.get(clavePeriodo(venta.feccre, filtros.periodo));
        if (indice == null) return;
        ventasPeriodo[indice] += numero(venta.total);
    });
    movimientos.forEach((movimiento) => {
        const indice = indexes.get(clavePeriodo(movimiento.f_movimiento, filtros.periodo));
        if (indice == null) return;
        const signo = tiposPorId.get(String(movimiento.id_tipomovimiento))?.signo || "+";
        if (signo === "-") egresosPeriodo[indice] += numero(movimiento.monto);
        else ingresosPeriodo[indice] += numero(movimiento.monto);
    });

    const filasPeriodo = claves.map((clave, indice) => ({
        periodo: etiquetas[indice],
        reservas: reservasPeriodo[indice],
        noches: suma(
            recepciones.filter(
                (recepcion) =>
                    clavePeriodo(recepcion.f_entrada, filtros.periodo) === clave
            ),
            (recepcion) => nochesEntre(recepcion.f_entrada, recepcion.f_salida)
        ),
        hospedaje: hospedajePeriodo[indice],
        ventas: ventasPeriodo[indice],
        ingresos: ingresosPeriodo[indice],
        egresos: egresosPeriodo[indice],
        neto: ingresosPeriodo[indice] - egresosPeriodo[indice],
    }));

    const metodos = new Map();
    movimientos.forEach((movimiento) => {
        const tipo = tiposPorId.get(String(movimiento.id_tipomovimiento));
        if (tipo?.signo === "-") return;
        const nombre = opcion(catalogo.metodosPago, movimiento.id_metodopago) || "Sin método";
        metodos.set(nombre, (metodos.get(nombre) || 0) + numero(movimiento.monto));
    });
    const metodosOrdenados = [...metodos.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const facturas = comprobantes.filter((comprobante) => comprobante.tipo === "FACTURA").length;
    const boletas = comprobantes.filter((comprobante) => comprobante.tipo === "BOLETA").length;

    return {
        kpis: [
            kpi(
                "ingresos",
                "Ingresos de caja",
                redondear(ingresosCaja),
                "moneda",
                `Egresos: ${solesTexto(egresosCaja)}`,
                "bi-arrow-down-left-circle",
                "emerald"
            ),
            kpi(
                "ventas",
                "Ventas de productos",
                redondear(ventasTotal),
                "moneda",
                `${ventas.length} venta(s) registrada(s)`,
                "bi-bag-check",
                "blue"
            ),
            kpi(
                "hospedaje",
                "Hospedaje vendido",
                redondear(hospedaje),
                "moneda",
                `${recepciones.length} reserva(s) en el período`,
                "bi-door-open",
                "indigo"
            ),
            kpi(
                "ocupacion",
                "Ocupación del período",
                tasaOcupacion,
                "porcentaje",
                `${nochesOcupadas} de ${nochesDisponibles} noches disponibles`,
                "bi-pie-chart",
                "amber"
            ),
            kpi(
                "comprobantes",
                "Comprobantes emitidos",
                comprobantes.length,
                "numero",
                `${facturas} factura(s) · ${boletas} boleta(s)`,
                "bi-receipt",
                "cyan"
            ),
            kpi(
                "ticket",
                "Ticket promedio",
                recepciones.length ? redondear((hospedaje + ventasTotal) / recepciones.length) : 0,
                "moneda",
                "Hospedaje + ventas por reserva",
                "bi-calculator",
                "violet"
            ),
        ],
        graficos: [
            grafico(
                "evolucion",
                "Evolución de ingresos y egresos de caja",
                "barras",
                etiquetas,
                [
                    { nombre: "Ingresos", valores: ingresosPeriodo, color: COLORES_REPORTE[0] },
                    { nombre: "Egresos", valores: egresosPeriodo, color: COLORES_REPORTE[3] },
                ],
                "moneda"
            ),
            grafico(
                "metodos",
                "Ingresos por método de pago",
                "donut",
                metodosOrdenados.map(([nombre]) => nombre),
                [{ nombre: "Ingresos", valores: metodosOrdenados.map(([, valor]) => redondear(valor)) }],
                "moneda"
            ),
        ],
        tablas: [
            tabla(
                "resumen-periodo",
                "Resumen por período",
                [
                    { clave: "periodo", nombre: "Período", tipo: "texto" },
                    { clave: "reservas", nombre: "Reservas", tipo: "numero" },
                    { clave: "noches", nombre: "Noches", tipo: "numero" },
                    { clave: "hospedaje", nombre: "Hospedaje", tipo: "moneda" },
                    { clave: "ventas", nombre: "Ventas", tipo: "moneda" },
                    { clave: "ingresos", nombre: "Ingresos caja", tipo: "moneda" },
                    { clave: "egresos", nombre: "Egresos caja", tipo: "moneda" },
                    { clave: "neto", nombre: "Neto caja", tipo: "moneda" },
                ],
                filasPeriodo
            ),
        ],
    };
};

// ------------------------------------------------------------
// REPORTE: RESERVAS Y CHECK-IN
// ------------------------------------------------------------
const reporteReservas = async (filtros, catalogo) => {
    const recepciones = filtrarRecepciones(await cargarRecepciones(), filtros, catalogo);
    const filas = recepciones
        .map((recepcion) => filaRecepcion(recepcion, catalogo))
        .sort((a, b) => String(b.entrada).localeCompare(String(a.entrada)));

    const noches = suma(filas, (fila) => fila.noches);
    const hospedaje = suma(filas, (fila) => fila.total);
    const pagado = suma(filas, (fila) => fila.pagado);
    const saldo = suma(filas, (fila) => fila.saldo);

    const { claves, etiquetas } = datosPeriodos(filtros);
    const reservasPeriodo = seriePeriodos(
        claves,
        recepciones,
        (recepcion) => recepcion.f_entrada,
        null,
        filtros.periodo
    );
    const nochesPeriodo = seriePeriodos(
        claves,
        recepciones,
        (recepcion) => recepcion.f_entrada,
        (recepcion) => nochesEntre(recepcion.f_entrada, recepcion.f_salida),
        filtros.periodo
    );

    const porCategoria = agruparPor(filas, (fila) => fila.categoria);
    const categorias = [...porCategoria.entries()]
        .map(([nombre, grupo]) => ({
            nombre,
            valor: grupo.length,
            noches: suma(grupo, (fila) => fila.noches),
        }))
        .sort((a, b) => b.valor - a.valor);

    return {
        kpis: [
            kpi("reservas", "Reservas", filas.length, "numero", "Recepciones del período", "bi-calendar-check", "emerald"),
            kpi("noches", "Noches vendidas", noches, "numero", "Suma de estadías", "bi-moon-stars", "blue"),
            kpi("hospedaje", "Ingresos por hospedaje", redondear(hospedaje), "moneda", "Monto inicial de las reservas", "bi-cash-coin", "indigo"),
            kpi("pagado", "Cobrado", redondear(pagado), "moneda", "Pagos aplicados a las reservas", "bi-check2-circle", "teal"),
            kpi("saldo", "Saldo pendiente", redondear(saldo), "moneda", "Deuda acumulada del período", "bi-exclamation-circle", saldo > 0 ? "red" : "slate"),
            kpi("promedio", "Estadía promedio", filas.length ? redondear(noches / filas.length, 1) : 0, "numero", "Noches por reserva", "bi-hourglass-split", "amber"),
        ],
        graficos: [
            grafico(
                "reservas-periodo",
                "Reservas y noches por período",
                "barras",
                etiquetas,
                [
                    { nombre: "Reservas", valores: reservasPeriodo, color: COLORES_REPORTE[1] },
                    { nombre: "Noches", valores: nochesPeriodo, color: COLORES_REPORTE[0] },
                ],
                "numero"
            ),
            grafico(
                "reservas-categoria",
                "Reservas por categoría de habitación",
                "donut",
                categorias.map((categoria) => categoria.nombre),
                [{ nombre: "Reservas", valores: categorias.map((categoria) => categoria.valor) }],
                "numero"
            ),
        ],
        tablas: [
            tabla(
                "detalle-reservas",
                "Detalle de reservas",
                [
                    { clave: "codigo", nombre: "Código", tipo: "texto" },
                    { clave: "cliente", nombre: "Cliente", tipo: "texto" },
                    { clave: "documento", nombre: "Documento", tipo: "texto" },
                    { clave: "empresa", nombre: "Empresa", tipo: "texto" },
                    { clave: "habitacion", nombre: "Hab.", tipo: "texto" },
                    { clave: "categoria", nombre: "Categoría", tipo: "texto" },
                    { clave: "entrada", nombre: "Entrada", tipo: "fecha" },
                    { clave: "salida", nombre: "Salida", tipo: "fecha" },
                    { clave: "noches", nombre: "Noches", tipo: "numero" },
                    { clave: "total", nombre: "Total", tipo: "moneda" },
                    { clave: "pagado", nombre: "Pagado", tipo: "moneda" },
                    { clave: "saldo", nombre: "Saldo", tipo: "moneda" },
                    { clave: "estado", nombre: "Estado", tipo: "texto" },
                    { clave: "responsable", nombre: "Responsable", tipo: "texto" },
                ],
                filas
            ),
        ],
    };
};

// ------------------------------------------------------------
// REPORTE: OCUPACIÓN DE HABITACIONES
// ------------------------------------------------------------
const limitesPeriodo = (clave, periodo) => {
    if (periodo === "anio") return { inicio: `${clave}-01-01`, fin: `${clave}-12-31` };
    if (periodo === "mes") {
        const [anio, mes] = clave.split("-").map(Number);
        const fin = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
        return { inicio: `${clave}-01`, fin };
    }
    if (periodo === "semana") return { inicio: clave, fin: sumarDias(clave, 6) };
    return { inicio: clave, fin: clave };
};

const reporteOcupacion = async (filtros, catalogo) => {
    const habitaciones = catalogo.habitaciones.filter(
        (habitacion) =>
            (!filtros.categoriaHabitacion ||
                String(habitacion.categoriaId) === String(filtros.categoriaHabitacion)) &&
            (!filtros.estadoHabitacion ||
                String(habitacion.estadoId) === String(filtros.estadoHabitacion))
    );
    const idsHabitaciones = new Set(habitaciones.map((habitacion) => String(habitacion.id)));
    const recepcionesTodas = await cargarRecepciones();
    const recepciones = filtrarRecepciones(recepcionesTodas, filtros, catalogo, {
        solapamiento: true,
    }).filter((recepcion) => idsHabitaciones.has(String(recepcion.id_habitacion)));

    const diasPeriodo = rangoDias(filtros.desde, filtros.hasta);
    const nochesDisponibles = habitaciones.length * diasPeriodo;
    const nochesOcupadas = suma(recepciones, (recepcion) =>
        nochesSolapadas(recepcion.f_entrada, recepcion.f_salida, filtros.desde, filtros.hasta)
    );

    const ingresosPeriodo = recepciones.reduce((total, recepcion) => {
        const nochesTotales = nochesEntre(recepcion.f_entrada, recepcion.f_salida);
        const nochesEnRango = nochesSolapadas(
            recepcion.f_entrada,
            recepcion.f_salida,
            filtros.desde,
            filtros.hasta
        );
        if (!nochesTotales) return total;
        return total + numero(recepcion.d_inicial) * (nochesEnRango / nochesTotales);
    }, 0);

    const ocupadasAhora = habitaciones.filter((habitacion) =>
        normalizarTexto(habitacion.estadoNombre).includes("ocup")
    ).length;
    const disponiblesAhora = habitaciones.filter((habitacion) =>
        normalizarTexto(habitacion.estadoNombre).includes("dispon")
    ).length;

    const categorias = catalogo.categoriasHabitacion
        .filter((categoria) =>
            habitaciones.some((habitacion) => String(habitacion.categoriaId) === String(categoria.id))
        )
        .map((categoria) => {
            const habitacionesCategoria = habitaciones.filter(
                (habitacion) => String(habitacion.categoriaId) === String(categoria.id)
            );
            const recepcionesCategoria = recepciones.filter((recepcion) => {
                const habitacion = catalogo.habitaciones.find(
                    (elemento) => String(elemento.id) === String(recepcion.id_habitacion)
                );
                return String(habitacion?.categoriaId) === String(categoria.id);
            });
            const nochesCategoria = suma(recepcionesCategoria, (recepcion) =>
                nochesSolapadas(recepcion.f_entrada, recepcion.f_salida, filtros.desde, filtros.hasta)
            );
            const disponiblesCategoria = habitacionesCategoria.length * diasPeriodo;
            const ingresosCategoria = recepcionesCategoria.reduce((total, recepcion) => {
                const nochesTotales = nochesEntre(recepcion.f_entrada, recepcion.f_salida);
                const nochesEnRango = nochesSolapadas(
                    recepcion.f_entrada,
                    recepcion.f_salida,
                    filtros.desde,
                    filtros.hasta
                );
                if (!nochesTotales) return total;
                return total + numero(recepcion.d_inicial) * (nochesEnRango / nochesTotales);
            }, 0);
            return {
                categoria: categoria.nombre,
                habitaciones: habitacionesCategoria.length,
                nochesDisponibles: disponiblesCategoria,
                nochesOcupadas: nochesCategoria,
                ocupacion: porcentaje(nochesCategoria, disponiblesCategoria),
                ingresos: redondear(ingresosCategoria),
                adr: nochesCategoria ? redondear(ingresosCategoria / nochesCategoria) : 0,
                tarifa: habitacionesCategoria.length
                    ? redondear(
                          suma(habitacionesCategoria, (habitacion) => habitacion.precio) /
                              habitacionesCategoria.length
                      )
                    : 0,
            };
        });

    const resumenEstados = catalogo.estadosHabitacion
        .map((estado) => ({
            estado: estado.nombre,
            habitaciones: habitaciones.filter(
                (habitacion) => String(habitacion.estadoId) === String(estado.id)
            ).length,
        }))
        .filter((fila) => fila.habitaciones > 0);

    const { claves, etiquetas } = datosPeriodos(filtros);
    const ocupacionPromedio = claves.map((clave) => {
        const { inicio, fin } = limitesPeriodo(clave, filtros.periodo);
        const inicioRango = inicio < filtros.desde ? filtros.desde : inicio;
        const finRango = fin > filtros.hasta ? filtros.hasta : fin;
        const dias = rangoDias(inicioRango, finRango);
        if (!dias) return 0;
        const noches = suma(recepciones, (recepcion) =>
            nochesSolapadas(recepcion.f_entrada, recepcion.f_salida, inicioRango, finRango)
        );
        return redondear(noches / dias, 1);
    });

    const activasTodas = recepcionesTodas.filter((recepcion) => !recepcion.f_salidac);
    const activasPorHabitacion = new Map();
    activasTodas.forEach((recepcion) => {
        const clave = String(recepcion.id_habitacion);
        if (!activasPorHabitacion.has(clave)) {
            activasPorHabitacion.set(clave, recepcion);
        }
    });

    const detalleHabitaciones = habitaciones.map((habitacion) => {
        const recepcion = activasPorHabitacion.get(String(habitacion.id));
        const cliente = recepcion ? clienteDeRecepcion(recepcion, catalogo) : null;
        const coincideFiltro =
            !recepcion ||
            ((!filtros.cliente || String(recepcion.id_cliente) === String(filtros.cliente)) &&
                (!filtros.empresa ||
                    String(cliente?.empresaId || "") === String(filtros.empresa)) &&
                (!filtros.usuario ||
                    String(recepcion.id_usuario) === String(filtros.usuario)));
        return {
            habitacion: habitacion.numero,
            categoria: habitacion.categoriaNombre,
            piso: habitacion.pisoNombre || "-",
            estado: habitacion.estadoNombre,
            precio: habitacion.precio,
            cliente: coincideFiltro && cliente ? cliente.nombre : "-",
            entrada: recepcion && coincideFiltro ? fechaDia(recepcion.f_entrada) : "-",
            salida: recepcion && coincideFiltro ? fechaDia(recepcion.f_salida) : "-",
        };
    });

    return {
        kpis: [
            kpi("habitaciones", "Habitaciones", habitaciones.length, "numero", "Según filtros aplicados", "bi-building", "blue"),
            kpi("ocupadas", "Ocupadas ahora", ocupadasAhora, "numero", `${porcentaje(ocupadasAhora, habitaciones.length)}% del inventario`, "bi-door-closed", "red"),
            kpi("disponibles", "Disponibles ahora", disponiblesAhora, "numero", "Estado actual del inventario", "bi-door-open", "emerald"),
            kpi("ocupacion", "Ocupación del período", porcentaje(nochesOcupadas, nochesDisponibles), "porcentaje", `${nochesOcupadas} de ${nochesDisponibles} noches`, "bi-pie-chart", "amber"),
            kpi("noches", "Habitaciones-noche vendidas", nochesOcupadas, "numero", "Noches ocupadas dentro del rango", "bi-moon-stars", "indigo"),
            kpi("adr", "ADR / tarifa promedio", nochesOcupadas ? redondear(ingresosPeriodo / nochesOcupadas) : 0, "moneda", "Ingreso promedio por noche vendida", "bi-currency-dollar", "teal"),
        ],
        graficos: [
            grafico(
                "ocupacion-categoria",
                "Ocupación por categoría",
                "barras",
                categorias.map((categoria) => categoria.categoria),
                [{ nombre: "Ocupación", valores: categorias.map((categoria) => categoria.ocupacion) }],
                "porcentaje"
            ),
            grafico(
                "estados",
                "Estado actual de las habitaciones",
                "donut",
                resumenEstados.map((fila) => fila.estado),
                [{ nombre: "Habitaciones", valores: resumenEstados.map((fila) => fila.habitaciones) }],
                "numero"
            ),
            grafico(
                "evolucion-ocupacion",
                "Habitaciones ocupadas en promedio por período",
                "lineas",
                etiquetas,
                [{ nombre: "Habitaciones ocupadas", valores: ocupacionPromedio }],
                "numero"
            ),
        ],
        tablas: [
            tabla(
                "ocupacion-categoria-tabla",
                "Ocupación por categoría de habitación",
                [
                    { clave: "categoria", nombre: "Categoría", tipo: "texto" },
                    { clave: "habitaciones", nombre: "Habitaciones", tipo: "numero" },
                    { clave: "nochesDisponibles", nombre: "Noches disponibles", tipo: "numero" },
                    { clave: "nochesOcupadas", nombre: "Noches ocupadas", tipo: "numero" },
                    { clave: "ocupacion", nombre: "Ocupación", tipo: "porcentaje" },
                    { clave: "tarifa", nombre: "Tarifa promedio", tipo: "moneda" },
                    { clave: "ingresos", nombre: "Ingresos del período", tipo: "moneda" },
                    { clave: "adr", nombre: "ADR", tipo: "moneda" },
                ],
                categorias
            ),
            tabla(
                "detalle-habitaciones",
                "Estado actual de las habitaciones",
                [
                    { clave: "habitacion", nombre: "Habitación", tipo: "texto" },
                    { clave: "categoria", nombre: "Categoría", tipo: "texto" },
                    { clave: "piso", nombre: "Piso", tipo: "texto" },
                    { clave: "estado", nombre: "Estado", tipo: "texto" },
                    { clave: "precio", nombre: "Tarifa", tipo: "moneda" },
                    { clave: "cliente", nombre: "Huésped actual", tipo: "texto" },
                    { clave: "entrada", nombre: "Entrada", tipo: "fecha" },
                    { clave: "salida", nombre: "Salida", tipo: "fecha" },
                ],
                detalleHabitaciones,
                "El estado y el huésped corresponden al momento de generar el reporte."
            ),
        ],
    };
};

// ------------------------------------------------------------
// REPORTE: INGRESOS Y EGRESOS DE CAJA
// ------------------------------------------------------------
const reporteCaja = async (filtros, catalogo) => {
    const [movimientosBase, aperturas] = await Promise.all([
        cargarMovimientos(filtros),
        cargarAperturas(),
    ]);
    const aperturasPorId = new Map(
        aperturas.map((apertura) => [String(apertura.id_aperturacaja), apertura])
    );
    const cajasPorId = new Map(catalogo.cajas.map((caja) => [String(caja.id), caja]));
    const tiposPorId = new Map(catalogo.tiposMovimiento.map((tipo) => [String(tipo.id), tipo]));
    const conceptosPorId = new Map(
        catalogo.conceptosCaja.map((concepto) => [String(concepto.id), concepto])
    );
    const metodosPorId = new Map(catalogo.metodosPago.map((metodo) => [String(metodo.id), metodo]));
    const usuariosPorId = new Map(catalogo.usuarios.map((usuario) => [String(usuario.id), usuario]));

    const movimientos = movimientosBase.filter((movimiento) => {
        const apertura = aperturasPorId.get(String(movimiento.id_aperturacaja));
        if (filtros.usuario && String(movimiento.id_usuario) !== String(filtros.usuario)) return false;
        if (filtros.metodoPago && String(movimiento.id_metodopago) !== String(filtros.metodoPago)) return false;
        if (
            filtros.tipoMovimiento &&
            String(movimiento.id_tipomovimiento) !== String(filtros.tipoMovimiento)
        ) {
            return false;
        }
        if (filtros.afectaEfectivo && String(movimiento.afecta_efectivo) !== filtros.afectaEfectivo) {
            return false;
        }
        if (filtros.caja && String(apertura?.id_caja || "") !== String(filtros.caja)) return false;
        if (filtros.concepto) {
            const concepto = conceptosPorId.get(String(movimiento.id_concepto));
            if (String(concepto?.nombre || "").toUpperCase() !== filtros.concepto.toUpperCase()) {
                return false;
            }
        }
        return true;
    });

    const filas = movimientos.map((movimiento) => {
        const tipo = tiposPorId.get(String(movimiento.id_tipomovimiento));
        const concepto = conceptosPorId.get(String(movimiento.id_concepto));
        const apertura = aperturasPorId.get(String(movimiento.id_aperturacaja));
        return {
            id: movimiento.id_movimientocaja,
            fecha: fechaDia(movimiento.f_movimiento),
            fechaHora: movimiento.f_movimiento,
            tipo: tipo?.nombre || "SIN TIPO",
            signo: tipo?.signo || "+",
            concepto: concepto?.nombre || nombreBase(movimiento.descripcion) || "Sin concepto",
            metodo: metodosPorId.get(String(movimiento.id_metodopago))?.nombre || "Sin método",
            descripcion: movimiento.descripcion || "-",
            monto: numero(movimiento.monto),
            afectaEfectivo: movimiento.afecta_efectivo === "S" ? "Sí" : "No",
            responsable: usuariosPorId.get(String(movimiento.id_usuario))?.nombre || `Usuario #${movimiento.id_usuario}`,
            caja: cajasPorId.get(String(apertura?.id_caja))?.nombre || "Sin caja",
            terminal: movimiento.terminal || "-",
        };
    });

    const ingresos = suma(
        filas.filter((fila) => fila.signo !== "-"),
        (fila) => fila.monto
    );
    const egresos = suma(
        filas.filter((fila) => fila.signo === "-"),
        (fila) => fila.monto
    );
    const efectivo = suma(
        filas.filter((fila) => fila.afectaEfectivo === "S"),
        (fila) => (fila.signo === "-" ? -fila.monto : fila.monto)
    );

    const { claves, etiquetas } = datosPeriodos(filtros);
    const ingresosPeriodo = seriePeriodos(
        claves,
        filas.filter((fila) => fila.signo !== "-"),
        (fila) => fila.fechaHora,
        (fila) => fila.monto,
        filtros.periodo
    );
    const egresosPeriodo = seriePeriodos(
        claves,
        filas.filter((fila) => fila.signo === "-"),
        (fila) => fila.fechaHora,
        (fila) => fila.monto,
        filtros.periodo
    );

    const porConcepto = agruparPor(filas, (fila) => fila.concepto);
    const conceptos = [...porConcepto.entries()]
        .map(([concepto, grupo]) => ({
            concepto,
            movimientos: grupo.length,
            ingresos: suma(grupo.filter((fila) => fila.signo !== "-"), (fila) => fila.monto),
            egresos: suma(grupo.filter((fila) => fila.signo === "-"), (fila) => fila.monto),
            neto: suma(grupo, (fila) => (fila.signo === "-" ? -fila.monto : fila.monto)),
        }))
        .sort((a, b) => Math.abs(b.neto) - Math.abs(a.neto));

    const totalPorConcepto = conceptos.reduce(
        (total, fila) => total + fila.ingresos + fila.egresos,
        0
    );

    return {
        kpis: [
            kpi("ingresos", "Ingresos", redondear(ingresos), "moneda", `${filas.filter((fila) => fila.signo !== "-").length} movimiento(s)`, "bi-arrow-down-left-circle", "emerald"),
            kpi("egresos", "Egresos", redondear(egresos), "moneda", `${filas.filter((fila) => fila.signo === "-").length} movimiento(s)`, "bi-arrow-up-right-circle", "red"),
            kpi("neto", "Flujo neto", redondear(ingresos - egresos), "moneda", "Ingresos menos egresos", "bi-wallet2", "blue"),
            kpi("movimientos", "Movimientos", filas.length, "numero", "Registros del período", "bi-arrow-left-right", "indigo"),
            kpi("ticket", "Monto promedio", filas.length ? redondear((ingresos + egresos) / filas.length) : 0, "moneda", "Promedio por movimiento", "bi-calculator", "amber"),
            kpi("efectivo", "Flujo en efectivo", redondear(efectivo), "moneda", "Solo movimientos que afectan caja", "bi-cash-stack", "teal"),
        ],
        graficos: [
            grafico(
                "caja-evolucion",
                "Ingresos y egresos por período",
                "barras",
                etiquetas,
                [
                    { nombre: "Ingresos", valores: ingresosPeriodo },
                    { nombre: "Egresos", valores: egresosPeriodo },
                ],
                "moneda"
            ),
            grafico(
                "caja-conceptos",
                "Participación por concepto",
                "donut",
                conceptos.slice(0, 8).map((fila) => fila.concepto),
                [
                    {
                        nombre: "Monto",
                        valores: conceptos
                            .slice(0, 8)
                            .map((fila) => redondear(fila.ingresos + fila.egresos)),
                    },
                ],
                "moneda",
                { detalle: `Participación sobre ${solesTexto(totalPorConcepto)} movidos` }
            ),
        ],
        tablas: [
            tabla(
                "caja-concepto",
                "Resumen por concepto",
                [
                    { clave: "concepto", nombre: "Concepto", tipo: "texto" },
                    { clave: "movimientos", nombre: "Movimientos", tipo: "numero" },
                    { clave: "ingresos", nombre: "Ingresos", tipo: "moneda" },
                    { clave: "egresos", nombre: "Egresos", tipo: "moneda" },
                    { clave: "neto", nombre: "Neto", tipo: "moneda" },
                ],
                conceptos
            ),
            tabla(
                "caja-detalle",
                "Detalle de movimientos",
                [
                    { clave: "fecha", nombre: "Fecha", tipo: "fecha" },
                    { clave: "tipo", nombre: "Tipo", tipo: "texto" },
                    { clave: "concepto", nombre: "Concepto", tipo: "texto" },
                    { clave: "metodo", nombre: "Método", tipo: "texto" },
                    { clave: "descripcion", nombre: "Descripción", tipo: "texto" },
                    { clave: "monto", nombre: "Monto", tipo: "moneda" },
                    { clave: "afectaEfectivo", nombre: "Efectivo", tipo: "texto" },
                    { clave: "responsable", nombre: "Responsable", tipo: "texto" },
                    { clave: "caja", nombre: "Caja", tipo: "texto" },
                    { clave: "terminal", nombre: "Terminal", tipo: "texto" },
                ],
                filas
            ),
        ],
    };
};

// ------------------------------------------------------------
// REPORTE: COMPROBANTES EMITIDOS
// ------------------------------------------------------------
const reporteComprobantes = async (filtros, catalogo) => {
    const [comprobantesBase, recepcionesTodas] = await Promise.all([
        cargarComprobantes(filtros),
        cargarRecepciones(),
    ]);
    const recepcionesPorId = new Map(
        recepcionesTodas.map((recepcion) => [String(recepcion.id_recepcion), recepcion])
    );

    const recepcionesFiltradas = filtrarRecepciones(recepcionesTodas, filtros, catalogo);
    const idsRecepcion = new Set(
        recepcionesFiltradas.map((recepcion) => String(recepcion.id_recepcion))
    );

    const comprobantes = comprobantesBase.filter((comprobante) => {
        if (filtros.tipoComprobante && comprobante.tipo !== filtros.tipoComprobante) return false;
        if (filtros.cliente || filtros.empresa || filtros.usuario) {
            return comprobante.id_recepcion && idsRecepcion.has(String(comprobante.id_recepcion));
        }
        return true;
    });

    const filas = comprobantes.map((comprobante) => {
        const recepcion = recepcionesPorId.get(String(comprobante.id_recepcion));
        const cliente = recepcion ? clienteDeRecepcion(recepcion, catalogo) : null;
        return {
            id: comprobante.tipo === "FACTURA" ? comprobante.id_factura : comprobante.id_boleta,
            tipo: comprobante.tipo,
            serieNumero: `${String(comprobante.serie || "").trim()}-${comprobante.numero}`,
            emision: fechaDia(comprobante.f_emision),
            f_emision: comprobante.f_emision,
            recepcion: comprobante.id_recepcion,
            clienteId: recepcion?.id_cliente || null,
            cliente: cliente?.nombre || "-",
            documento: cliente?.documento || recepcion?.documento || "-",
            empresaId: cliente?.empresaId || null,
            empresa: cliente?.empresaNombre || "-",
            total: numero(recepcion?.d_inicial),
            responsableId: recepcion?.id_usuario || null,
            responsable:
                catalogo.usuarios.find(
                    (usuario) => String(usuario.id) === String(recepcion?.id_usuario)
                )?.nombre || "-",
        };
    });

    const facturas = filas.filter((fila) => fila.tipo === "FACTURA");
    const boletas = filas.filter((fila) => fila.tipo === "BOLETA");
    const totalFacturado = suma(filas, (fila) => fila.total);

    const { claves, etiquetas } = datosPeriodos(filtros);
    const facturasPeriodo = seriePeriodos(
        claves,
        facturas,
        (fila) => fila.f_emision,
        null,
        filtros.periodo
    );
    const boletasPeriodo = seriePeriodos(
        claves,
        boletas,
        (fila) => fila.f_emision,
        null,
        filtros.periodo
    );

    return {
        kpis: [
            kpi("total", "Comprobantes", filas.length, "numero", "Facturas y boletas emitidas", "bi-receipt", "indigo"),
            kpi("facturas", "Facturas", facturas.length, "numero", "Documentos de factura", "bi-file-earmark-text", "blue"),
            kpi("boletas", "Boletas", boletas.length, "numero", "Documentos de boleta", "bi-receipt", "amber"),
            kpi("monto", "Monto facturado", redondear(totalFacturado), "moneda", "Según recepción asociada", "bi-cash-coin", "emerald"),
            kpi("promedio", "Ticket promedio", filas.length ? redondear(totalFacturado / filas.length) : 0, "moneda", "Monto por comprobante", "bi-calculator", "teal"),
            kpi("clientes", "Clientes atendidos", new Set(filas.map((fila) => fila.clienteId).filter(Boolean)).size, "numero", "Clientes distintos", "bi-people", "violet"),
        ],
        graficos: [
            grafico(
                "comprobantes-periodo",
                "Comprobantes emitidos por período",
                "barras",
                etiquetas,
                [
                    { nombre: "Facturas", valores: facturasPeriodo },
                    { nombre: "Boletas", valores: boletasPeriodo },
                ],
                "numero"
            ),
            grafico(
                "comprobantes-tipo",
                "Distribución por tipo de comprobante",
                "donut",
                ["Facturas", "Boletas"],
                [{ nombre: "Comprobantes", valores: [facturas.length, boletas.length] }],
                "numero"
            ),
        ],
        tablas: [
            tabla(
                "detalle-comprobantes",
                "Detalle de comprobantes",
                [
                    { clave: "tipo", nombre: "Tipo", tipo: "texto" },
                    { clave: "serieNumero", nombre: "Serie - número", tipo: "texto" },
                    { clave: "emision", nombre: "Emisión", tipo: "fecha" },
                    { clave: "recepcion", nombre: "Recepción", tipo: "texto" },
                    { clave: "cliente", nombre: "Cliente", tipo: "texto" },
                    { clave: "documento", nombre: "Documento", tipo: "texto" },
                    { clave: "empresa", nombre: "Empresa", tipo: "texto" },
                    { clave: "total", nombre: "Total", tipo: "moneda" },
                    { clave: "responsable", nombre: "Responsable", tipo: "texto" },
                ],
                filas,
                "El monto se toma del total inicial de la recepción asociada."
            ),
        ],
    };
};

const REPORTES_DISPONIBLES = {
    resumen: reporteResumen,
    reservas: reporteReservas,
    ocupacion: reporteOcupacion,
    caja: reporteCaja,
    comprobantes: reporteComprobantes,
};

export const generarReporte = async (reporteId, filtros = {}) => {
    if (!reporteId) {
        throw new Error("Debe seleccionar un tipo de reporte.");
    }
    const generador = REPORTES_DISPONIBLES[reporteId];
    if (!generador) {
        throw new Error(`El reporte "${reporteId}" no está disponible.`);
    }
    const filtrosNormalizados = normalizarFiltros(filtros);
    const catalogo = await cargarCatalogosReportes();
    const resultado = await generador(filtrosNormalizados, catalogo);
    return {
        id: reporteId,
        ...resultado,
        contexto: construirContexto(filtrosNormalizados, catalogo),
        filtros: filtrosNormalizados,
    };
};

export const obtenerCatalogoReportes = async () => {
    const catalogo = await cargarCatalogosReportes();
    return {
        filtros: {
            fechas: { tipo: "fechas", label: "Rango de fechas", requerido: true },
            periodo: { tipo: "select", label: "Agrupar por", opciones: PERIODOS },
            cliente: { tipo: "select", label: "Persona / cliente", opciones: catalogo.clientes.map((c) => ({ value: c.id, label: c.etiqueta })), vacio: "Todas las personas" },
            empresa: { tipo: "select", label: "Empresa", opciones: catalogo.empresas.map((e) => ({ value: e.id, label: e.nombre })), vacio: "Todas las empresas" },
            usuario: { tipo: "select", label: "Responsable", opciones: catalogo.usuarios.map((u) => ({ value: u.id, label: u.nombre })), vacio: "Todos los responsables" },
            categoriaHabitacion: { tipo: "select", label: "Categoría de habitación", opciones: catalogo.categoriasHabitacion.map((c) => ({ value: c.id, label: c.nombre })), vacio: "Todas las categorías" },
            estadoHabitacion: { tipo: "select", label: "Estado de habitación", opciones: catalogo.estadosHabitacion.map((e) => ({ value: e.id, label: e.nombre })), vacio: "Todos los estados" },
            categoriaProducto: { tipo: "select", label: "Categoría de producto", opciones: catalogo.categoriasProducto.map((c) => ({ value: c.id, label: c.nombre })), vacio: "Todas las categorías" },
            producto: { tipo: "text", label: "Producto contiene", placeholder: "Ej. cerveza, papas..." },
            estadoReserva: { tipo: "select", label: "Estado de la reserva", opciones: [{ value: "en_curso", label: "En curso" }, { value: "proxima", label: "Próxima" }, { value: "finalizada", label: "Finalizada" }], vacio: "Todos los estados" },
            tipoComprobante: { tipo: "select", label: "Tipo de comprobante", opciones: [{ value: "FACTURA", label: "Facturas" }, { value: "BOLETA", label: "Boletas" }], vacio: "Facturas y boletas" },
            tipoMovimiento: { tipo: "select", label: "Tipo de movimiento", opciones: catalogo.tiposMovimiento.map((t) => ({ value: t.id, label: t.nombre })), vacio: "Ingresos y egresos" },
            concepto: { tipo: "select", label: "Concepto de caja", opciones: catalogo.conceptosBase.map((c) => ({ value: c.nombre, label: c.nombre })), vacio: "Todos los conceptos" },
            caja: { tipo: "select", label: "Caja", opciones: catalogo.cajas.map((c) => ({ value: c.id, label: c.nombre })), vacio: "Todas las cajas" },
            metodoPago: { tipo: "select", label: "Método de pago", opciones: catalogo.metodosPago.map((m) => ({ value: m.id, label: m.nombre })), vacio: "Todos los métodos" },
            afectaEfectivo: { tipo: "select", label: "Afecta efectivo", opciones: [{ value: "S", label: "Sí" }, { value: "N", label: "No" }], vacio: "Todos" },
        },
        reportes: Object.keys(REPORTES_DISPONIBLES).map((clave) => {
            const rep = REPORTES_CONFIG[clave] || {};
            return { id: clave, nombre: rep.nombre || clave, descripcion: rep.descripcion || "" };
        }),
        periodos: PERIODOS,
    };
};

export { cargarCatalogosReportes, invalidarCatalogosReportes };
