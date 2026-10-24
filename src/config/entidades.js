// ============================================================
// CONFIGURACIÓN DE LOS CRUD  (único archivo que hay que ajustar)
// Usa las TABLAS REALES de la base de datos del proyecto (Supabase).
//
//   tabla  -> nombre real de la tabla
//   pk     -> llave primaria de esa tabla
//   name   -> nombre real de la columna
//   type   -> text | number | email | tel | date | select
//   ref    -> llave foránea: { tabla, pk, label(fila, refs) }
//   oculto -> no se muestra; se envía con el valor "defecto"
//
// Las columnas de auditoría (usucre, pccre, feccre, usumod, pcmod,
// fecmod, estado) las completa automáticamente crudService.js.
// Eliminar = baja lógica (estado = '0'), como en el resto del sistema.
// ============================================================

const nombrePersona = (r) =>
  `${r.nombre} ${r.ap_paterno} ${r.ap_materno || ""} (${r.n_documento})`.replace("  ", " ");

export const ENTIDADES = {
  // HUÉSPEDES -> tabla persona (el cliente se vincula a una persona)
  huespedes: {
    titulo: "Huéspedes",
    descripcion: "Datos personales de los huéspedes (tabla persona).",
    icono: "bi-people",
    consultaDocumento: "dni",
    tabla: "persona",
    pk: "id_persona",
    buscarEn: ["n_documento", "nombre", "ap_paterno", "ap_materno", "email", "celular"],
    filtros: ["id_tipoidentidad"],
    campos: [
      { name: "id_tipoidentidad", label: "Tipo de documento", type: "select", required: true,
        ref: { tabla: "tipo_identidad", pk: "id_tipoidentidad", label: (r) => r.abreviatura } },
      { name: "n_documento", label: "N° de documento", type: "text", required: true,
        pattern: /^\d{8,12}$/, msg: "El documento debe tener entre 8 y 12 dígitos." },
      { name: "nombre", label: "Nombres", type: "text", required: true },
      { name: "ap_paterno", label: "Apellido paterno", type: "text", required: true },
      { name: "ap_materno", label: "Apellido materno", type: "text" },
      { name: "f_nacimiento", label: "Fecha de nacimiento", type: "date" },
      { name: "email", label: "Correo", type: "email" },
      { name: "celular", label: "Celular", type: "tel", pattern: /^\d{9}$/, msg: "El celular debe tener 9 dígitos." },
      { name: "genero", label: "Género", type: "select", options: [{ value: "M", label: "Masculino" }, { value: "F", label: "Femenino" }] },
      { name: "direccion", label: "Dirección", type: "text" },
      { name: "id_distrito", label: "Distrito", type: "select", required: true,
        ref: { tabla: "distrito", pk: "id_distrito", label: (r) => r.d_distrito } },
    ],
  },

  // HABITACIONES -> tabla habitacion
  habitaciones: {
    titulo: "Habitaciones",
    descripcion: "Inventario de habitaciones, tarifas y estados.",
    icono: "bi-door-open",
    tabla: "habitacion",
    pk: "id_habitacion",
    buscarEn: ["numero", "detalle"],
    filtros: ["id_categoria", "id_estadohabitacion"],
    campos: [
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "id_categoria", label: "Categoría", type: "select", required: true,
        ref: { tabla: "categoria_habitacion", pk: "id_categoria", label: (r) => r.descripcion } },
      { name: "id_piso", label: "Piso", type: "select", required: true,
        ref: { tabla: "piso", pk: "id_piso", label: (r) => r.descripcion } },
      { name: "id_estadohabitacion", label: "Estado", type: "select", required: true,
        ref: { tabla: "estado_habitacion", pk: "id_estadohabitacion", label: (r) => r.descripcion } },
      { name: "precio", label: "Precio por noche (S/)", type: "number", required: true, min: 0 },
      { name: "detalle", label: "Detalle", type: "text" },
      { name: "f_creacion", type: "date", oculto: true, defecto: () => new Date().toISOString() },
    ],
  },

  // EMPLEADOS -> tabla empleado
  empleados: {
    titulo: "Empleados",
    descripcion: "Personal del hotel: contrato, cargo y planilla.",
    icono: "bi-person-badge",
    tabla: "empleado",
    pk: "id_empleado",
    buscarEn: [],   // el nombre vive en la tabla persona (otra tabla); sin búsqueda de texto propia
    filtros: ["id_cargo", "turno"],
    campos: [
      { name: "id_persona", label: "Persona", type: "select", required: true,
        ref: { tabla: "persona", pk: "id_persona", label: nombrePersona } },
      { name: "id_cargo", label: "Cargo", type: "select", required: true,
        ref: { tabla: "cargo", pk: "id_cargo", label: (r) => r.n_cargo } },
      { name: "id_contrato", label: "Contrato", type: "select", required: true,
        ref: { tabla: "contrato", pk: "id_contrato", label: (r) => r.n_contrato } },
      { name: "salario", label: "Salario (S/)", type: "number", required: true, min: 0 },
      { name: "turno", label: "Turno", type: "select", required: true, options: ["MANANA", "TARDE", "NOCHE", "COMPLETO"] },
      { name: "fondo_pension", label: "Fondo de pensión", type: "select", options: ["AFP", "ONP"] },
      { name: "n_hijos", label: "N° de hijos", type: "number", min: 0 },
      { name: "essalud", label: "EsSalud", type: "select", options: ["SI", "NO"] },
    ],
  },

  // SERVICIOS ADICIONALES -> tabla producto (consumos / productos del hotel)
  servicios: {
    titulo: "Productos y servicios",
    descripcion: "Productos y consumos adicionales con su precio (tabla producto).",
    icono: "bi-cup-hot",
    tabla: "producto",
    pk: "id_producto",
    buscarEn: ["n_producto", "marca", "detalle"],
    filtros: ["id_categoriaproducto"],
    campos: [
      { name: "n_producto", label: "Nombre", type: "text", required: true },
      { name: "id_categoriaproducto", label: "Categoría", type: "select", required: true,
        ref: { tabla: "categoria_producto", pk: "id_categoriaproducto", label: (r) => r.n_categoriaproducto } },
      { name: "precio", label: "Precio (S/)", type: "number", required: true, min: 0 },
      { name: "marca", label: "Marca", type: "text" },
      { name: "detalle", label: "Detalle", type: "text" },
    ],
  },

  // RESERVAS / COMPROBANTES -> tabla recepcion (check-in con su documento)
  reservas: {
    titulo: "Reservas",
    descripcion: "Recepción de huéspedes: habitación, fechas y pagos (tabla recepcion).",
    icono: "bi-calendar-check",
    tabla: "recepcion",
    pk: "id_recepcion",
    buscarEn: ["documento"],
    filtros: ["id_metodopago", "tipodocumento"],
    precargar: [{ tabla: "persona", pk: "id_persona" }],   // para mostrar el nombre del cliente
    fechas: ["f_entrada", "f_salida"],
    campos: [
      { name: "id_cliente", label: "Cliente", type: "select", required: true,
        ref: { tabla: "cliente", pk: "id_cliente",
               label: (r, refs) => {
                 const p = (refs.persona || []).find((x) => x.id_persona === r.id_persona);
                 return p ? nombrePersona(p) : `Cliente #${r.id_cliente}`;
               } } },
      { name: "id_habitacion", label: "Habitación", type: "select", required: true,
        ref: { tabla: "habitacion", pk: "id_habitacion", label: (r) => `Hab. ${r.numero}` } },
      { name: "id_usuario", label: "Atendido por", type: "select", required: true,
        ref: { tabla: "usuario", pk: "id_usuario", label: (r) => r.logeo } },
      { name: "id_metodopago", label: "Método de pago", type: "select", required: true,
        ref: { tabla: "metodo_pago", pk: "id_metodopago", label: (r) => r.n_metodopago } },
      { name: "f_entrada", label: "Fecha de entrada", type: "date", required: true },
      { name: "f_salida", label: "Fecha de salida", type: "date", required: true },
      { name: "d_inicial", label: "Monto inicial (S/)", type: "number", required: true, min: 0 },
      { name: "adelanto", label: "Adelanto (S/)", type: "number", min: 0 },
      { name: "t_pagado", label: "Total pagado (S/)", type: "number", min: 0 },
      { name: "tipodocumento", label: "Comprobante", type: "select", required: true, options: ["BOLETA", "FACTURA"] },
      { name: "documento", label: "N° de documento", type: "text" },
      { name: "d_asistente", type: "number", oculto: true, defecto: 0 },
      { name: "contarjeta", type: "number", oculto: true, defecto: 0 },
      { name: "totaldeuda", type: "number", oculto: true, defecto: 0 },
    ],
  },

  // PROVINCIA -> tabla provincia (ubigeo)
  provincia: {
    titulo: "Provincias",
    descripcion: "Provincias del país, vinculadas a un departamento (ubigeo).",
    icono: "bi-map",
    tabla: "provincia",
    pk: "id_provincia",
    buscarEn: ["n_provincia"],
    filtros: ["id_departamento"],
    campos: [
      { name: "id_departamento", label: "Departamento", type: "select", required: true,
        ref: { tabla: "departamento", pk: "id_departamento", label: (r) => r.n_departamento } },
      { name: "n_provincia", label: "Nombre", type: "text", required: true },
    ],
  },

  // DEPARTAMENTO -> tabla departamento (ubigeo)
  departamento: {
    titulo: "Departamentos",
    descripcion: "Departamentos del país para la ubicación de personas y empresas.",
    icono: "bi-geo-alt",
    tabla: "departamento",
    pk: "id_departamento",
    buscarEn: ["n_departamento"],
    campos: [
      { name: "n_departamento", label: "Nombre", type: "text", required: true },
    ],
  },

  // EMPRESA -> tabla empresa (clientes corporativos / facturación)
  empresa: {
    titulo: "Empresas",
    descripcion: "Empresas registradas para facturación y convenios.",
    icono: "bi-building",
    consultaDocumento: "ruc",
    tabla: "empresa",
    pk: "id_empresa",
    buscarEn: ["ruc", "razon_social", "direccion", "telefono"],
    campos: [
      { name: "ruc", label: "RUC", type: "text", required: true,
        pattern: /^\d{11}$/, msg: "El RUC debe tener 11 dígitos." },
      { name: "razon_social", label: "Razón social", type: "text", required: true },
      { name: "direccion", label: "Dirección", type: "text" },
      { name: "telefono", label: "Teléfono", type: "tel" },
    ],
  },

  // TIPO DE USUARIO -> tabla tipo_usuario
  tipo_usuario: {
    titulo: "Tipos de usuario",
    descripcion: "Perfiles de acceso que puede tener un usuario del sistema.",
    icono: "bi-person-vcard",
    tabla: "tipo_usuario",
    pk: "id_tipousuario",
    buscarEn: ["n_tipousuario"],
    campos: [
      { name: "n_tipousuario", label: "Nombre", type: "text", required: true },
    ],
  },

  // CAJA -> tabla caja
  caja: {
    titulo: "Cajas",
    descripcion: "Cajas y terminales de cobro del hotel.",
    icono: "bi-cash-stack",
    tabla: "caja",
    pk: "id_caja",
    buscarEn: ["n_caja", "descripcion", "ubicacion", "serie_terminal"],
    filtros: ["moneda", "aperturada"],
    campos: [
      { name: "n_caja", label: "Nombre", type: "text", required: true },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "ubicacion", label: "Ubicación", type: "text" },
      { name: "serie_terminal", label: "Serie de terminal", type: "text" },
      { name: "moneda", label: "Moneda", type: "select", required: true,
        options: [{ value: "PEN", label: "Soles (PEN)" }, { value: "USD", label: "Dólares (USD)" }] },
      { name: "monto_base", label: "Monto base (S/)", type: "number", required: true, min: 0 },
      { name: "aperturada", oculto: true, defecto: "0" },
      { name: "f_creacion", type: "date", oculto: true, defecto: () => new Date().toISOString() },
    ],
  },

  // TIPO DE MOVIMIENTO DE CAJA -> tabla tipo_movimiento_caja
  tipo_movimiento_caja: {
    titulo: "Tipos de movimiento de caja",
    descripcion: "Clasificación de los movimientos de caja (ingresos y egresos).",
    icono: "bi-arrow-left-right",
    tabla: "tipo_movimiento_caja",
    pk: "id_tipomovimiento",
    buscarEn: ["n_tipomovimiento", "abreviatura"],
    filtros: ["signo"],
    campos: [
      { name: "n_tipomovimiento", label: "Nombre", type: "text", required: true },
      { name: "abreviatura", label: "Abreviatura", type: "text", required: true },
      { name: "signo", label: "Signo", type: "select", required: true,
        options: [{ value: "+", label: "Ingreso (+)" }, { value: "-", label: "Egreso (-)" }] },
      { name: "f_creacion", type: "date", oculto: true, defecto: () => new Date().toISOString() },
    ],
  },

  // MÓDULO -> tabla modulo (opciones del menú del sistema)
  modulo: {
    titulo: "Módulos",
    descripcion: "Módulos u opciones que componen el menú del sistema.",
    icono: "bi-grid",
    tabla: "modulo",
    pk: "id_modulo",
    buscarEn: ["n_modulo", "descripcion"],
    campos: [
      { name: "n_modulo", label: "Nombre", type: "text", required: true },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "icono", label: "Ícono (clase Bootstrap)", type: "text" },
      { name: "orden", label: "Orden", type: "number", required: true, min: 0 },
    ],
  },

  // ROL -> tabla rol
  rol: {
    titulo: "Roles",
    descripcion: "Roles y niveles de acceso del sistema.",
    icono: "bi-shield-lock",
    tabla: "rol",
    pk: "id_rol",
    buscarEn: ["n_rol", "descripcion"],
    campos: [
      { name: "n_rol", label: "Nombre", type: "text", required: true },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "nivel", label: "Nivel", type: "number", required: true, min: 1 },
      { name: "f_creacion", type: "date", oculto: true, defecto: () => new Date().toISOString() },
    ],
  },

  // FACTURA -> tabla factura (comprobante electrónico)
  factura: {
    titulo: "Facturas",
    descripcion: "Comprobantes de factura emitidos por recepción.",
    icono: "bi-file-earmark-text",
    tabla: "factura",
    pk: "id_factura",
    buscarEn: ["numero", "serie"],
    campos: [
      { name: "id_recepcion", label: "Recepción", type: "select", required: true,
        ref: { tabla: "recepcion", pk: "id_recepcion", label: (r) => `Recepción #${r.id_recepcion}` } },
      { name: "f_emision", label: "Fecha de emisión", type: "date", required: true },
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "serie", label: "Serie", type: "text", required: true },
    ],
  },

  // BOLETA -> tabla boleta (comprobante electrónico)
  boleta: {
    titulo: "Boletas",
    descripcion: "Comprobantes de boleta emitidos por recepción.",
    icono: "bi-receipt",
    tabla: "boleta",
    pk: "id_boleta",
    buscarEn: ["numero", "serie"],
    campos: [
      { name: "id_recepcion", label: "Recepción", type: "select", required: true,
        ref: { tabla: "recepcion", pk: "id_recepcion", label: (r) => `Recepción #${r.id_recepcion}` } },
      { name: "f_emision", label: "Fecha de emisión", type: "date", required: true },
      { name: "numero", label: "Número", type: "text", required: true },
      { name: "serie", label: "Serie", type: "text", required: true },
    ],
  },

  // VENTA -> tabla venta (consumos de una recepción)
  venta: {
    titulo: "Ventas",
    descripcion: "Ventas de productos y servicios asociadas a una recepción.",
    icono: "bi-cash-coin",
    tabla: "venta",
    pk: "id_venta",
    buscarEn: [],
    campos: [
      { name: "id_recepcion", label: "Recepción", type: "select", required: true,
        ref: { tabla: "recepcion", pk: "id_recepcion", label: (r) => `Recepción #${r.id_recepcion}` } },
      { name: "total", label: "Total (S/)", type: "number", required: true, min: 0 },
    ],
  },

  // DETALLE_VENTA -> tabla detalle_venta
  detalle_venta: {
    titulo: "Detalle de ventas",
    descripcion: "Productos y cantidades que componen cada venta.",
    icono: "bi-list-check",
    tabla: "detalle_venta",
    pk: "id_detalle",
    buscarEn: [],
    filtros: ["id_venta", "id_producto"],
    campos: [
      { name: "id_venta", label: "Venta", type: "select", required: true,
        ref: { tabla: "venta", pk: "id_venta", label: (r) => `Venta #${r.id_venta}` } },
      { name: "id_producto", label: "Producto", type: "select", required: true,
        ref: { tabla: "producto", pk: "id_producto", label: (r) => r.n_producto } },
      { name: "cantidad", label: "Cantidad", type: "number", required: true, min: 1 },
      { name: "sub_total", label: "Subtotal (S/)", type: "number", required: true, min: 0 },
    ],
  },

  // APERTURA_CAJA -> tabla apertura_caja (turnos de caja)
  apertura_caja: {
    titulo: "Aperturas de caja",
    descripcion: "Apertura, cierre y cuadre de los turnos de caja.",
    icono: "bi-box-arrow-in-right",
    tabla: "apertura_caja",
    pk: "id_aperturacaja",
    soloLectura: true,
    buscarEn: ["numero_turno", "observacion"],
    filtros: ["id_caja", "situacion", "id_usuario"],
    campos: [
      { name: "id_caja", label: "Caja", type: "select", required: true,
        ref: { tabla: "caja", pk: "id_caja", label: (r) => r.n_caja } },
      { name: "id_usuario", label: "Usuario apertura", type: "select", required: true,
        ref: { tabla: "usuario", pk: "id_usuario", label: (r) => r.logeo } },
      { name: "id_usuariocierre", label: "Usuario cierre", type: "select",
        ref: { tabla: "usuario", pk: "id_usuario", label: (r) => r.logeo } },
      { name: "numero_turno", label: "N° de turno", type: "text", required: true },
      { name: "f_apertura", label: "Fecha de apertura", type: "date", required: true },
      { name: "f_cierre", label: "Fecha de cierre", type: "date" },
      { name: "monto_inicial", label: "Monto inicial (S/)", type: "number", required: true, min: 0 },
      { name: "total_ingresos", label: "Total ingresos (S/)", type: "number", min: 0 },
      { name: "total_egresos", label: "Total egresos (S/)", type: "number", min: 0 },
      { name: "monto_sistema", label: "Monto sistema (S/)", type: "number", min: 0 },
      { name: "monto_declarado", label: "Monto declarado (S/)", type: "number", min: 0 },
      { name: "diferencia", label: "Diferencia (S/)", type: "number" },
      { name: "situacion", label: "Situación", type: "select", required: true,
        options: [{ value: "A", label: "Abierta" }, { value: "C", label: "Cerrada" }] },
      { name: "observacion", label: "Observación", type: "text" },
    ],
  },

  // CONCEPTO_CAJA -> tabla concepto_caja
  concepto_caja: {
    titulo: "Conceptos de caja",
    descripcion: "Conceptos que clasifican los ingresos y egresos de caja.",
    icono: "bi-tags",
    tabla: "concepto_caja",
    pk: "id_concepto",
    buscarEn: ["n_concepto", "descripcion"],
    filtros: ["id_tipomovimiento", "afecta_efectivo"],
    campos: [
      { name: "id_tipomovimiento", label: "Tipo de movimiento", type: "select", required: true,
        ref: { tabla: "tipo_movimiento_caja", pk: "id_tipomovimiento", label: (r) => r.n_tipomovimiento } },
      { name: "n_concepto", label: "Nombre", type: "text", required: true },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "afecta_efectivo", label: "Afecta efectivo", type: "select", required: true,
        options: [{ value: "S", label: "Sí" }, { value: "N", label: "No" }] },
    ],
  },

  // MOVIMIENTO_CAJA -> tabla movimiento_caja (pagos e ingresos/egresos)
  movimiento_caja: {
    titulo: "Movimientos de caja",
    descripcion: "Ingresos y egresos registrados en los turnos de caja.",
    icono: "bi-arrow-left-right",
    tabla: "movimiento_caja",
    pk: "id_movimientocaja",
    soloLectura: true,
    buscarEn: ["numero_operacion", "documento", "descripcion", "terminal"],
    filtros: ["id_aperturacaja", "id_tipomovimiento", "id_concepto", "id_metodopago", "afecta_efectivo"],
    campos: [
      { name: "id_aperturacaja", label: "Apertura de caja", type: "select", required: true,
        ref: { tabla: "apertura_caja", pk: "id_aperturacaja", label: (r) => `Turno ${r.numero_turno}` } },
      { name: "id_tipomovimiento", label: "Tipo de movimiento", type: "select", required: true,
        ref: { tabla: "tipo_movimiento_caja", pk: "id_tipomovimiento", label: (r) => r.n_tipomovimiento } },
      { name: "id_concepto", label: "Concepto", type: "select", required: true,
        ref: { tabla: "concepto_caja", pk: "id_concepto", label: (r) => r.n_concepto } },
      { name: "id_metodopago", label: "Método de pago", type: "select", required: true,
        ref: { tabla: "metodo_pago", pk: "id_metodopago", label: (r) => r.n_metodopago } },
      { name: "id_usuario", label: "Usuario", type: "select", required: true,
        ref: { tabla: "usuario", pk: "id_usuario", label: (r) => r.logeo } },
      { name: "id_recepcion", label: "Recepción", type: "select",
        ref: { tabla: "recepcion", pk: "id_recepcion", label: (r) => `Recepción #${r.id_recepcion}` } },
      { name: "id_venta", label: "Venta", type: "select",
        ref: { tabla: "venta", pk: "id_venta", label: (r) => `Venta #${r.id_venta}` } },
      { name: "numero_operacion", label: "N° de operación", type: "text" },
      { name: "documento", label: "Documento", type: "text" },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "monto", label: "Monto (S/)", type: "number", required: true, min: 0 },
      { name: "afecta_efectivo", label: "Afecta efectivo", type: "select", required: true,
        options: [{ value: "S", label: "Sí" }, { value: "N", label: "No" }] },
      { name: "f_movimiento", label: "Fecha del movimiento", type: "date", required: true },
      { name: "ip", label: "IP", type: "text" },
      { name: "terminal", label: "Terminal", type: "text" },
    ],
  },

  // ROL_PERMISO -> tabla rol_permiso
  rol_permiso: {
    titulo: "Permisos por rol",
    descripcion: "Permisos concedidos a cada rol del sistema.",
    icono: "bi-key",
    tabla: "rol_permiso",
    pk: "id_rolpermiso",
    buscarEn: [],
    filtros: ["id_rol", "id_permiso", "concedido"],
    campos: [
      { name: "id_rol", label: "Rol", type: "select", required: true,
        ref: { tabla: "rol", pk: "id_rol", label: (r) => r.n_rol } },
      { name: "id_permiso", label: "Permiso", type: "select", required: true,
        ref: { tabla: "permiso", pk: "id_permiso", label: (r) => r.n_permiso } },
      { name: "concedido", label: "Concedido", type: "select", required: true,
        options: [{ value: "1", label: "Sí" }, { value: "0", label: "No" }] },
    ],
  },

  // USUARIO_ROL -> tabla usuario_rol
  usuario_rol: {
    titulo: "Roles de usuarios",
    descripcion: "Asignación vigente de roles a los usuarios del sistema.",
    icono: "bi-person-check",
    tabla: "usuario_rol",
    pk: "id_usuariorol",
    buscarEn: [],
    filtros: ["id_usuario", "id_rol", "vigente"],
    campos: [
      { name: "id_usuario", label: "Usuario", type: "select", required: true,
        ref: { tabla: "usuario", pk: "id_usuario", label: (r) => r.logeo } },
      { name: "id_rol", label: "Rol", type: "select", required: true,
        ref: { tabla: "rol", pk: "id_rol", label: (r) => r.n_rol } },
      { name: "f_asignacion", label: "Fecha de asignación", type: "date", required: true },
      { name: "vigente", label: "Vigente", type: "select", required: true,
        options: [{ value: "1", label: "Sí" }, { value: "0", label: "No" }] },
    ],
  },

  // AUDITORIA -> tabla auditoria (solo lectura: es un registro histórico)
  auditoria: {
    titulo: "Auditoría",
    descripcion: "Historial de operaciones realizadas sobre las tablas del sistema.",
    icono: "bi-clock-history",
    tabla: "auditoria",
    pk: "id_auditoria",
    soloLectura: true,
    buscarEn: ["n_tabla", "accion", "ip", "terminal"],
    filtros: ["id_usuario", "accion"],
    campos: [
      { name: "id_usuario", label: "Usuario", type: "select",
        ref: { tabla: "usuario", pk: "id_usuario", label: (r) => r.logeo } },
      { name: "n_tabla", label: "Tabla", type: "text" },
      { name: "accion", label: "Acción", type: "select",
        options: ["INSERT", "UPDATE", "DELETE"] },
      { name: "id_registro", label: "ID de registro", type: "number" },
      { name: "valor_anterior", label: "Valor anterior", type: "text" },
      { name: "valor_nuevo", label: "Valor nuevo", type: "text" },
      { name: "f_evento", label: "Fecha del evento", type: "date" },
      { name: "ip", label: "IP", type: "text" },
      { name: "terminal", label: "Terminal", type: "text" },
    ],
  },
};
