import { useEffect, useState } from "react";

const TAMANO_INICIAL = 25;

export const usePaginacion = (total) => {
    const [pagina, setPagina] = useState(1);
    const [pageSize, setPageSize] = useState(TAMANO_INICIAL);
    const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
    const paginaActual = Math.min(pagina, totalPaginas);

    useEffect(() => {
        if (pagina > totalPaginas) setPagina(totalPaginas);
    }, [pagina, totalPaginas]);

    return {
        pagina: paginaActual,
        pageSize,
        totalPaginas,
        desde: (paginaActual - 1) * pageSize,
        hasta: Math.min(paginaActual * pageSize, total),
        setPagina,
        setPageSize,
    };
};
