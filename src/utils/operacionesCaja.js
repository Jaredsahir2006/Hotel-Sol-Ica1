export const siguienteNumeroOperacion = (numerosOperacion = []) => {
    const numerosUsados = new Set(
        numerosOperacion
            .filter(Boolean)
            .map((numero) => String(numero).trim().toUpperCase())
    );
    const ultimoNumero = [...numerosUsados].reduce((maximo, numero) => {
        const coincidencia = numero.match(/^OP-?(\d+)$/);
        const valor = coincidencia ? Number(coincidencia[1]) : 0;
        return Number.isSafeInteger(valor) && valor > maximo ? valor : maximo;
    }, 0);

    let siguiente = ultimoNumero + 1;
    let numeroOperacion = `OP-${String(siguiente).padStart(6, "0")}`;
    while (numerosUsados.has(numeroOperacion)) {
        siguiente += 1;
        numeroOperacion = `OP-${String(siguiente).padStart(6, "0")}`;
    }
    return numeroOperacion;
};

export const filtrarConceptosCaja = ({
    conceptos = [],
    tipos = [],
    busqueda = "",
    signo = "todos",
    soloIngresos = false,
}) => {
    const tiposPorId = new Map(
        tipos.map((tipo) => [String(tipo.id_tipomovimiento), tipo])
    );
    const termino = busqueda.trim().toLocaleLowerCase("es");

    return conceptos.filter((concepto) => {
        const tipo = tiposPorId.get(String(concepto.id_tipomovimiento));
        if (soloIngresos && tipo?.signo !== "+") return false;
        if (signo !== "todos" && tipo?.signo !== signo) return false;
        if (!termino) return true;
        return `${concepto.n_concepto || ""} ${concepto.descripcion || ""} ${tipo?.n_tipomovimiento || ""}`
            .toLocaleLowerCase("es")
            .includes(termino);
    });
};
