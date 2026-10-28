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

export const calcularTotalesPorMetodo = (montoInicial, movimientos, tipos, metodos, conceptos = []) => {
    const tiposPorId = new Map(tipos.map((tipo) => [String(tipo.id_tipomovimiento), tipo]));
    const metodosPorId = new Map(metodos.map((metodo) => [String(metodo.id_metodopago), metodo]));
    const conceptosPorId = new Map(conceptos.map((concepto) => [String(concepto.id_concepto), concepto]));
    const totales = new Map();
    const metodoEfectivo = metodos.find((metodo) =>
        /efectivo/i.test(String(metodo.n_metodopago || ""))
    );

    for (const metodo of metodos) {
        totales.set(String(metodo.id_metodopago), {
            id_metodopago: metodo.id_metodopago,
            clave: String(metodo.id_metodopago),
            nombre: metodo.n_metodopago,
            esperadoCentimos: 0,
        });
    }

    const efectivoId = metodoEfectivo
        ? String(metodoEfectivo.id_metodopago)
        : "efectivo";
    if (!totales.has(efectivoId)) {
        totales.set(efectivoId, {
            id_metodopago: metodoEfectivo?.id_metodopago || null,
            clave: efectivoId,
            nombre: metodoEfectivo?.n_metodopago || "Efectivo",
            esperadoCentimos: 0,
        });
    }

    const inicialCentimos = aCentimos(montoInicial);
    if (inicialCentimos < 0) {
        throw new Error("El monto inicial no puede ser negativo.");
    }
    totales.get(efectivoId).esperadoCentimos += inicialCentimos;

    for (const movimiento of movimientos) {
        const tipo = tiposPorId.get(String(movimiento.id_tipomovimiento));
        if (!tipo || !["+", "-"].includes(tipo.signo)) {
            throw new Error("No se puede cuadrar la caja: hay un movimiento con tipo inválido.");
        }

        const centimos = aCentimos(movimiento.monto);
        if (centimos < 0) {
            throw new Error("No se puede cuadrar la caja: hay un movimiento con monto negativo.");
        }

        const metodo = metodosPorId.get(String(movimiento.id_metodopago));
        const metodoId = metodo ? String(metodo.id_metodopago) : "sin-metodo";
        const nombreMetodo = String(metodo?.n_metodopago || "");
        const concepto = conceptosPorId.get(String(movimiento.id_concepto));
        const nombreConcepto = `${concepto?.n_concepto || ""} ${concepto?.descripcion || ""}`;
        const esEfectivo = /efectivo/i.test(nombreMetodo);
        const esCreditoOCortesia = /cr[eé]dito|cortes[ií]a|cuenta por cobrar/i.test(`${nombreMetodo} ${nombreConcepto}`);
        if (esCreditoOCortesia || (esEfectivo && String(movimiento.afecta_efectivo || "").toUpperCase() !== "S")) {
            continue;
        }
        if (!totales.has(metodoId)) {
            totales.set(metodoId, {
                id_metodopago: metodo?.id_metodopago ?? movimiento.id_metodopago ?? null,
                clave: metodoId,
                nombre: metodo?.n_metodopago || "Método no identificado",
                esperadoCentimos: 0,
            });
        }
        totales.get(metodoId).esperadoCentimos += tipo.signo === "-" ? -centimos : centimos;
    }

    return Array.from(totales.values()).map((total) => ({
        ...total,
        esperado: total.esperadoCentimos / 100,
    }));
};
