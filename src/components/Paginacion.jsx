const claseBoton =
    "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white";

const Paginacion = ({
    total,
    pagina,
    pageSize,
    totalPaginas,
    desde,
    hasta,
    setPagina,
    setPageSize,
    cargando = false,
}) => {
    const inicioVentana = Math.max(1, Math.min(pagina - 3, totalPaginas - 6));
    const finVentana = Math.min(totalPaginas, inicioVentana + 6);
    const paginas = [];
    for (let numero = inicioVentana; numero <= finVentana; numero += 1) {
        paginas.push(numero);
    }

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
                <span>
                    Mostrando {total === 0 ? 0 : desde + 1}–{hasta} de {total} registro{total === 1 ? "" : "s"}
                </span>
                <label className="flex items-center gap-2">
                    <span>Por página</span>
                    <select
                        aria-label="Registros por página"
                        value={pageSize}
                        disabled={cargando}
                        onChange={(evento) => {
                            setPageSize(Number(evento.target.value));
                            setPagina(1);
                        }}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-60"
                    >
                        {[10, 25, 50, 100].map((cantidad) => (
                            <option key={cantidad} value={cantidad}>{cantidad}</option>
                        ))}
                    </select>
                </label>
            </div>

            <nav aria-label="Paginación" className="flex flex-wrap items-center gap-1">
                <button
                    type="button"
                    aria-label="Primera página"
                    title="Primera página"
                    onClick={() => setPagina(1)}
                    disabled={cargando || pagina <= 1}
                    className={claseBoton}
                >
                    <i className="bi bi-chevrons-left" aria-hidden="true"></i>
                </button>
                <button
                    type="button"
                    onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                    disabled={cargando || pagina <= 1}
                    className={claseBoton}
                >
                    Anterior
                </button>
                {paginas.map((numero) => (
                    <button
                        key={numero}
                        type="button"
                        onClick={() => setPagina(numero)}
                        disabled={cargando}
                        aria-current={numero === pagina ? "page" : undefined}
                        className={numero === pagina
                            ? "rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            : claseBoton}
                    >
                        {numero}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
                    disabled={cargando || pagina >= totalPaginas}
                    className={claseBoton}
                >
                    Siguiente
                </button>
                <button
                    type="button"
                    aria-label="Última página"
                    title="Última página"
                    onClick={() => setPagina(totalPaginas)}
                    disabled={cargando || pagina >= totalPaginas}
                    className={claseBoton}
                >
                    <i className="bi bi-chevrons-right" aria-hidden="true"></i>
                </button>
            </nav>
        </div>
    );
};

export default Paginacion;
