import { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import {
    AGREGACIONES_PERSONALIZADAS,
    CATEGORIAS_REPORTES,
    DATASETS_PERSONALIZADOS,
    FILTROS,
    REPORTES,
    TIPOS_GRAFICO_PERSONALIZADO,
} from "../config/reportes";
import { generarReporte, obtenerCatalogoReportes } from "../services/reportesService";
import { fecha, fechaHora, hoy, soles } from "../utils/format";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const colores = [
    "#1d4ed8",
    "#0f766e",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#65a30d",
    "#db2777",
    "#475569",
    "#ca8a04",
];

const inicioMes = () => {
    const d = new Date();
    d.setDate(1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const formatearValor = (valor, formato) => {
    if (valor == null || valor === "") return "-";
    if (formato === "moneda") return soles(valor);
    if (formato === "porcentaje") return `${Number(valor).toLocaleString("es-PE")}%`;
    if (formato === "numero") {
        const num = Number(valor);
        return Number.isFinite(num) ? num.toLocaleString("es-PE") : valor;
    }
    if (formato === "fecha") return fecha(valor);
    if (formato === "fecha-hora") return fechaHora(valor);
    return String(valor);
};

const Tarjeta = ({ dato }) => {
    const coloresTarjeta = {
        blue: "bg-blue-100 text-blue-700",
        emerald: "bg-emerald-100 text-emerald-700",
        indigo: "bg-indigo-100 text-indigo-700",
        amber: "bg-amber-100 text-amber-700",
        cyan: "bg-cyan-100 text-cyan-700",
        violet: "bg-violet-100 text-violet-700",
        red: "bg-red-100 text-red-700",
        teal: "bg-teal-100 text-teal-700",
        slate: "bg-slate-200 text-slate-700",
        gold: "bg-yellow-100 text-yellow-700",
        rose: "bg-rose-100 text-rose-700",
    };
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500">{dato.etiqueta}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {formatearValor(dato.valor, dato.formato)}
                    </p>
                    {dato.detalle && <p className="mt-1 text-xs text-gray-400">{dato.detalle}</p>}
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${coloresTarjeta[dato.color] || coloresTarjeta.blue}`}>
                    <i className={`bi ${dato.icono || "bi-bar-chart"}`} aria-hidden="true"></i>
                </div>
            </div>
        </div>
    );
};

const Grafico = ({ grafico }) => {
    const etiquetas = grafico.etiquetas || [];
    const series = grafico.series || [];
    if (!etiquetas.length || !series.length) {
        return (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-gray-400">
                Sin datos para graficar con estos filtros
            </div>
        );
    }

    const maximo = Math.max(
        1,
        ...series.flatMap((serie) => (serie.valores || []).map((valor) => Math.abs(Number(valor) || 0)))
    );

    if (grafico.tipo === "donut") {
        const valores = series[0]?.valores || [];
        const total = valores.reduce((suma, valor) => suma + Math.abs(Number(valor) || 0), 0);
        let acumulado = 0;
        const radio = 68;
        const circunferencia = 2 * Math.PI * radio;
        const segmentos = valores.map((valor, indice) => {
            const longitud = total ? (Math.abs(Number(valor) || 0) / total) * circunferencia : 0;
            const segmento = {
                longitud,
                desplazamiento: circunferencia - acumulado,
                color: colores[indice % colores.length],
            };
            acumulado += longitud;
            return segmento;
        });
        return (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
                <svg width="190" height="190" viewBox="0 0 180 180" role="img" aria-label={grafico.titulo}>
                    <g transform="translate(90,90) rotate(-90)">
                        <circle r={radio} fill="none" stroke="#e2e8f0" strokeWidth="26" />
                        {segmentos.map((segmento, indice) => (
                            <circle
                                key={`${etiquetas[indice]}-${indice}`}
                                r={radio}
                                fill="none"
                                stroke={segmento.color}
                                strokeWidth="26"
                                strokeDasharray={`${segmento.longitud} ${circunferencia - segmento.longitud}`}
                                strokeDashoffset={segmento.desplazamiento}
                            />
                        ))}
                    </g>
                </svg>
                <div className="flex w-full flex-col gap-2 sm:max-w-xs">
                    {valores.map((valor, indice) => (
                        <div key={`${etiquetas[indice]}-${indice}`} className="flex items-center justify-between gap-4 text-sm">
                            <span className="flex items-center gap-2 text-slate-600">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colores[indice % colores.length] }} />
                                {etiquetas[indice]}
                            </span>
                            <strong className="text-slate-900">{formatearValor(valor, grafico.formato)}</strong>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (grafico.tipo === "lineas") {
        return (
            <div>
                <svg viewBox="0 0 100 100" className="h-64 w-full" role="img" aria-label={grafico.titulo}>
                    {[20, 40, 60, 80].map((y) => (
                        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                    ))}
                    {series.map((serie, indice) => {
                        const valores = serie.valores || [];
                        const puntos = valores.map((valor, i) => {
                            const x = (i / Math.max(1, valores.length - 1)) * 100;
                            const y = 90 - ((Number(valor) || 0) / maximo) * 80;
                            return `${x},${y}`;
                        });
                        return (
                            <g key={serie.nombre}>
                                <polyline fill="none" stroke={serie.color || colores[indice % colores.length]} strokeWidth="1.8" points={puntos.join(" ")} />
                                {valores.map((valor, i) => (
                                    <circle key={`${serie.nombre}-${i}`} cx={(i / Math.max(1, valores.length - 1)) * 100} cy={90 - ((Number(valor) || 0) / maximo) * 80} r="1.4" fill={serie.color || colores[indice % colores.length]} />
                                ))}
                            </g>
                        );
                    })}
                </svg>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                    {etiquetas.map((etiqueta, indice) => <span key={`${etiqueta}-${indice}`}>{etiqueta}</span>)}
                </div>
                <Leyenda series={series} />
            </div>
        );
    }

    if (grafico.tipo === "barras-horizontales") {
        return (
            <div className="space-y-3">
                {etiquetas.map((etiqueta, indice) => {
                    const valor = Number(series[0]?.valores?.[indice]) || 0;
                    return (
                        <div key={`${etiqueta}-${indice}`}>
                            <div className="mb-1 flex justify-between gap-3 text-sm">
                                <span className="truncate text-slate-600">{etiqueta}</span>
                                <strong>{formatearValor(valor, grafico.formato)}</strong>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-100">
                                <div
                                    className="h-2.5 rounded-full"
                                    style={{
                                        width: `${Math.max(1, Math.abs(valor) / maximo * 100)}%`,
                                        backgroundColor: series[0]?.color || colores[indice % colores.length],
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    const espacio = 100 / Math.max(1, etiquetas.length);
    const anchoGrupo = Math.min(12, espacio * 0.72 / Math.max(1, series.length));
    return (
        <div>
            <svg viewBox="0 0 100 100" className="h-64 w-full" role="img" aria-label={grafico.titulo}>
                {[20, 40, 60, 80].map((y) => (
                    <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                ))}
                {etiquetas.flatMap((etiqueta, indice) => series.map((serie, serieIndice) => {
                    const valor = Number(serie.valores?.[indice]) || 0;
                    const alto = Math.abs(valor) / maximo * 80;
                    const x = indice * espacio + (espacio - anchoGrupo * series.length) / 2 + serieIndice * anchoGrupo;
                    return (
                        <rect
                            key={`${etiqueta}-${serie.nombre}`}
                            x={x}
                            y={90 - alto}
                            width={Math.max(0.5, anchoGrupo - 0.6)}
                            height={alto}
                            rx="1"
                            fill={serie.color || colores[serieIndice % colores.length]}
                        />
                    );
                }))}
            </svg>
            <div className="mt-2 flex justify-between gap-1 text-xs text-gray-500">
                {etiquetas.map((etiqueta, indice) => (
                    <span key={`${etiqueta}-${indice}`} className="max-w-[8rem] truncate text-center">{etiqueta}</span>
                ))}
            </div>
            <Leyenda series={series} />
        </div>
    );
};

const Leyenda = ({ series }) => series.length > 1 ? (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {series.map((serie, indice) => (
            <span key={serie.nombre} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: serie.color || colores[indice % colores.length] }} />
                {serie.nombre}
            </span>
        ))}
    </div>
) : null;

const FiltrosReporte = ({ reporteId, filtros, catalogo, alCambiar, datasetConfig }) => {
    const definicion = REPORTES[reporteId];
    const campos = definicion?.filtros || [];
    const actualizar = (clave, valor) => alCambiar((actuales) => ({ ...actuales, [clave]: valor }));
    const campoSelect = (clave) => {
        const metadata = FILTROS[clave];
        const datos = catalogo?.filtros?.[clave] || metadata;
        if (!metadata || !datos) return null;
        const opciones = datos.opciones || metadata.opciones || [];
        const listaCatalogo = datos.opciones || [];
        const valor = filtros[clave] || "";
        return (
            <label key={clave} className="block text-xs font-semibold text-slate-700">
                {datos.label || metadata.label}
                <select
                    value={valor}
                    onChange={(evento) => actualizar(clave, evento.target.value)}
                    className={`${inputClase} mt-1.5 font-normal`}
                >
                    {datos.vacio && <option value="">{datos.vacio}</option>}
                    {opciones.map((opcion) => (
                        <option key={String(opcion.value)} value={opcion.value}>{opcion.label}</option>
                    ))}
                    {listaCatalogo.length === 0 && !datos.vacio && <option value="">-- Seleccione --</option>}
                </select>
            </label>
        );
    };

    return (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-slate-900">Filtros del reporte</h3>
                    <p className="mt-1 text-xs text-slate-500">Los resultados se consultan desde la información disponible en Supabase.</p>
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {campos.includes("fechas") && (
                    <>
                        <label className="block text-xs font-semibold text-slate-700">
                            Desde
                            <input type="date" value={filtros.desde} onChange={(evento) => actualizar("desde", evento.target.value)} className={`${inputClase} mt-1.5 font-normal`} />
                        </label>
                        <label className="block text-xs font-semibold text-slate-700">
                            Hasta
                            <input type="date" value={filtros.hasta} onChange={(evento) => actualizar("hasta", evento.target.value)} className={`${inputClase} mt-1.5 font-normal`} />
                        </label>
                    </>
                )}
                {campos.filter((clave) => clave !== "fechas" && clave !== "periodo").map((clave) => {
                    if (clave === "producto") {
                        return (
                            <label key={clave} className="block text-xs font-semibold text-slate-700">
                                {FILTROS_LABEL(clave)}
                                <input
                                    type="search"
                                    value={filtros.producto || ""}
                                    onChange={(evento) => actualizar("producto", evento.target.value)}
                                    placeholder={FILTROS[clave].placeholder}
                                    className={`${inputClase} mt-1.5 font-normal`}
                                />
                            </label>
                        );
                    }
                    if (clave === "agrupacionClientes" && !catalogo?.filtros?.[clave]) {
                        return (
                            <label key={clave} className="block text-xs font-semibold text-slate-700">
                                Agrupar ranking por
                                <select value={filtros.agrupacionClientes || "cliente"} onChange={(evento) => actualizar(clave, evento.target.value)} className={`${inputClase} mt-1.5 font-normal`}>
                                    {FILTROS_OPTIONS(clave).map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
                                </select>
                            </label>
                        );
                    }
                    return campoSelect(clave);
                })}
                {campos.includes("periodo") && campoSelect("periodo")}
            </div>
            {reporteId === "personalizado" && datasetConfig && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                    {datasetConfig.filtros.length > 0 && (
                        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {datasetConfig.filtros.map((clave) => (
                                clave === "producto" ? (
                                    <label key={clave} className="block text-xs font-semibold text-slate-700">
                                        {FILTROS_LABEL(clave)}
                                        <input
                                            type="search"
                                            value={filtros.producto || ""}
                                            onChange={(evento) => actualizar("producto", evento.target.value)}
                                            placeholder={FILTROS[clave].placeholder}
                                            className={`${inputClase} mt-1.5 font-normal`}
                                        />
                                    </label>
                                ) : campoSelect(clave)
                            ))}
                        </div>
                    )}
                    <h4 className="mb-4 text-sm font-semibold text-slate-900">Constructor personalizado</h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <label className="block text-xs font-semibold text-slate-700">
                            Conjunto de datos
                            <select value={filtros.dataset} onChange={(evento) => alCambiar((actuales) => ({
                                ...actuales,
                                dataset: evento.target.value,
                                metrica: DATASETS_PERSONALIZADOS[evento.target.value].metricas[0].clave,
                                agruparPor: DATASETS_PERSONALIZADOS[evento.target.value].dimensiones[0].clave,
                                columnas: [],
                            }))} className={`${inputClase} mt-1.5 font-normal`}>
                                {Object.entries(DATASETS_PERSONALIZADOS).map(([clave, item]) => <option key={clave} value={clave}>{item.nombre}</option>)}
                            </select>
                        </label>
                        <label className="block text-xs font-semibold text-slate-700">
                            Métrica
                            <select value={filtros.metrica} onChange={(evento) => actualizar("metrica", evento.target.value)} className={`${inputClase} mt-1.5 font-normal`}>
                                {datasetConfig.metricas.map((item) => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}
                            </select>
                        </label>
                        <label className="block text-xs font-semibold text-slate-700">
                            Agregación
                            <select value={filtros.agregacion} onChange={(evento) => actualizar("agregacion", evento.target.value)} className={`${inputClase} mt-1.5 font-normal`}>
                                {AGREGACIONES_PERSONALIZADAS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </label>
                        <label className="block text-xs font-semibold text-slate-700">
                            Agrupar por
                            <select value={filtros.agruparPor} onChange={(evento) => actualizar("agruparPor", evento.target.value)} className={`${inputClase} mt-1.5 font-normal`}>
                                {datasetConfig.dimensiones.map((item) => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}
                            </select>
                        </label>
                        <label className="block text-xs font-semibold text-slate-700">
                            Tipo de gráfico
                            <select value={filtros.tipoGrafico} onChange={(evento) => actualizar("tipoGrafico", evento.target.value)} className={`${inputClase} mt-1.5 font-normal`}>
                                {TIPOS_GRAFICO_PERSONALIZADO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </label>
                    </div>
                    <fieldset className="mt-4">
                        <legend className="mb-2 text-xs font-semibold text-slate-700">Columnas de detalle (vacío = todas)</legend>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {datasetConfig.columnas.map((columna) => (
                                <label key={columna.clave} className="flex items-center gap-2 text-xs text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={filtros.columnas.includes(columna.clave)}
                                        onChange={(evento) => alCambiar((actuales) => ({
                                            ...actuales,
                                            columnas: evento.target.checked
                                                ? [...actuales.columnas, columna.clave]
                                                : actuales.columnas.filter((clave) => clave !== columna.clave),
                                        }))}
                                    />
                                    {columna.nombre}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>
            )}
        </div>
    );
};

const FILTROS_LABEL = (clave) => FILTROS[clave]?.label || clave;
const FILTROS_OPTIONS = (clave) => FILTROS[clave]?.opciones || [];

const TablaReporte = ({ reporteTabla, pagina, cambiarPagina }) => {
    const filas = reporteTabla.filas || [];
    const porPagina = 10;
    const totalPaginas = Math.max(1, Math.ceil(filas.length / porPagina));
    const paginaActual = Math.min(pagina, totalPaginas);
    const filasPagina = filas.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);
    return (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div>
                    <h3 className="font-semibold text-slate-900">{reporteTabla.titulo}</h3>
                    {reporteTabla.nota && <p className="mt-1 text-xs text-slate-500">{reporteTabla.nota}</p>}
                </div>
                <span className="text-xs text-slate-500">{filas.length.toLocaleString("es-PE")} registro(s)</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                            {(reporteTabla.columnas || []).map((columna) => (
                                <th key={columna.clave} className="px-4 py-3 font-semibold">{columna.nombre}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filas.length === 0 ? (
                            <tr>
                                <td colSpan={Math.max(1, reporteTabla.columnas?.length || 1)} className="px-5 py-10 text-center text-gray-400">
                                    No hay registros para los filtros seleccionados.
                                </td>
                            </tr>
                        ) : filasPagina.map((fila, indice) => (
                            <tr key={fila.id || `${reporteTabla.id}-${indice}`} className="hover:bg-slate-50">
                                {(reporteTabla.columnas || []).map((columna) => (
                                    <td key={columna.clave} className="max-w-xs px-4 py-3 text-slate-700">
                                        {formatearValor(fila[columna.clave], columna.tipo)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filas.length > porPagina && (
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-slate-500">
                    <span>Mostrando {(paginaActual - 1) * porPagina + 1}–{Math.min(paginaActual * porPagina, filas.length)} de {filas.length}</span>
                    <div className="flex gap-2">
                        <button type="button" disabled={paginaActual <= 1} onClick={() => cambiarPagina(paginaActual - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Anterior</button>
                        <button type="button" disabled={paginaActual >= totalPaginas} onClick={() => cambiarPagina(paginaActual + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Siguiente</button>
                    </div>
                </div>
            )}
        </section>
    );
};

const nombreArchivo = (valor) => String(valor || "reporte")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const Reportes = () => {
    const [catalogo, setCatalogo] = useState(null);
    const [reporteId, setReporteId] = useState("resumen");
    const [filtros, setFiltros] = useState({
        desde: inicioMes(),
        hasta: hoy(),
        periodo: "mes",
        agrupacionClientes: "cliente",
        dataset: "reservas",
        metrica: DATASETS_PERSONALIZADOS.reservas.metricas[0].clave,
        agregacion: "suma",
        agruparPor: "periodo",
        tipoGrafico: "barras",
        columnas: [],
    });
    const [reporte, setReporte] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
    const [error, setError] = useState("");
    const [categoriaActiva, setCategoriaActiva] = useState("generales");
    const [paginas, setPaginas] = useState({});
    const [avisoExportacion, setAvisoExportacion] = useState("");

    const datasetConfig = DATASETS_PERSONALIZADOS[filtros.dataset];
    const definicionReporte = REPORTES[reporteId];

    const ejecutarReporte = useCallback(async (id = reporteId, filtrosAplicados = filtros) => {
        if (filtrosAplicados.desde && filtrosAplicados.hasta && filtrosAplicados.desde > filtrosAplicados.hasta) {
            setError("La fecha inicial no puede ser posterior a la fecha final.");
            return;
        }
        setCargando(true);
        setError("");
        setAvisoExportacion("");
        try {
            const resultado = await generarReporte(id, filtrosAplicados);
            setReporte(resultado);
            setPaginas({});
        } catch (errorReporte) {
            setError(`No se pudo generar el reporte: ${errorReporte.message}`);
        } finally {
            setCargando(false);
        }
    }, [filtros, reporteId]);

    useEffect(() => {
        let vigente = true;
        const iniciar = async () => {
            setCargandoCatalogo(true);
            setCargando(true);
            try {
                const resultadoCatalogo = await obtenerCatalogoReportes();
                if (!vigente) return;
                setCatalogo(resultadoCatalogo);
                const resultadoReporte = await generarReporte("resumen", filtros);
                if (vigente) setReporte(resultadoReporte);
            } catch (errorInicial) {
                if (vigente) setError(`No se pudieron cargar los reportes: ${errorInicial.message}`);
            } finally {
                if (vigente) {
                    setCargando(false);
                    setCargandoCatalogo(false);
                }
            }
        };
        iniciar();
        return () => { vigente = false; };
    // Load only once; subsequent generations are explicit and use current filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtrosAplicados = useMemo(() => reporte?.contexto?.filtros || [], [reporte]);

    const exportarExcel = () => {
        if (!reporte) return;
        try {
            const libro = XLSX.utils.book_new();
            const resumen = [
                ["Reporte", definicionReporte?.nombre || reporteId],
                ["Desde", filtros.desde],
                ["Hasta", filtros.hasta],
                ["Generado", fechaHora(reporte.contexto?.generadoEn)],
                ...filtrosAplicados.map((item) => [item.etiqueta, item.valor]),
                [],
                ["Indicador", "Valor", "Detalle"],
                ...(reporte.kpis || []).map((item) => [
                    item.etiqueta,
                    formatearValor(item.valor, item.formato),
                    item.detalle || "",
                ]),
            ];
            XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(resumen), "Resumen");
            (reporte.tablas || []).forEach((tabla, indice) => {
                const columnas = tabla.columnas || [];
                const filas = [
                    columnas.map((columna) => columna.nombre),
                    ...(tabla.filas || []).map((fila) => columnas.map((columna) => fila[columna.clave] ?? "")),
                ];
                const hoja = XLSX.utils.aoa_to_sheet(filas);
                const nombreHoja = (tabla.titulo || `Detalle ${indice + 1}`).slice(0, 31);
                XLSX.utils.book_append_sheet(libro, hoja, nombreHoja || `Detalle ${indice + 1}`);
            });
            XLSX.writeFile(libro, `${nombreArchivo(definicionReporte?.nombre)}-${filtros.desde}-${filtros.hasta}.xlsx`);
            setAvisoExportacion("Archivo Excel generado con los resultados filtrados.");
        } catch (errorExportacion) {
            setError(`No se pudo exportar a Excel: ${errorExportacion.message}`);
        }
    };

    const exportarPDF = () => {
        if (!reporte) return;
        try {
            const documento = new jsPDF({ orientation: "landscape" });
            documento.setFontSize(18);
            documento.text(definicionReporte?.nombre || "Reporte", 14, 17);
            documento.setFontSize(10);
            documento.text(`Período: ${fecha(filtros.desde)} al ${fecha(filtros.hasta)}`, 14, 25);
            documento.text(`Generado: ${fechaHora(reporte.contexto?.generadoEn)}`, 14, 31);
            const filtrosTexto = filtrosAplicados.map((item) => `${item.etiqueta}: ${item.valor}`).join(" · ");
            if (filtrosTexto) documento.text(`Filtros: ${filtrosTexto}`, 14, 37, { maxWidth: 265 });
            let inicioTabla = filtrosTexto ? 46 : 40;
            autoTable(documento, {
                startY: inicioTabla,
                head: [["Indicador", "Resultado", "Detalle"]],
                body: (reporte.kpis || []).map((item) => [
                    item.etiqueta,
                    formatearValor(item.valor, item.formato),
                    item.detalle || "",
                ]),
                styles: { fontSize: 8 },
            });
            (reporte.tablas || []).forEach((tabla, indice) => {
                documento.addPage();
                documento.setFontSize(13);
                documento.text(tabla.titulo || `Detalle ${indice + 1}`, 14, 16);
                autoTable(documento, {
                    startY: 22,
                    head: [(tabla.columnas || []).map((columna) => columna.nombre)],
                    body: (tabla.filas || []).map((fila) =>
                        (tabla.columnas || []).map((columna) => formatearValor(fila[columna.clave], columna.tipo))
                    ),
                    styles: { fontSize: 7, cellPadding: 1.8 },
                    headStyles: { fillColor: [30, 64, 175] },
                });
            });
            documento.save(`${nombreArchivo(definicionReporte?.nombre)}-${filtros.desde}-${filtros.hasta}.pdf`);
            setAvisoExportacion("Archivo PDF generado con los resultados filtrados.");
        } catch (errorExportacion) {
            setError(`No se pudo exportar a PDF: ${errorExportacion.message}`);
        }
    };

    const seleccionarReporte = (id) => {
        setReporteId(id);
        setReporte(null);
        setError("");
        setPaginas({});
        if (id === "personalizado") {
            const dataset = DATASETS_PERSONALIZADOS[filtros.dataset];
            setFiltros((actuales) => ({
                ...actuales,
                metrica: dataset.metricas[0].clave,
                agruparPor: dataset.dimensiones[0].clave,
            }));
        }
    };

    const resumenVacio = !reporte && !cargando;

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="module-icon"><i className="bi bi-bar-chart" aria-hidden="true"></i></div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Reportes</h2>
                        <p className="text-sm text-gray-500">
                            Consulta información operativa y estadística real del hotel.
                        </p>
                    </div>
                </div>
                {reporte && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={exportarExcel} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                            <i className="bi bi-file-earmark-excel mr-2" aria-hidden="true"></i>Exportar Excel
                        </button>
                        <button type="button" onClick={exportarPDF} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                            <i className="bi bi-file-earmark-pdf mr-2" aria-hidden="true"></i>Exportar PDF
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <i className="bi bi-exclamation-triangle mr-2" aria-hidden="true"></i>{error}
                </div>
            )}
            {avisoExportacion && (
                <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    {avisoExportacion}
                </div>
            )}

            <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {CATEGORIAS_REPORTES.map((categoria) => (
                    <button
                        key={categoria.clave}
                        type="button"
                        onClick={() => setCategoriaActiva(categoria.clave)}
                        aria-pressed={categoriaActiva === categoria.clave}
                        className={`rounded-2xl border p-4 text-left transition ${
                            categoriaActiva === categoria.clave
                                ? "border-blue-300 bg-blue-50 shadow-sm"
                                : "border-gray-200 bg-white hover:border-slate-300"
                        }`}
                    >
                        <span className="flex items-center gap-2 font-semibold text-slate-900">
                            <i className={`bi ${categoria.icono}`} aria-hidden="true"></i>{categoria.nombre}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">{categoria.descripcion}</span>
                    </button>
                ))}
            </div>

            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-800">Selecciona un reporte</h3>
                    {cargandoCatalogo && <span className="text-xs text-slate-400">Cargando opciones...</span>}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {(CATEGORIAS_REPORTES.find((categoria) => categoria.clave === categoriaActiva)?.reportes || [])
                        .map((id) => {
                            const item = REPORTES[id];
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => seleccionarReporte(id)}
                                    aria-pressed={reporteId === id}
                                    className={`rounded-xl border p-3 text-left transition ${
                                        reporteId === id
                                            ? "border-blue-700 bg-blue-700 text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                                    }`}
                                >
                                    <span className="flex items-center gap-2 text-sm font-semibold">
                                        <i className={`bi ${item.icono}`} aria-hidden="true"></i>{item.nombre}
                                    </span>
                                    <span className={`mt-1 block text-xs ${reporteId === id ? "text-blue-100" : "text-slate-500"}`}>
                                        {item.descripcion}
                                    </span>
                                </button>
                            );
                        })}
                </div>
            </section>

            {definicionReporte && (
                <>
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{definicionReporte.nombre}</h3>
                            <p className="text-sm text-slate-500">{definicionReporte.descripcion}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => ejecutarReporte()}
                            disabled={cargando || cargandoCatalogo}
                            className="shrink-0 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                            <i className="bi bi-arrow-clockwise mr-2" aria-hidden="true"></i>
                            {cargando ? "Generando..." : "Generar reporte"}
                        </button>
                    </div>

                    <FiltrosReporte
                        reporteId={reporteId}
                        filtros={filtros}
                        catalogo={catalogo}
                        alCambiar={setFiltros}
                        datasetConfig={datasetConfig}
                    />
                </>
            )}

            {cargando && (
                <div role="status" className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-slate-500">
                    Generando el reporte con datos de Supabase...
                </div>
            )}
            {resumenVacio && (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-slate-500">
                    Selecciona los filtros y genera el reporte.
                </div>
            )}
            {!cargando && reporte && (
                <>
                    {reporte.contexto && (
                        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1">
                                Período: {fecha(reporte.contexto.desde)} – {fecha(reporte.contexto.hasta)}
                            </span>
                            {filtrosAplicados.map((item) => (
                                <span key={`${item.etiqueta}-${item.valor}`} className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">
                                    {item.etiqueta}: {item.valor}
                                </span>
                            ))}
                            <span className="ml-auto">Actualizado: {fechaHora(reporte.contexto.generadoEn)}</span>
                        </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {(reporte.kpis || []).map((dato) => <Tarjeta key={dato.id} dato={dato} />)}
                    </div>

                    {(reporte.graficos || []).length > 0 && (
                        <div className="mt-6 grid gap-5 xl:grid-cols-2">
                            {reporte.graficos.map((grafico) => (
                                <section key={grafico.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4">
                                        <h3 className="font-semibold text-slate-900">{grafico.titulo}</h3>
                                        {grafico.detalle && <p className="mt-1 text-xs text-slate-500">{grafico.detalle}</p>}
                                    </div>
                                    <Grafico grafico={grafico} />
                                </section>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 space-y-5">
                        {(reporte.tablas || []).map((tabla) => (
                            <TablaReporte
                                key={tabla.id}
                                reporteTabla={tabla}
                                pagina={paginas[tabla.id] || 1}
                                cambiarPagina={(pagina) => setPaginas((actuales) => ({ ...actuales, [tabla.id]: pagina }))}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Reportes;
