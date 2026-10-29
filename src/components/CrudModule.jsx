import { useCallback, useEffect, useRef, useState } from "react";

import { ENTIDADES } from "../config/entidades";
import {
    listar,
    listarPaginado,
    POR_PAGINA,
    insertar,
    actualizar,
    eliminar,
    buscarPersonaPorDni,
    guardarEmpleadoConPersona,
} from "../services/crudService";
import { consultarDocumento } from "../services/factilizaService";
import { invalidarCatalogosReportes } from "../services/reportesService";

// Módulo CRUD genérico: sirve para cualquier entidad de config/entidades.js
const CrudModule = ({ entidadKey }) => {

    const entidad = ENTIDADES[entidadKey];
    const { tabla, pk, campos } = entidad;
    const visibles = campos.filter((c) => !c.oculto);
    const soloLectura = Boolean(entidad.soloLectura);
    const columnas = visibles.length + (soloLectura ? 0 : 1);

    // Opciones: acepta "TEXTO" o { value, label }
    const normalizar = (o) =>
        typeof o === "string" ? { value: o, label: o } : o;

    const [filas, setFilas] = useState([]);
    const [refs, setRefs] = useState({});
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState("");
    const [errorRefs, setErrorRefs] = useState("");
    const solicitudActual = useRef(0);

    // Paginación, búsqueda y filtros
    const [pagina, setPagina] = useState(1);
    const [pageSize, setPageSize] = useState(POR_PAGINA);
    const [total, setTotal] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [busqueda, setBusqueda] = useState("");
    const [busquedaDebounced, setBusquedaDebounced] = useState("");
    const [filtros, setFiltros] = useState({});

    const [formAbierto, setFormAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [valores, setValores] = useState({});
    const [busquedasReferencia, setBusquedasReferencia] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [consultandoDocumento, setConsultandoDocumento] = useState(false);
    const [datosPersonaEmpleado, setDatosPersonaEmpleado] = useState({
        n_documento: "",
        nombre: "",
        ap_paterno: "",
        ap_materno: "",
        f_nacimiento: "",
        email: "",
        celular: "",
        genero: "",
        direccion: "",
        id_distrito: "",
    });
    const [personaEmpleadoExistente, setPersonaEmpleadoExistente] = useState(false);

    const [toast, setToast] = useState(null);

    const avisar = (mensaje, ok = true) => {
        setToast({ mensaje, ok });
        setTimeout(() => setToast(null), 3000);
    };

    // ---------- Leer (tablas relacionadas: una sola vez, en paralelo) ----------
    const cargarRefs = useCallback(async () => {
        const lista = [
            ...campos.filter((c) => c.ref).map((c) => c.ref),
            ...(entidad.precargar || []),
        ];
        const unicas = [];
        const vistas = new Set();
        for (const r of lista) {
            if (!vistas.has(r.tabla)) {
                vistas.add(r.tabla);
                unicas.push(r);
            }
        }
        const resultados = await Promise.all(unicas.map((r) => listar(r.tabla, r.pk)));
        const nuevasRefs = {};
        unicas.forEach((r, i) => {
            nuevasRefs[r.tabla] = resultados[i];
        });
        setRefs(nuevasRefs);
        setErrorRefs("");
    }, [campos, entidad]);

    useEffect(() => {
        cargarRefs().catch((e) =>
            setErrorRefs(`No se pudieron leer las tablas relacionadas: ${e.message}`)
        );
    }, [cargarRefs]);

    // ---------- Leer (página del listado) ----------
    const cargarPagina = useCallback(async () => {
        const solicitud = ++solicitudActual.current;
        setCargando(true);
        setErrorCarga("");
        try {
            const resultado = await listarPaginado(tabla, pk, {
                pagina,
                pageSize,
                busqueda: busquedaDebounced,
                columnasBusqueda: entidad.buscarEn || [],
                filtros,
            });
            if (solicitud !== solicitudActual.current) return resultado;

            if (pagina > resultado.totalPaginas) {
                setPagina(resultado.totalPaginas);
                return resultado;
            }

            setFilas(resultado.data);
            setTotal(resultado.total);
            setTotalPaginas(resultado.totalPaginas);
            return resultado;
        } catch (e) {
            if (solicitud !== solicitudActual.current) {
                return { data: [], total: 0, pagina, totalPaginas: 1 };
            }
            setFilas([]);
            setTotal(0);
            setTotalPaginas(1);
            setErrorCarga(`No se pudo leer "${tabla}": ${e.message}`);
            return { data: [], total: 0, pagina, totalPaginas: 1 };
        } finally {
            if (solicitud === solicitudActual.current) setCargando(false);
        }
    }, [tabla, pk, pagina, pageSize, busquedaDebounced, filtros, entidad]);

    useEffect(() => {
        cargarPagina();
    }, [cargarPagina]);

    // Debounce de la búsqueda: resetea a la página 1
    useEffect(() => {
        const t = setTimeout(() => {
            setBusquedaDebounced(busqueda);
        }, 400);
        return () => clearTimeout(t);
    }, [busqueda]);

    const cambiarFiltro = (campo, valor) => {
        setFiltros((prev) => ({ ...prev, [campo]: valor }));
        setPagina(1);
    };

    const hayFiltrosActivos = Object.values(filtros).some((v) => v !== "" && v != null);

    const textoCelda = (campo, valor) => {
        if (campo.ref) {
            const fila = (refs[campo.ref.tabla] || [])
                .find((r) => r[campo.ref.pk] === valor);
            return fila ? campo.ref.label(fila, refs) : valor;
        }
        if (campo.type === "date" && valor) return String(valor).slice(0, 10);
        if (campo.type === "select" && campo.options) {
            const op = campo.options.map(normalizar).find((o) => o.value === valor);
            return op ? op.label : valor;
        }
        return valor;
    };

    // ---------- Formulario ----------
    const abrirNuevo = () => {
        setEditandoId(null);
        setValores({});
        setBusquedasReferencia({});
        setDatosPersonaEmpleado({
            n_documento: "",
            nombre: "",
            ap_paterno: "",
            ap_materno: "",
            f_nacimiento: "",
            email: "",
            celular: "",
            genero: "",
            direccion: "",
            id_distrito: "",
        });
        setPersonaEmpleadoExistente(false);
        setFormAbierto(true);
    };

    const abrirEditar = (fila) => {
        const v = {};
        visibles.forEach((c) => {
            let x = fila[c.name] ?? "";
            if (c.type === "date" && x) x = String(x).slice(0, 10);
            v[c.name] = x;
        });
        setEditandoId(fila[pk]);
        setValores(v);
        setBusquedasReferencia({});
        setFormAbierto(true);
    };

    const cerrarForm = () => {
        setFormAbierto(false);
        setEditandoId(null);
        setValores({});
        setBusquedasReferencia({});
        setDatosPersonaEmpleado({
            n_documento: "",
            nombre: "",
            ap_paterno: "",
            ap_materno: "",
            f_nacimiento: "",
            email: "",
            celular: "",
            genero: "",
            direccion: "",
            id_distrito: "",
        });
        setPersonaEmpleadoExistente(false);
    };

    const cambiar = (e) => {
        const { name, value } = e.target;
        const campo = campos.find((item) => item.name === name);
        const autocompletar = campos.find((item) =>
            item.autocompletarDesde?.campo === name
        )?.autocompletarDesde;
        setValores((prev) => {
            const siguientes = { ...prev, [name]: value };
            if (autocompletar) {
                const referencia = (refs[autocompletar.tabla] || []).find(
                    (fila) => String(fila[autocompletar.pk]) === String(value)
                );
                const precio = referencia?.[autocompletar.valor];
                siguientes.precio = Number.isFinite(Number(precio)) && precio !== "" && precio != null
                    ? String(precio)
                    : "";
            }
            if (campo?.name === "id_piso" && entidadKey === "habitaciones") {
                siguientes.numero = "";
            }
            return siguientes;
        });
    };

    const consultarDatosDocumento = async () => {
        const tipo = entidad.consultaDocumento;
        const nombreCampo = tipo === "dni" ? "n_documento" : "ruc";
        const numero = String(valores[nombreCampo] || "").trim();
        const longitud = tipo === "dni" ? 8 : 11;

        if (!new RegExp(`^\\d{${longitud}}$`).test(numero)) {
            avisar(`Ingresa un ${tipo.toUpperCase()} válido de ${longitud} dígitos.`, false);
            return;
        }

        setConsultandoDocumento(true);
        try {
            const datos = await consultarDocumento(tipo, numero);
            if (tipo === "dni") {
                const tipoDni = (refs.tipo_identidad || []).find(
                    (fila) => String(fila.abreviatura || "").trim().toUpperCase() === "DNI"
                );
                const sexo = String(datos.sexo || "").trim().toUpperCase();
                const genero = sexo.startsWith("M") ? "M" : sexo.startsWith("F") ? "F" : "";
                const fechaNacimiento = /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_nacimiento || "")
                    ? datos.fecha_nacimiento
                    : "";

                setValores((actuales) => ({
                    ...actuales,
                    n_documento: datos.numero || numero,
                    nombre: datos.nombres || actuales.nombre || "",
                    ap_paterno: datos.apellido_paterno || actuales.ap_paterno || "",
                    ap_materno: datos.apellido_materno || actuales.ap_materno || "",
                    f_nacimiento: fechaNacimiento || actuales.f_nacimiento || "",
                    genero: genero || actuales.genero || "",
                    direccion: datos.direccion || actuales.direccion || "",
                    ...(tipoDni ? { id_tipoidentidad: String(tipoDni.id_tipoidentidad) } : {}),
                }));
                avisar("Datos del DNI consultados. Revisa y completa el distrito antes de guardar.");
            } else {
                setValores((actuales) => ({
                    ...actuales,
                    ruc: datos.numero || numero,
                    razon_social: datos.nombre_o_razon_social || actuales.razon_social || "",
                    direccion: datos.direccion || actuales.direccion || "",
                }));
                avisar("Datos del RUC consultados. Revisa la información antes de guardar.");
            }
        } catch (error) {
            avisar(error.message, false);
        } finally {
            setConsultandoDocumento(false);
        }
    };

    const consultarDniEmpleado = async () => {
        const numero = String(datosPersonaEmpleado.n_documento || "").trim();
        if (!/^\d{8}$/.test(numero)) {
            avisar("Ingresa un DNI válido de 8 dígitos.", false);
            return;
        }

        setConsultandoDocumento(true);
        try {
            const [datos, personaRegistrada] = await Promise.all([
                consultarDocumento("dni", numero),
                buscarPersonaPorDni(numero),
            ]);
            const persona = personaRegistrada.persona;
            if (persona) {
                setDatosPersonaEmpleado({
                    n_documento: persona.n_documento || numero,
                    nombre: persona.nombre || "",
                    ap_paterno: persona.ap_paterno || "",
                    ap_materno: persona.ap_materno || "",
                    f_nacimiento: persona.f_nacimiento ? String(persona.f_nacimiento).slice(0, 10) : "",
                    email: persona.email || "",
                    celular: persona.celular || "",
                    genero: persona.genero || "",
                    direccion: persona.direccion || "",
                    id_distrito: persona.id_distrito == null ? "" : String(persona.id_distrito),
                });
                setPersonaEmpleadoExistente(true);
                avisar("DNI consultado. Se reutilizarán los datos de la persona ya registrada.");
            } else {
                const sexo = String(datos.sexo || "").trim().toUpperCase();
                setDatosPersonaEmpleado((actuales) => ({
                    ...actuales,
                    n_documento: datos.numero || numero,
                    nombre: datos.nombres || "",
                    ap_paterno: datos.apellido_paterno || "",
                    ap_materno: datos.apellido_materno || "",
                    f_nacimiento: /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_nacimiento || "")
                        ? datos.fecha_nacimiento
                        : "",
                    genero: sexo.startsWith("M") ? "M" : sexo.startsWith("F") ? "F" : "",
                    direccion: datos.direccion || "",
                }));
                setPersonaEmpleadoExistente(false);
                avisar("Datos del DNI consultados. Completa y verifica la información antes de guardar.");
            }
        } catch (error) {
            avisar(error.message, false);
        } finally {
            setConsultandoDocumento(false);
        }
    };

    // ---------- Validaciones ----------
    const validar = () => {
        const datos = {};
        for (const c of campos) {
            if (c.oculto) {
                if (!editandoId) {
                    datos[c.name] = typeof c.defecto === "function" ? c.defecto() : c.defecto;
                }
                continue;
            }
            let v = String(valores[c.name] ?? "").trim();

            if (c.required && !v) {
                avisar(`El campo "${c.label}" es obligatorio.`, false);
                return null;
            }
            if (v && c.pattern && !c.pattern.test(v)) {
                avisar(c.msg || `"${c.label}" no es válido.`, false);
                return null;
            }
            if (v && c.type === "email" &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
                avisar("El correo electrónico no es válido.", false);
                return null;
            }
            if (v && c.type === "number") {
                v = Number(v);
                if (Number.isNaN(v) || (c.min != null && v < c.min)) {
                    avisar(`"${c.label}" no puede ser negativo.`, false);
                    return null;
                }
            }
            if (v && c.ref) v = Number(v);

            datos[c.name] = v === "" ? null : v;
        }

        if (entidad.validarFormulario) {
            const errorValidacion = entidad.validarFormulario(datos, refs);
            if (errorValidacion) {
                avisar(errorValidacion, false);
                return null;
            }
        }

        const [fi, ff] = entidad.fechas || [];
        if (fi && datos[fi] && datos[ff] && datos[ff] < datos[fi]) {
            avisar("La fecha de salida no puede ser anterior al ingreso.", false);
            return null;
        }
        return datos;
    };

    // ---------- Guardar / Actualizar / Eliminar ----------
    const ejecutar = async (accion, mensajeOk) => {
        setGuardando(true);
        try {
            await accion();
            invalidarCatalogosReportes();
            avisar(mensajeOk);
            cerrarForm();
            const r = await cargarPagina();   // refresco de la página actual
            if (pagina > r.totalPaginas) {
                setPagina(r.totalPaginas);
            }
        } catch (e) {
            avisar(e.message, false);
        } finally {
            setGuardando(false);
        }
    };

    const guardar = () => {
        const datos = validar();
        if (!datos) return;

        if (entidadKey === "empleados" && !editandoId) {
            const documento = String(datosPersonaEmpleado.n_documento || "").trim();
            if (!/^\d{8}$/.test(documento)) {
                avisar("Consulta un DNI válido antes de guardar el empleado.", false);
                return;
            }
            if (!datosPersonaEmpleado.nombre.trim() || !datosPersonaEmpleado.ap_paterno.trim()) {
                avisar("Completa los nombres y el apellido paterno de la persona.", false);
                return;
            }
            if (!datosPersonaEmpleado.id_distrito) {
                avisar("Selecciona el distrito de residencia de la persona.", false);
                return;
            }
            if (datosPersonaEmpleado.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosPersonaEmpleado.email)) {
                avisar("El correo electrónico de la persona no es válido.", false);
                return;
            }
            if (datosPersonaEmpleado.celular && !/^\d{9}$/.test(datosPersonaEmpleado.celular)) {
                avisar("El celular de la persona debe tener 9 dígitos.", false);
                return;
            }

            const persona = {
                ...datosPersonaEmpleado,
                n_documento: documento,
                id_distrito: Number(datosPersonaEmpleado.id_distrito),
            };
            ejecutar(
                () => guardarEmpleadoConPersona({ empleado: datos, persona }),
                "Empleado registrado correctamente."
            );
            return;
        }

        ejecutar(() => insertar(tabla, datos), "Registro guardado correctamente.");
    };

    const actualizarRegistro = () => {
        const datos = validar();
        if (datos) ejecutar(() => actualizar(tabla, pk, editandoId, datos), "Registro actualizado correctamente.");
    };

    const borrar = (fila) => {
        if (window.confirm("¿Seguro que deseas dar de baja este registro?")) {
            ejecutar(() => eliminar(tabla, pk, fila[pk]), "Registro dado de baja correctamente.");
        }
    };

    const inputClase =
        "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

    // Datos de la paginación para el pie de tabla
    const mostrarDesde = total === 0 ? 0 : (pagina - 1) * pageSize + 1;
    const mostrarHasta = Math.min(pagina * pageSize, total);
    const ventanaInicio = Math.max(1, Math.min(pagina - 3, totalPaginas - 6));
    const ventanaFin = Math.min(totalPaginas, ventanaInicio + 6);
    const numerosPagina = [];
    for (let i = ventanaInicio; i <= ventanaFin; i++) numerosPagina.push(i);

    const claseBotonPag =
        "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white";

    return (
        <div>

            {/* Encabezado */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="module-icon">
                        <i className={`bi ${entidad.icono}`}></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{entidad.titulo}</h2>
                        <p className="text-sm text-gray-500">{entidad.descripcion}</p>
                    </div>
                </div>

                {!soloLectura && (
                    <button
                        onClick={abrirNuevo}
                        className="rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
                    >
                        <i className="bi bi-plus-lg mr-2"></i>
                        Nuevo
                    </button>
                )}
                {soloLectura && (
                    <span className="rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                        <i className="bi bi-lock mr-2"></i>
                        Solo lectura
                    </span>
                )}
            </div>

            {/* Formulario */}
            {!soloLectura && formAbierto && (
                <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-semibold text-slate-900">
                        {editandoId ? `Editar ${entidad.titulo.toLowerCase()}` : `Nuevo registro de ${entidad.titulo.toLowerCase()}`}
                    </h3>

                    {entidad.consultaDocumento && (
                        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <p className="mb-3 text-sm text-blue-900">
                                Consulta los datos y verifica el resultado antes de guardar. La consulta no crea el registro.
                            </p>
                            <button
                                type="button"
                                onClick={consultarDatosDocumento}
                                disabled={consultandoDocumento || guardando}
                                className="rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {consultandoDocumento ? (
                                    <>
                                        <i className="bi bi-arrow-repeat mr-2 animate-spin" aria-hidden="true"></i>
                                        Consultando...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-search mr-2" aria-hidden="true"></i>
                                        Consultar {entidad.consultaDocumento.toUpperCase()} en Factiliza
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {entidadKey === "empleados" && !editandoId && (
                        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <h4 className="mb-1 text-sm font-semibold text-blue-950">Datos de la persona</h4>
                            <p className="mb-4 text-xs text-blue-800">
                                Busca el DNI en Factiliza. Si la persona ya está registrada (por ejemplo, como huésped), se usará ese mismo registro y no se duplicará.
                            </p>
                            <div className="mb-4 flex flex-wrap items-end gap-3">
                                <label className="block min-w-[220px] flex-1 text-xs font-semibold text-slate-700">
                                    DNI *
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={8}
                                        aria-label="DNI del empleado"
                                        value={datosPersonaEmpleado.n_documento}
                                        onChange={(event) => {
                                            const n_documento = event.target.value.replace(/\D/g, "").slice(0, 8);
                                            setDatosPersonaEmpleado({
                                                n_documento,
                                                nombre: "",
                                                ap_paterno: "",
                                                ap_materno: "",
                                                f_nacimiento: "",
                                                email: "",
                                                celular: "",
                                                genero: "",
                                                direccion: "",
                                                id_distrito: "",
                                            });
                                            setPersonaEmpleadoExistente(false);
                                        }}
                                        className={`${inputClase} mt-1.5 font-normal`}
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={consultarDniEmpleado}
                                    disabled={consultandoDocumento || guardando}
                                    className="rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {consultandoDocumento ? "Consultando..." : "Consultar DNI en Factiliza"}
                                </button>
                            </div>
                            {personaEmpleadoExistente && (
                                <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                                    Esta persona ya existe en Personas; el nuevo empleado se vinculará a ese registro.
                                </p>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {[
                                    { name: "nombre", label: "Nombres *", required: true },
                                    { name: "ap_paterno", label: "Apellido paterno *", required: true },
                                    { name: "ap_materno", label: "Apellido materno" },
                                    { name: "f_nacimiento", label: "Fecha de nacimiento", type: "date" },
                                    { name: "email", label: "Correo", type: "email" },
                                    { name: "celular", label: "Celular", type: "tel", maxLength: 9 },
                                    { name: "direccion", label: "Dirección" },
                                ].map((campo) => (
                                    <label key={campo.name} className="block text-xs font-semibold text-slate-700">
                                        {campo.label}
                                        <input
                                            type={campo.type || "text"}
                                            maxLength={campo.maxLength}
                                            aria-label={campo.label.replace(" *", "")}
                                            value={datosPersonaEmpleado[campo.name]}
                                            disabled={personaEmpleadoExistente}
                                            onChange={(event) => setDatosPersonaEmpleado((prev) => ({
                                                ...prev,
                                                [campo.name]: event.target.value,
                                            }))}
                                            className={`${inputClase} mt-1.5 font-normal disabled:bg-slate-100`}
                                        />
                                    </label>
                                ))}
                                <label className="block text-xs font-semibold text-slate-700">
                                    Género
                                    <select
                                        aria-label="Género de la persona"
                                        value={datosPersonaEmpleado.genero}
                                        disabled={personaEmpleadoExistente}
                                        onChange={(event) => setDatosPersonaEmpleado((prev) => ({
                                            ...prev,
                                            genero: event.target.value,
                                        }))}
                                        className={`${inputClase} mt-1.5 font-normal disabled:bg-slate-100`}
                                    >
                                        <option value="">-- Seleccione --</option>
                                        <option value="M">Masculino</option>
                                        <option value="F">Femenino</option>
                                    </select>
                                </label>
                                <label className="block text-xs font-semibold text-slate-700">
                                    Distrito *
                                    <select
                                        aria-label="Distrito de la persona"
                                        value={datosPersonaEmpleado.id_distrito}
                                        disabled={personaEmpleadoExistente}
                                        onChange={(event) => setDatosPersonaEmpleado((prev) => ({
                                            ...prev,
                                            id_distrito: event.target.value,
                                        }))}
                                        className={`${inputClase} mt-1.5 font-normal disabled:bg-slate-100`}
                                    >
                                        <option value="">-- Seleccione --</option>
                                        {(refs.distrito || []).map((distrito) => (
                                            <option key={distrito.id_distrito} value={distrito.id_distrito}>
                                                {distrito.d_distrito}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {visibles.map((c) => {
                            const referenciaAutocompletado = c.autocompletarDesde
                                ? (refs[c.autocompletarDesde.tabla] || []).find(
                                    (fila) => String(fila[c.autocompletarDesde.pk]) ===
                                        String(valores[c.autocompletarDesde.campo] || "")
                                )
                                : null;
                            const valorAutocompletado = referenciaAutocompletado?.[c.autocompletarDesde?.valor];
                            const bloqueadoPorAutocompletado = Boolean(
                                c.soloLecturaSiAutocompletado
                                && valorAutocompletado != null
                                && valorAutocompletado !== ""
                                && Number.isFinite(Number(valorAutocompletado))
                            );
                            const numeroPiso = c.name === "numero"
                                ? entidad.obtenerNumeroPiso?.(valores.id_piso, refs)
                                : null;
                            const opcionesReferencia = c.ref
                                ? refs[c.ref.tabla] || []
                                : [];
                            const busquedaReferencia = String(busquedasReferencia[c.name] || "")
                                .trim()
                                .toLocaleLowerCase("es");
                            const opcionesReferenciaFiltradas = c.buscarReferencia && busquedaReferencia
                                ? opcionesReferencia.filter((fila) => {
                                    const texto = `${c.ref.label(fila, refs)} ${fila[c.ref.pk]}`
                                        .toLocaleLowerCase("es");
                                    return texto.includes(busquedaReferencia);
                                })
                                : opcionesReferencia;
                            const referenciaSeleccionada = c.ref
                                ? opcionesReferencia.find(
                                    (fila) => String(fila[c.ref.pk]) === String(valores[c.name] || "")
                                )
                                : null;
                            const opcionesReferenciaVisibles = referenciaSeleccionada
                                && !opcionesReferenciaFiltradas.some(
                                    (fila) => String(fila[c.ref.pk]) === String(referenciaSeleccionada[c.ref.pk])
                                )
                                ? [referenciaSeleccionada, ...opcionesReferenciaFiltradas]
                                : opcionesReferenciaFiltradas;

                            return (
                            <label key={c.name} className="block text-xs font-semibold text-slate-700">
                                {c.label}{c.required && " *"}

                                {c.type === "select" ? (
                                    <>
                                        {c.buscarReferencia && (
                                            <input
                                                type="search"
                                                aria-label={`Buscar ${c.label.toLowerCase()}`}
                                                value={busquedasReferencia[c.name] || ""}
                                                onChange={(event) => setBusquedasReferencia((prev) => ({
                                                    ...prev,
                                                    [c.name]: event.target.value,
                                                }))}
                                                placeholder={`Buscar ${c.label.toLowerCase()}...`}
                                                className={`${inputClase} mt-1.5 font-normal`}
                                            />
                                        )}
                                        <select
                                            name={c.name}
                                            aria-label={`${c.label}${c.required ? " *" : ""}`}
                                            value={valores[c.name] ?? ""}
                                            onChange={cambiar}
                                            className={`${inputClase} mt-1.5 font-normal`}
                                        >
                                            <option value="">-- Seleccione --</option>
                                            {c.ref
                                                ? opcionesReferenciaVisibles.map((r) => (
                                                    <option key={r[c.ref.pk]} value={r[c.ref.pk]}>
                                                        {c.ref.label(r, refs)}
                                                    </option>
                                                ))
                                                : c.options.map(normalizar).map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                        </select>
                                        {c.buscarReferencia && (
                                            <span className="mt-1 block text-[11px] font-normal text-gray-500">
                                                {busquedaReferencia
                                                    ? `${opcionesReferenciaFiltradas.length} de ${opcionesReferencia.length} usuarios`
                                                    : `${opcionesReferencia.length} usuarios disponibles`}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <input
                                        name={c.name}
                                        type={c.type}
                                        aria-label={`${c.label}${c.required ? " *" : ""}`}
                                        min={c.min}
                                        step={c.type === "number" ? "0.01" : undefined}
                                        value={valores[c.name] ?? ""}
                                        onChange={cambiar}
                                        readOnly={bloqueadoPorAutocompletado}
                                        inputMode={c.inputMode}
                                        maxLength={c.maxLength}
                                        placeholder={numeroPiso ? `${numeroPiso}01` : c.placeholder}
                                        className={`${inputClase} mt-1.5 font-normal ${bloqueadoPorAutocompletado ? "bg-slate-50" : ""}`}
                                    />
                                )}
                                {c.name === "numero" && entidadKey === "habitaciones" && (
                                    <span className="mt-1 block text-[11px] font-normal text-slate-500">
                                        {numeroPiso
                                            ? `Para el piso ${numeroPiso}, ingresa tres dígitos que comiencen con ${numeroPiso} (ej. ${numeroPiso}01).`
                                            : "Selecciona un piso; el número debe tener tres dígitos y comenzar con el número del piso."}
                                    </span>
                                )}
                                {c.autocompletarDesde && bloqueadoPorAutocompletado && (
                                    <span className="mt-1 block text-[11px] font-normal text-emerald-700">
                                        Tarifa cargada automáticamente desde la categoría.
                                    </span>
                                )}
                                {c.autocompletarDesde && !bloqueadoPorAutocompletado && valores[c.autocompletarDesde.campo] && (
                                    <span className="mt-1 block text-[11px] font-normal text-amber-700">
                                        La categoría seleccionada no tiene un precio definido en el catálogo; ingresa la tarifa manualmente.
                                    </span>
                                )}
                            </label>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {!editandoId ? (
                            <button
                                onClick={guardar}
                                disabled={guardando}
                                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                                Guardar
                            </button>
                        ) : (
                            <button
                                onClick={actualizarRegistro}
                                disabled={guardando}
                                className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                            >
                                Actualizar
                            </button>
                        )}
                        <button
                            onClick={cerrarForm}
                            className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                        >
                            Cancelar
                        </button>
                    </div>
                </section>
            )}

            {/* Error de lectura */}
            {(errorCarga || errorRefs) && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <i className="bi bi-exclamation-triangle mr-2"></i>
                    {[errorCarga, errorRefs].filter(Boolean).join(" ")}
                </div>
            )}

            {/* Búsqueda y filtros */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                {(entidad.buscarEn || []).length > 0 && (
                    <div className="relative min-w-[240px] flex-1">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                setPagina(1);
                            }}
                            placeholder={`Buscar en ${entidad.titulo.toLowerCase()}...`}
                            className={`${inputClase} pl-9`}
                        />
                    </div>
                )}
                {(entidad.filtros || []).map((nombre) => {
                    const c = campos.find((x) => x.name === nombre);
                    if (!c) return null;
                    return (
                        <select
                            key={nombre}
                            value={filtros[nombre] || ""}
                            onChange={(e) => cambiarFiltro(nombre, e.target.value)}
                            className={`${inputClase} w-auto`}
                        >
                            <option value="">{c.label}: Todos</option>
                            {c.ref
                                ? (refs[c.ref.tabla] || []).map((r) => (
                                    <option key={r[c.ref.pk]} value={r[c.ref.pk]}>
                                        {c.ref.label(r, refs)}
                                    </option>
                                ))
                                : (c.options || []).map(normalizar).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                        </select>
                    );
                })}
            </div>

            {/* Listado */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                                {visibles.map((c) => (
                                    <th key={c.name} className="px-5 py-3 font-semibold">{c.label}</th>
                                ))}
                                {!soloLectura && (
                                    <th className="px-5 py-3 font-semibold">Acciones</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cargando ? (
                                <tr>
                                    <td colSpan={columnas} className="px-5 py-10 text-center text-gray-400">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : filas.length === 0 ? (
                                <tr>
                                    <td colSpan={columnas} className="px-5 py-10 text-center text-gray-400">
                                        {busquedaDebounced || hayFiltrosActivos ? "Sin resultados" : "Sin registros"}
                                    </td>
                                </tr>
                            ) : (
                                filas.map((fila) => (
                                    <tr key={fila[pk]} className="hover:bg-slate-50">
                                        {visibles.map((c) => (
                                            <td key={c.name} className="px-5 py-3 text-slate-700">
                                                {textoCelda(c, fila[c.name])}
                                            </td>
                                        ))}
                                        {!soloLectura && (
                                            <td className="whitespace-nowrap px-5 py-3">
                                                <button
                                                    onClick={() => abrirEditar(fila)}
                                                    disabled={cargando || guardando}
                                                    className="mr-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                                                >
                                                    <i className="bi bi-pencil mr-1"></i>Editar
                                                </button>
                                                <button
                                                    onClick={() => borrar(fila)}
                                                    disabled={cargando || guardando}
                                                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
                                                >
                                                    <i className="bi bi-trash mr-1"></i>Eliminar
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Paginación */}
            <div className="mb-2 mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-4">
                    <span>
                        Mostrando {mostrarDesde}–{mostrarHasta} de {total} registro{total === 1 ? "" : "s"}
                    </span>
                    <label className="flex items-center gap-2">
                        <span>Por página</span>
                        <select
                            aria-label="Registros por página"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPagina(1);
                            }}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600"
                        >
                            {[10, 25, 50, 100].map((cantidad) => (
                                <option key={cantidad} value={cantidad}>{cantidad}</option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    <button
                        onClick={() => setPagina(1)}
                        disabled={cargando || pagina <= 1}
                        aria-label="Primera página"
                        className={claseBotonPag}
                        title="Primera página"
                    >
                        <i className="bi bi-chevrons-left"></i>
                    </button>
                    <button
                        onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                        disabled={cargando || pagina <= 1}
                        className={claseBotonPag}
                    >
                        Anterior
                    </button>
                    {numerosPagina.map((n) => (
                        <button
                            key={n}
                            onClick={() => setPagina(n)}
                            disabled={cargando}
                            aria-current={n === pagina ? "page" : undefined}
                            className={
                                n === pagina
                                    ? "rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                    : claseBotonPag
                            }
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        onClick={() => setPagina(pagina + 1)}
                        disabled={cargando || pagina >= totalPaginas}
                        className={claseBotonPag}
                    >
                        Siguiente
                    </button>
                    <button
                        onClick={() => setPagina(totalPaginas)}
                        disabled={cargando || pagina >= totalPaginas}
                        className={claseBotonPag}
                        title="Última página"
                        aria-label="Última página"
                    >
                        <i className="bi bi-chevrons-right"></i>
                    </button>
                </div>
            </div>

            {/* Mensaje de confirmación (toast) */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}
                >
                    {toast.mensaje}
                </div>
            )}

        </div>
    );
};

export default CrudModule;