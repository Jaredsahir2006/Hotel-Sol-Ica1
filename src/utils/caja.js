const aCentimos = (monto) => {
    const valor = Number(monto);
    if (!Number.isFinite(valor)) {
        throw new Error("Hay un monto de caja que no es válido.");
    }
    return Math.round(valor * 100);
};

export const calcularTotalesEfectivo = (montoInicial, movimientos, tipos) => {
    const tiposPorId = new Map(tipos.map((tipo) => [String(tipo.id_tipomovimiento), tipo]));
    let ingresosCentimos = 0;
    let egresosCentimos = 0;

    for (const movimiento of movimientos) {
        if (String(movimiento.afecta_efectivo || "").toUpperCase() !== "S") continue;

        const tipo = tiposPorId.get(String(movimiento.id_tipomovimiento));
        if (!tipo || !["+", "-"].includes(tipo.signo)) {
            throw new Error("No se puede cuadrar la caja: hay un movimiento con tipo inválido.");
        }

        const centimos = aCentimos(movimiento.monto);
        if (centimos < 0) {
            throw new Error("No se puede cuadrar la caja: hay un movimiento con monto negativo.");
        }

        if (tipo.signo === "-") egresosCentimos += centimos;
        else ingresosCentimos += centimos;
    }

    const inicialCentimos = aCentimos(montoInicial);
    if (inicialCentimos < 0) {
        throw new Error("El monto inicial no puede ser negativo.");
    }

    return {
        ingresos: ingresosCentimos / 100,
        egresos: egresosCentimos / 100,
        sistema: (inicialCentimos + ingresosCentimos - egresosCentimos) / 100,
    };
};
