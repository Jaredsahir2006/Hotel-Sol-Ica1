import { filtrarConceptosCaja, siguienteNumeroOperacion } from "./operacionesCaja";

describe("siguienteNumeroOperacion", () => {
    it("genera el siguiente código secuencial según los movimientos existentes", () => {
        expect(siguienteNumeroOperacion(["OP-000001", "OP-000002", "OP-000009"])).toBe("OP-000010");
    });

    it("considera formatos anteriores y no reutiliza un código secuencial existente", () => {
        expect(siguienteNumeroOperacion(["OP1", "OP-000002", "op-000003"])).toBe("OP-000004");
    });

    it("comienza la numeración cuando todavía no hay operaciones", () => {
        expect(siguienteNumeroOperacion([])).toBe("OP-000001");
    });
});

describe("filtrarConceptosCaja", () => {
    const conceptos = [
        { id_concepto: 1, n_concepto: "Pago de hospedaje", id_tipomovimiento: 1 },
        { id_concepto: 2, n_concepto: "Compra menor", descripcion: "Insumos", id_tipomovimiento: 2 },
    ];
    const tipos = [
        { id_tipomovimiento: 1, n_tipomovimiento: "Ingreso", signo: "+" },
        { id_tipomovimiento: 2, n_tipomovimiento: "Egreso", signo: "-" },
    ];

    it("busca por nombre, descripción o tipo y filtra por signo", () => {
        expect(filtrarConceptosCaja({
            conceptos,
            tipos,
            busqueda: "insumos",
            signo: "-",
        }).map((concepto) => concepto.id_concepto)).toEqual([2]);
    });

    it("limita los conceptos a ingresos cuando el pago se asocia a una recepción", () => {
        expect(filtrarConceptosCaja({
            conceptos,
            tipos,
            soloIngresos: true,
        }).map((concepto) => concepto.id_concepto)).toEqual([1]);
    });
});
