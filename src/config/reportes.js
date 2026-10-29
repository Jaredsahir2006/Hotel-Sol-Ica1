// ============================================================
// Catálogo del módulo REPORTES.
// Aquí se define qué reportes existen, qué filtros usan y las
// opciones del constructor de reportes personalizados.
// ============================================================

export const PERIODOS = [
    { value: "dia", label: "Día" },
    { value: "semana", label: "Semana" },
    { value: "mes", label: "Mes" },
    { value: "anio", label: "Año" },
];

export const FILTROS = {
    fechas: { tipo: "fechas", label: "Rango de fechas" },
    periodo: { tipo: "select", label: "Agrupar por", opciones: PERIODOS },
    cliente: { tipo: "select", label: "Persona / cliente", catalogo: "clientes", vacio: "Todas las personas" },
    empresa: { tipo: "select", label: "Empresa", catalogo: "empresas", vacio: "Todas las empresas" },
    usuario: { tipo: "select", label: "Responsable", catalogo: "usuarios", vacio: "Todos los responsables" },
    categoriaHabitacion: { tipo: "select", label: "Categoría de habitación", catalogo: "categoriasHabitacion", vacio: "Todas las categorías" },
    estadoHabitacion: { tipo: "select", label: "Estado de habitación", catalogo: "estadosHabitacion", vacio: "Todos los estados" },
    categoriaProducto: { tipo: "select", label: "Categoría de producto", catalogo: "categoriasProducto", vacio: "Todas las categorías" },
    producto: { tipo: "text", label: "Producto contiene", placeholder: "Ej. cerveza, papas..." },
    estadoReserva: {
        tipo: "select",
        label: "Estado de la reserva",
        opciones: [
            { value: "en_curso", label: "En curso" },
            { value: "proxima", label: "Próxima" },
            { value: "finalizada", label: "Finalizada" },
        ],
        vacio: "Todos los estados",
    },
    tipoComprobante: {
        tipo: "select",
        label: "Tipo de comprobante",
        opciones: [
            { value: "FACTURA", label: "Facturas" },
            { value: "BOLETA", label: "Boletas" },
        ],
        vacio: "Facturas y boletas",
    },
    tipoMovimiento: { tipo: "select", label: "Tipo de movimiento", catalogo: "tiposMovimiento", vacio: "Ingresos y egresos" },
    concepto: { tipo: "select", label: "Concepto de caja", catalogo: "conceptosBase", vacio: "Todos los conceptos" },
    caja: { tipo: "select", label: "Caja", catalogo: "cajas", vacio: "Todas las cajas" },
    metodoPago: { tipo: "select", label: "Método de pago", catalogo: "metodosPago", vacio: "Todos los métodos" },
    afectaEfectivo: {
        tipo: "select",
        label: "Afecta efectivo",
        opciones: [
            { value: "S", label: "Sí" },
            { value: "N", label: "No" },
        ],
        vacio: "Todos",
    },
    accion: {
        tipo: "select",
        label: "Acción",
        opciones: [
            { value: "INSERT", label: "Insertar" },
            { value: "UPDATE", label: "Actualizar" },
            { value: "DELETE", label: "Eliminar" },
        ],
        vacio: "Todas las acciones",
    },
    tablaAuditada: { tipo: "select", label: "Tabla auditada", catalogo: "tablasAuditoria", vacio: "Todas las tablas" },
    agrupacionClientes: {
        tipo: "select",
        label: "Agrupar ranking por",
        opciones: [
            { value: "cliente", label: "Persona / cliente" },
            { value: "empresa", label: "Empresa" },
        ],
    },
};

export const REPORTES = {
    resumen: {
        nombre: "Resumen ejecutivo",
        descripcion: "Indicadores generales de ingresos, ventas, hospedaje y ocupación.",
        icono: "bi-speedometer2",
        color: "blue",
        filtros: ["fechas", "periodo", "cliente", "empresa", "usuario", "metodoPago"],
    },
    auditoria: {
        nombre: "Auditoría y trazabilidad",
        descripcion: "Eventos registrados por usuario, acción y tabla del sistema.",
        icono: "bi-clock-history",
        color: "slate",
        filtros: ["fechas", "usuario", "accion", "tablaAuditada"],
    },
    reservas: {
        nombre: "Reservas y check-in",
        descripcion: "Detalle de reservas, huéspedes, estadías, cobros y saldos.",
        icono: "bi-calendar-check",
        color: "emerald",
        filtros: ["fechas", "periodo", "cliente", "empresa", "usuario", "categoriaHabitacion", "estadoReserva", "tipoComprobante"],
    },
    ocupacion: {
        nombre: "Ocupación de habitaciones",
        descripcion: "Ocupación por categoría, estado actual y evolución de habitaciones ocupadas.",
        icono: "bi-door-open",
        color: "amber",
        filtros: ["fechas", "periodo", "categoriaHabitacion", "estadoHabitacion", "empresa", "usuario"],
    },
    caja: {
        nombre: "Ingresos y egresos de caja",
        descripcion: "Movimientos de caja por concepto, método de pago, caja y responsable.",
        icono: "bi-cash-coin",
        color: "cyan",
        filtros: ["fechas", "periodo", "usuario", "metodoPago", "tipoMovimiento", "concepto", "caja", "afectaEfectivo"],
    },
    comprobantes: {
        nombre: "Comprobantes emitidos",
        descripcion: "Facturas y boletas emitidas, clientes, empresas y montos.",
        icono: "bi-receipt",
        color: "indigo",
        filtros: ["fechas", "periodo", "tipoComprobante", "cliente", "empresa", "usuario"],
    },
    ventas: {
        nombre: "Ventas por producto y categoría",
        descripcion: "Ranking de productos, categorías, unidades vendidas e ingresos.",
        icono: "bi-bag-check",
        color: "rose",
        filtros: ["fechas", "periodo", "categoriaProducto", "producto", "cliente", "empresa", "usuario"],
    },
    clientes: {
        nombre: "Ranking de clientes y empresas",
        descripcion: "Clientes con mayor hospedaje, consumo, noches y recurrencia.",
        icono: "bi-people",
        color: "violet",
        filtros: ["fechas", "empresa", "usuario", "agrupacionClientes"],
    },
    tendencias: {
        nombre: "Tendencias y estacionalidad",
        descripcion: "Evolución de reservas, ingresos, ocupación, ADR y RevPAR por período.",
        icono: "bi-graph-up-arrow",
        color: "teal",
        filtros: ["fechas", "periodo", "categoriaHabitacion", "empresa", "usuario"],
    },
    personalizado: {
        nombre: "Constructor personalizado",
        descripcion: "Elige el conjunto de datos, la métrica, la agrupación y el gráfico.",
        icono: "bi-sliders2",
        color: "gold",
        filtros: ["fechas", "cliente", "empresa", "usuario"],
        personalizado: true,
    },
};

export const CATEGORIAS_REPORTES = [
    {
        clave: "generales",
        nombre: "Generales",
        descripcion: "Panorama integral del hotel y trazabilidad del sistema.",
        icono: "bi-grid-1x2",
        reportes: ["resumen", "auditoria"],
    },
    {
        clave: "operativos",
        nombre: "Operativos",
        descripcion: "Reservas, ocupación, caja y comprobantes del día a día.",
        icono: "bi-kanban",
        reportes: ["reservas", "ocupacion", "caja", "comprobantes"],
    },
    {
        clave: "estadisticos",
        nombre: "Estadísticos",
        descripcion: "Rankings, ventas y tendencias para la toma de decisiones.",
        icono: "bi-bar-chart-line",
        reportes: ["ventas", "clientes", "tendencias"],
    },
    {
        clave: "personalizados",
        nombre: "Personalizados",
        descripcion: "Construye tu propio reporte con las variables que necesites.",
        icono: "bi-sliders2",
        reportes: ["personalizado"],
    },
];

export const DATASETS_PERSONALIZADOS = {
    reservas: {
        nombre: "Reservas y hospedaje",
        descripcion: "Recepciones con cliente, habitación, noches y cobros.",
        fecha: "fecha",
        filtros: ["categoriaHabitacion", "estadoReserva"],
        metricas: [
            { clave: "total", nombre: "Total hospedaje", tipo: "moneda" },
            { clave: "pagado", nombre: "Total pagado", tipo: "moneda" },
            { clave: "saldo", nombre: "Saldo pendiente", tipo: "moneda" },
            { clave: "noches", nombre: "Noches", tipo: "numero" },
            { clave: "__conteo", nombre: "Cantidad de registros", tipo: "numero" },
        ],
        dimensiones: [
            { clave: "periodo", nombre: "Período" },
            { clave: "cliente", nombre: "Persona / cliente" },
            { clave: "empresa", nombre: "Empresa" },
            { clave: "categoria", nombre: "Categoría de habitación" },
            { clave: "habitacion", nombre: "Habitación" },
            { clave: "responsable", nombre: "Responsable" },
            { clave: "estado", nombre: "Estado" },
            { clave: "tipo", nombre: "Tipo de comprobante" },
        ],
        columnas: [
            { clave: "fecha", nombre: "Entrada", tipo: "fecha" },
            { clave: "cliente", nombre: "Cliente", tipo: "texto" },
            { clave: "documento", nombre: "Documento", tipo: "texto" },
            { clave: "empresa", nombre: "Empresa", tipo: "texto" },
            { clave: "habitacion", nombre: "Habitación", tipo: "texto" },
            { clave: "categoria", nombre: "Categoría", tipo: "texto" },
            { clave: "noches", nombre: "Noches", tipo: "numero" },
            { clave: "total", nombre: "Total", tipo: "moneda" },
            { clave: "pagado", nombre: "Pagado", tipo: "moneda" },
            { clave: "saldo", nombre: "Saldo", tipo: "moneda" },
            { clave: "estado", nombre: "Estado", tipo: "texto" },
            { clave: "responsable", nombre: "Responsable", tipo: "texto" },
        ],
    },
    ventas: {
        nombre: "Ventas de productos",
        descripcion: "Detalle de productos vendidos por recepción.",
        fecha: "fecha",
        filtros: ["categoriaProducto", "producto"],
        metricas: [
            { clave: "importe", nombre: "Importe vendido", tipo: "moneda" },
            { clave: "cantidad", nombre: "Unidades", tipo: "numero" },
            { clave: "__conteo", nombre: "Cantidad de registros", tipo: "numero" },
        ],
        dimensiones: [
            { clave: "periodo", nombre: "Período" },
            { clave: "producto", nombre: "Producto" },
            { clave: "categoria", nombre: "Categoría" },
            { clave: "cliente", nombre: "Persona / cliente" },
            { clave: "empresa", nombre: "Empresa" },
            { clave: "habitacion", nombre: "Habitación" },
            { clave: "responsable", nombre: "Responsable" },
        ],
        columnas: [
            { clave: "fecha", nombre: "Fecha", tipo: "fecha" },
            { clave: "producto", nombre: "Producto", tipo: "texto" },
            { clave: "categoria", nombre: "Categoría", tipo: "texto" },
            { clave: "cliente", nombre: "Cliente", tipo: "texto" },
            { clave: "empresa", nombre: "Empresa", tipo: "texto" },
            { clave: "cantidad", nombre: "Cantidad", tipo: "numero" },
            { clave: "importe", nombre: "Importe", tipo: "moneda" },
            { clave: "responsable", nombre: "Responsable", tipo: "texto" },
        ],
    },
    caja: {
        nombre: "Movimientos de caja",
        descripcion: "Ingresos y egresos con concepto, método y responsable.",
        fecha: "fecha",
        filtros: ["metodoPago", "tipoMovimiento", "concepto", "caja"],
        metricas: [
            { clave: "monto", nombre: "Monto", tipo: "moneda" },
            { clave: "__conteo", nombre: "Cantidad de registros", tipo: "numero" },
        ],
        dimensiones: [
            { clave: "periodo", nombre: "Período" },
            { clave: "tipo", nombre: "Tipo de movimiento" },
            { clave: "concepto", nombre: "Concepto" },
            { clave: "metodo", nombre: "Método de pago" },
            { clave: "responsable", nombre: "Responsable" },
            { clave: "caja", nombre: "Caja" },
        ],
        columnas: [
            { clave: "fecha", nombre: "Fecha", tipo: "fecha" },
            { clave: "tipo", nombre: "Tipo", tipo: "texto" },
            { clave: "concepto", nombre: "Concepto", tipo: "texto" },
            { clave: "metodo", nombre: "Método", tipo: "texto" },
            { clave: "descripcion", nombre: "Descripción", tipo: "texto" },
            { clave: "monto", nombre: "Monto", tipo: "moneda" },
            { clave: "afectaEfectivo", nombre: "Afecta efectivo", tipo: "texto" },
            { clave: "responsable", nombre: "Responsable", tipo: "texto" },
        ],
    },
    comprobantes: {
        nombre: "Comprobantes emitidos",
        descripcion: "Facturas y boletas con cliente y monto facturado.",
        fecha: "fecha",
        filtros: ["tipoComprobante"],
        metricas: [
            { clave: "total", nombre: "Monto facturado", tipo: "moneda" },
            { clave: "__conteo", nombre: "Cantidad de registros", tipo: "numero" },
        ],
        dimensiones: [
            { clave: "periodo", nombre: "Período" },
            { clave: "tipo", nombre: "Tipo de comprobante" },
            { clave: "cliente", nombre: "Persona / cliente" },
            { clave: "empresa", nombre: "Empresa" },
            { clave: "responsable", nombre: "Responsable" },
        ],
        columnas: [
            { clave: "fecha", nombre: "Emisión", tipo: "fecha" },
            { clave: "tipo", nombre: "Tipo", tipo: "texto" },
            { clave: "serieNumero", nombre: "Serie - número", tipo: "texto" },
            { clave: "cliente", nombre: "Cliente", tipo: "texto" },
            { clave: "empresa", nombre: "Empresa", tipo: "texto" },
            { clave: "total", nombre: "Total", tipo: "moneda" },
            { clave: "responsable", nombre: "Responsable", tipo: "texto" },
        ],
    },
    auditoria: {
        nombre: "Auditoría del sistema",
        descripcion: "Eventos registrados por usuario, acción y tabla.",
        fecha: "fecha",
        filtros: ["accion", "tablaAuditada"],
        metricas: [{ clave: "__conteo", nombre: "Cantidad de registros", tipo: "numero" }],
        dimensiones: [
            { clave: "periodo", nombre: "Período" },
            { clave: "usuario", nombre: "Usuario" },
            { clave: "accion", nombre: "Acción" },
            { clave: "tabla", nombre: "Tabla" },
            { clave: "terminal", nombre: "Terminal" },
        ],
        columnas: [
            { clave: "fecha", nombre: "Fecha", tipo: "fecha" },
            { clave: "usuario", nombre: "Usuario", tipo: "texto" },
            { clave: "tabla", nombre: "Tabla", tipo: "texto" },
            { clave: "accion", nombre: "Acción", tipo: "texto" },
            { clave: "registro", nombre: "ID registro", tipo: "numero" },
            { clave: "terminal", nombre: "Terminal", tipo: "texto" },
        ],
    },
};

export const TIPOS_GRAFICO_PERSONALIZADO = [
    { value: "barras", label: "Barras verticales" },
    { value: "barras-horizontales", label: "Barras horizontales" },
    { value: "lineas", label: "Líneas" },
    { value: "donut", label: "Dona" },
];

export const AGREGACIONES_PERSONALIZADAS = [
    { value: "suma", label: "Suma" },
    { value: "promedio", label: "Promedio" },
    { value: "conteo", label: "Conteo" },
    { value: "maximo", label: "Máximo" },
    { value: "minimo", label: "Mínimo" },
];
